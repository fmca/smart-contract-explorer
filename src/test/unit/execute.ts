import * as Chain from '../../utils/chain';
import * as Compile from '../../frontend/compile';
import assert from 'assert';
import { ExecutorFactory } from '../../explore/execute';
import { InvocationGenerator, Trace, Invocation, Value, NormalResult } from '../../model';
import { Metadata, SourceInfo } from '../../frontend/metadata';

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

    int dummy;
    function barrier() public { dummy = 0; }
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

    int dummy;
    function barrier() public { dummy = 0; }
}
`});

const metadata: { [path: string]: Metadata } = {};

describe('execute', function() {

    this.beforeAll(async () => {
        for (const sourceInfo of sources)
            metadata[sourceInfo.path] = await Compile.fromString(sourceInfo);
    });

    it('invokes function sequences', async function() {
        await testSequence(`a.sol`, 42, `f`);
        await testSequence(`a.sol`, 0, `get`);
        await testSequence(`a.sol`, 42, 'f', 'f');
        await testSequence(`a.sol`, 2, 'inc', 'inc', 'get');
    });

    it('invokes constructors with arguments', async function() {
        await testSequence(`b.sol`, 0, `get`);
    });

});

async function testSequence(path: string, value: Value, ...names: string[]) {
    const context = await getContext(metadata[path]);
    const invocations = names.map(f => getInvocation(path, f));

    // TODO improve interface so that barrier is not required
    const last = invocations.pop();
    invocations.push(getInvocation(path, `barrier`));
    await context.invokeSequence(invocations);
    const actual = await context.invoke(last!);

    const expected = new NormalResult(value);
    assert.deepEqual(actual, expected);
}

function getInvocation(path: string, name: string, ...args: Value[]) {
    const method = Metadata.findFunction(name, metadata[path]);
    assert.notEqual(method, undefined);
    const invocation = new Invocation(method!, ...args);
    return invocation
}

async function getContext(metadata: Metadata, ...values: Value[]) {
    const chain = await Chain.get();
    const executerFactory = new ExecutorFactory(chain);
    const methods = [...Metadata.getFunctions(metadata)];
    const invocationGenerator = new InvocationGenerator(methods, chain.accounts);
    const executer = executerFactory.getExecutor(invocationGenerator, metadata);
    const [ invocation ] = invocationGenerator.constructors();
    const context = await executer.create(invocation);
    return context;
}
