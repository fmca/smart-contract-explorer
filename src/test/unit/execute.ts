import * as Chain from '../../utils/chain';
import * as Compile from '../../frontend/compile';
import assert from 'assert';
import { Invocation, TypedValue, Value, NormalResult, ErrorResult, Result } from '../../model';
import { Metadata } from '../../frontend/metadata';
import { ContractInstantiation } from '../../explore/instantiate';
import { ContractInstance } from '../../explore/instance';

const { int256, uint, array } = Value;

const pragmas = `pragma solidity ^0.5.0;`;

describe('execute', function() {

    it('invokes function sequences', async function() {
        const metadata = await getMetadata(`contract A {
            function f() public pure returns (int) { return 42; }
            int x;
            function inc() public { x++; }
            function get() public view returns (int) { return x; }
        }`);
        await Promise.all([
            testSequence(metadata, int256(42), [], ['f']),
            testSequence(metadata, int256(0), [], ['get']),
            testSequence(metadata, int256(42), [], ['f'], ['f']),
            testSequence(metadata, int256(2), [], ['inc'], ['inc'], ['get'])
        ]);
    });

    it('invokes constructors with arguments', async function() {
        const metadata = await getMetadata(`contract B {
            int x;
            constructor(int y) public { x = y; }
            function get() public view returns (int) { return x; }
            function inc(int y) public { x += y; }
        }`);
        await Promise.all([
            testSequence(metadata, int256(0), [int256(0)], ['get']),
            testSequence(metadata, int256(42), [int256(42)], ['get']),
            testSequence(metadata, int256(45), [int256(42)], ['inc', [int256(3)]], ['get'])
        ]);
    });

    it('invocations with array arguments', async function() {
        const metadata = await getMetadata(`contract D {
            int[] ys;
            function f(int[] memory xs) public { ys = xs; }
            function g(uint i) public view returns (int) { return ys[i]; }
        }`);
        const ary = array(int256(13), int256(42));
        await Promise.all([
            testSequence(metadata, int256(13), [], ['f', [ary]], ['g', [int256(0)]]),
            testSequence(metadata, int256(42), [], ['f', [ary]], ['g', [int256(1)]]),
        ]);
    });

    it ('invocations with array returns', async function() {
        const metadata = await getMetadata(`contract E {
            int[] ys;
            function f(int[] memory xs) public { ys = xs; }
            function g() public view returns (int[] memory) { return ys; }
        }`);
        const ary1 = array(int256(13));
        const ary2 = array(int256(13), int256(42));
        await Promise.all([
            testSequence(metadata, ary1, [], ['f', [ary1]], ['g']),
            testSequence(metadata, ary2, [], ['f', [ary2]], ['g']),
        ]);
    });

    it('handles transaction reverting', async function() {
        const metadata = await getMetadata(`contract C {
            int x;
            function get() public view returns (int) { require(x > 0); return x; }
            function inc() public { x++; }
        }`);
        await Promise.all([
            testSequence(metadata, undefined, [], ['get']),
            testSequence(metadata, int256(1), [], ['inc'], ['get'])
        ]);
    });

    it('pays payable functions', async function() {
        const tester = new InstanceTester(`contract C {
            uint x;
            function set() public payable { x = msg.value == 0 ? 42 : msg.value; }
            function get() public view returns (uint) { return x; }
        }`);
        await tester.invoke('set');
        await tester.invoke('get').then(r => r.expect(uint(42)));
        await tester.invoke('set', 13);
        await tester.invoke('get').then(r => r.expect(uint(13)));
    });

});

async function testSequence(metadata: Metadata, value: TypedValue | undefined, args: TypedValue[], ...calls: ([string] | [string,TypedValue[]])[]) {
    const instance = await getInstance(metadata, ...args);
    const invocations = calls.map(([name, values]) => values === undefined ? getInvocation(metadata, name) : getInvocation(metadata, name, ...values));
    const last = invocations.pop();

    if (last === undefined)
        throw Error(`Expected invocations`);

    if (invocations.length > 0)
        await instance.invokeSequence(invocations);

    const actual = await instance.invoke(last);

    const expected = value === undefined ? new ErrorResult('revert') : new NormalResult(value);
    assert.deepEqual(actual, expected);
}

function getInvocation(metadata: Metadata, name: string, ...values: TypedValue[]) {
    const method = metadata.findFunction(name);
    assert.notEqual(method, undefined);
    const invocation = new Invocation(method!, ...values);
    return invocation;
}

async function getMetadata(content: string) {
    const path = `a.sol`;
    content = `${pragmas} ${content}`;
    const metadata = await Compile.fromString({ content, path });
    return metadata;
}

async function getInstance(metadata: Metadata, ...values: TypedValue[]) {
    const chain = new Chain.BlockchainInterface();
    const instantiation = new ContractInstantiation(chain);
    const instance = instantiation.instantiate(metadata, undefined, ...values);
    return instance;
}

class InstanceTester {
    metadata?: Metadata;
    instance?: ContractInstance;
    constructor(public content: string) {}

    async getMetadata() {
        if (this.metadata === undefined)
            this.metadata = await getMetadata(this.content);
        return this.metadata;
    }

    async getInstance(...values: TypedValue[]) {
        const metadata = await this.getMetadata();
        if (this.instance === undefined)
            this.instance = await getInstance(metadata, ...values);
        return this.instance;
    }

    async invoke(name: string, value?: number, ...values: TypedValue[]) {
        const metadata = await this.getMetadata();
        const instance = await this.getInstance();
        const method = metadata.findFunction(name);
        assert.notEqual(metadata, undefined);
        const invocation = value === undefined
            ? new Invocation(method!, ...values)
            : new Invocation(method!, value, ...values);
        const actual = await instance.invoke(invocation);
        return new TestResult(actual);
    }
}

class TestResult {
    constructor(public actual: Result) { }
    expect(value: TypedValue) {
        const expected = new NormalResult(value);
        assert.deepEqual(this.actual, expected);
    }
}
