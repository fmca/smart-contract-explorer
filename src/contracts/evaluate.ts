import { Debugger } from '../utils/debug';
import * as readline from 'readline';
import stream from 'stream';
import { Expr } from '../frontend/sexpr';
import { State, Operation, Result, Trace, Observation } from '../explore/states';
import * as Compile from '../frontend/compile';
import { ExecutorFactory } from '../explore/execute';
import { Invocation } from '../explore/invocations';
import * as Chain from '../utils/chain';
import { Metadata } from '../frontend/metadata';
import { extendWithPredicate } from './extension';
import { AbstractExample } from './examples';

const debug = Debugger(__filename);

interface Request {
    example: AbstractExample;
    expression: Expr;
}

interface Response {
    result: boolean;
}

export class Evaluator {
    static DELIMITER = "@";

    executorFactory: ExecutorFactory
    metadataCache = new Map<string, Metadata>();

    constructor(chain: Chain.BlockchainInterface) {
        this.executorFactory = new ExecutorFactory(chain);
    }

    async listen() {
        for await (const line of lines(process.stdin)) {
            debug(`line: %s`, line);
            const request = this.parseRequest(line);
            debug(`request: %o`, request);
            const response = await this.processRequest(request);
            debug(`response: %o`, response);
            const { result } = response;
            console.log(`${result}`);
        }
    }

    async processRequest(request: Request): Promise<Response> {
        const { example, expression } = request;
        const { id: { contract, method: stateMethod } } = example;
        const metadata = await this.getMetadata(contract);
        const [ extension, predicateMethod ] = await extendWithPredicate(metadata, expression);
        const executor = this.executorFactory.getExecutor(extension);
        const state = getState(extension, stateMethod);
        const invocation = getInvocation(extension, predicateMethod);
        const { operation } = await executor.execute(state, invocation);
        const { result: { values: [ result ] } } = operation;

        debug(`result: %o`, result);

        if (typeof(result) !== 'boolean')
            throw Error(`Expected Boolean-valued expression`);

        return { result };
    }

    parseRequest(line: string): Request {
        const split = line.split(Evaluator.DELIMITER);

        if (split.length !== 2)
            throw new Error(`unexpected request: ${line}`);

        const [ exampleString, exprString ] = split;
        const example: AbstractExample = JSON.parse(exampleString);
        const expression = Expr.parse(exprString);
        return { example, expression };
    }

    async getMetadata(contractId: string): Promise<Metadata> {
        if (!this.metadataCache.has(contractId)) {
            const metadata = await Compile.fromFile(contractId);
            this.metadataCache.set(contractId, metadata);
        }
        return this.metadataCache.get(contractId)!;
    }

    static async listen() {
        const chain = await Chain.get();
        const evaluator = new Evaluator(chain);
        await evaluator.listen();
    }
}

function getState(metadata: Metadata, methodName: string): State {
    const invocation = getInvocation(metadata, methodName);
    const operation = new Operation(invocation, new Result());
    const trace = new Trace([operation]);
    const observation = new Observation([]);
    const state = new State('', trace, observation);
    return state;
}

function getInvocation({ abi }: Metadata, methodName: string): Invocation {
    const method = abi.find(({ name }) => name === methodName);
    if (method === undefined)
        throw Error(`method ${methodName} not found`);
    return new Invocation(method);
}

function lines(input: stream.Readable): AsyncIterable<string> {
    const output = new stream.PassThrough({ objectMode: true });
    const rl = readline.createInterface({ input });
    rl.on("line", line => { output.write(line); });
    rl.on("close", () => { output.push(null); });
    return output;
}
