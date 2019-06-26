import { Debugger } from './utils/debug';
import * as readline from 'readline';
import stream from 'stream';
import { Expr } from './frontend/sexpr';
import { State } from './explore/states';
import * as Compile from './frontend/compile';
import { ExecutorFactory } from './explore/execute';
import { Invocation } from './explore/invocations';
import * as Chain from './utils/chain';
import { Metadata } from './frontend/metadata';

const debug = Debugger(__filename);

interface Request {
    state: State;
    expression: Expr;
}

interface Response {
    result: boolean;
}

export class Evaluator {
    static DELIMITER = "@";

    public executorFactory: ExecutorFactory
    metadataCache = new Map<string, Metadata>();

    constructor(chain: Chain.BlockchainInterface) {
        this.executorFactory = new ExecutorFactory(chain);
    }

    async listen() {
        for await (const line of lines(process.stdin)) {
            debug(`line: %s`, line);
            const request = this.parseRequest(line);
            debug(`request: %o`, request);
            const result = await this.processRequest(request);
            debug(`result: %o`, result);
            console.log(`${result}`);
        }
    }

    async processRequest(request: Request): Promise<Response> {
        const { state, expression } = request;
        const { contractId } = state;
        const metadata = await this.getMetadata(contractId);
        const [ extension, methodName ] = await getExtension(metadata, expression);
        const executor = this.executorFactory.getExecutor(extension);
        const invocation = getInvocation(extension, methodName);
        const { operation } = await executor.execute(state, invocation);
        const { result: { values: [ result ] } } = operation;

        if (typeof(result) !== 'boolean')
            throw Error(`Expected Boolean-valued expression`);

        return { result };
    }

    parseRequest(line: string): Request {
        const split = line.split(Evaluator.DELIMITER);

        if (split.length !== 2)
            throw new Error(`unexpected request: ${line}`);

        const [ stateString, exprString ] = split;
        const object = JSON.parse(stateString);
        const state = State.deserialize(object);
        const expression = Expr.parse(exprString);
        return { state, expression };
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

async function getExtension(metadata: Metadata, expr: Expr): Promise<[Metadata,string]> {
    throw Error(`TODO implement me`);
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
