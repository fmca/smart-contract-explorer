import * as Chain from '../../utils/chain';
import * as Compile from '../../frontend/compile';
import assert from 'assert';
import { ExecutorFactory } from '../../explore/execute';
import { InvocationGenerator, Trace, Invocation, Value, NormalResult } from '../../model';
import { Metadata, SourceInfo } from '../../frontend/metadata';
import { ContractInstantiation } from '../../explore/instantiate';

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

const metadata: { [path: string]: Metadata } = {};

describe('execute', function() {

    this.beforeAll(async () => {
        for (const sourceInfo of sources)
            metadata[sourceInfo.path] = await Compile.fromString(sourceInfo);
    });

    it('invokes function sequences', async function() {
        await testSequence('a.sol', 42, [], ['f']);
        await testSequence('a.sol', 0, [], ['get']);
        await testSequence('a.sol', 42, [], ['f'], ['f']);
        await testSequence('a.sol', 2, [], ['inc'], ['inc'], ['get']);
    });

    it('invokes constructors with arguments', async function() {
        await testSequence('b.sol', 0, [0], ['get']);
        await testSequence('b.sol', 42, [42], ['get']);
        await testSequence('b.sol', 45, [42], ['inc', [3]], ['get']);
    });

});

async function testSequence(path: string, value: Value, args: Value[], ...calls: ([string] | [string,Value[]])[]) {
    const instance = await getInstance(metadata[path], ...args);
    const invocations = calls.map(([name, values]) => values === undefined ? getInvocation(path, name) : getInvocation(path, name, ...values));
    const last = invocations.pop();

    if (last === undefined)
        throw Error(`Expected invocations`);

    if (invocations.length > 0)
        await instance.invokeSequence(invocations);

    const actual = await instance.invoke(last);

    const expected = new NormalResult(value);
    assert.deepEqual(actual, expected);
}

function getInvocation(path: string, name: string, ...values: Value[]) {
    const method = Metadata.findFunction(name, metadata[path]);
    assert.notEqual(method, undefined);
    const invocation = new Invocation(method!, ...values);
    return invocation;
}

async function getInstance(metadata: Metadata, ...values: Value[]) {
    const chain = await Chain.get();
    const instantiation = new ContractInstantiation(chain);
    const instance = instantiation.instantiate(metadata, ...values);
    return instance;
}
