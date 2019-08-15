import * as Chain from '../../utils/chain';
import * as Compile from '../../frontend/compile';
import assert from 'assert';
import { Invocation, TypedValue, Value, NormalResult, ErrorResult } from '../../model';
import { Metadata, SourceInfo } from '../../frontend/metadata';
import { ContractInstantiation } from '../../explore/instantiate';
import { ElementaryType } from '../../solidity';

const { int256, array } = Value;

const pragmas = `pragma solidity ^0.5.0;`;
const sources: SourceInfo[] = [];

sources.push({
    path: `a.sol`,
    content: `
${pragmas}
contract A {
    function f() public pure returns (int) { return 42; }

    int x;
    function inc() public { x++; }
    function get() public view returns (int) { return x; }
}
`});

sources.push({
    path: `b.sol`,
    content: `
${pragmas}
contract B {
    int x;
    constructor(int y) public { x = y; }
    function get() public view returns (int) { return x; }
    function inc(int y) public { x += y; }
}
`});

sources.push({
    path: `c.sol`,
    content: `
${pragmas}
contract C {
    int x;
    function get() public view returns (int) { require(x > 0); return x; }
    function inc() public { x++; }
}
`});

sources.push({
    path: `d.sol`,
    content: `
${pragmas}
contract D {
    int[] ys;
    function f(int[] memory xs) public { ys = xs; }
    function g(uint i) public view returns (int) { return ys[i]; }
}
`});

sources.push({
    path: `e.sol`,
    content: `
${pragmas}
contract E {
    int[] ys;
    function f(int[] memory xs) public { ys = xs; }
    function g() public view returns (int[] memory) { return ys; }
}
`});

const metadata: { [path: string]: Metadata } = {};

describe('execute', function() {

    this.beforeAll(async () => {
        for (const sourceInfo of sources)
            metadata[sourceInfo.path] = await Compile.fromString(sourceInfo);
    });

    it('invokes function sequences', async function() {
        await Promise.all([
            testSequence('a.sol', int256(42), [], ['f']),
            testSequence('a.sol', int256(0), [], ['get']),
            testSequence('a.sol', int256(42), [], ['f'], ['f']),
            testSequence('a.sol', int256(2), [], ['inc'], ['inc'], ['get'])
        ]);
    });

    it('invokes constructors with arguments', async function() {
        await Promise.all([
            testSequence('b.sol', int256(0), [int256(0)], ['get']),
            testSequence('b.sol', int256(42), [int256(42)], ['get']),
            testSequence('b.sol', int256(45), [int256(42)], ['inc', [int256(3)]], ['get'])
        ]);
    });

    it('invocations with array arguments', async function() {
        const ary = array(int256(13), int256(42));
        await Promise.all([
            testSequence('d.sol', int256(13), [], ['f', [ary]], ['g', [int256(0)]]),
            testSequence('d.sol', int256(42), [], ['f', [ary]], ['g', [int256(1)]]),
        ]);
    });

    it ('invocations with array returns', async function() {
        const ary1 = array(int256(13));
        const ary2 = array(int256(13), int256(42));
        await Promise.all([
            testSequence('e.sol', ary1, [], ['f', [ary1]], ['g']),
            testSequence('e.sol', ary2, [], ['f', [ary2]], ['g']),
        ]);
    });

    it('handles transaction reverting', async function() {
        await Promise.all([
            testSequence('c.sol', undefined, [], ['get']),
            testSequence('c.sol', int256(1), [], ['inc'], ['get'])
        ]);
    });

});

async function testSequence(path: string, value: TypedValue | undefined, args: TypedValue[], ...calls: ([string] | [string,TypedValue[]])[]) {
    const type: ElementaryType = 'int';
    const instance = await getInstance(metadata[path], ...args);
    const invocations = calls.map(([name, values]) => values === undefined ? getInvocation(path, name) : getInvocation(path, name, ...values));
    const last = invocations.pop();

    if (last === undefined)
        throw Error(`Expected invocations`);

    if (invocations.length > 0)
        await instance.invokeSequence(invocations);

    const actual = await instance.invoke(last);

    const expected = value === undefined ? new ErrorResult('revert') : new NormalResult(value);
    assert.deepEqual(actual, expected);
}

function getInvocation(path: string, name: string, ...values: TypedValue[]) {
    const method = metadata[path].findFunction(name);
    assert.notEqual(method, undefined);
    const invocation = new Invocation(method!, ...values);
    return invocation;
}

async function getInstance(metadata: Metadata, ...values: TypedValue[]) {
    const chain = new Chain.BlockchainInterface();
    const instantiation = new ContractInstantiation(chain);
    const instance = instantiation.instantiate(metadata, ...values);
    return instance;
}
