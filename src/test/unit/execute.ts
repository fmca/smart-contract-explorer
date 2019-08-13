import * as Chain from '../../utils/chain';
import * as Compile from '../../frontend/compile';
import assert from 'assert';
import { Invocation, Value, NormalResult, ErrorResult } from '../../model';
import { Metadata, SourceInfo } from '../../frontend/metadata';
import { ContractInstantiation } from '../../explore/instantiate';
import { ElementaryType } from '../../solidity';

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

const metadata: { [path: string]: Metadata } = {};

describe('execute', function() {

    this.beforeAll(async () => {
        for (const sourceInfo of sources)
            metadata[sourceInfo.path] = await Compile.fromString(sourceInfo);
    });

    it('invokes function sequences', async function() {
        await Promise.all([
            testSequence('a.sol', 42, [], ['f']),
            testSequence('a.sol', 0, [], ['get']),
            testSequence('a.sol', 42, [], ['f'], ['f']),
            testSequence('a.sol', 2, [], ['inc'], ['inc'], ['get'])
        ]);
    });

    it('invokes constructors with arguments', async function() {
        await Promise.all([
            testSequence('b.sol', 0, [0], ['get']),
            testSequence('b.sol', 42, [42], ['get']),
            testSequence('b.sol', 45, [42], ['inc', [3]], ['get'])
        ]);
    });

    it('handles transaction reverting', async function() {
        await Promise.all([
            testSequence('c.sol', undefined, [], ['get']),
            testSequence('c.sol', 1, [], ['inc'], ['get'])
        ]);
    });

});

async function testSequence(path: string, value: number | undefined, args: number[], ...calls: ([string] | [string,number[]])[]) {
    const type: ElementaryType = 'int';
    const instance = await getInstance(metadata[path], ...args.map(value => ({ type, value })));
    const invocations = calls.map(([name, values]) => values === undefined ? getInvocation(path, name) : getInvocation(path, name, ...values.map(value => ({ type, value }))));
    const last = invocations.pop();

    if (last === undefined)
        throw Error(`Expected invocations`);

    if (invocations.length > 0)
        await instance.invokeSequence(invocations);

    const actual = await instance.invoke(last);

    const expected = value === undefined ? new ErrorResult('revert') : new NormalResult({ type: 'int256', value });
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
