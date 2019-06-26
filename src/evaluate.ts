import { Debugger } from './utils/debug';
import * as readline from 'readline';
import stream from 'stream';
import { Expr } from './frontend/sexpr';
import { State } from './explore/states';
import { ExecutorFactory } from './explore/execute';
import { Invocation } from './explore/invocations';
import { ContractCreator } from './explore/creator';
import * as Chain from './utils/chain';
import { Address } from './frontend/metadata';

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

    constructor(public executorFactory: ExecutorFactory, public account: Address) { }

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
        const { state: s, expression } = request;
        const [ state, invocation ] = await getInvocation(s, expression);
        const { metadata } = state;
        const executor = this.executorFactory.getExecutor(metadata, this.account);
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

    static async listen() {
        const chain = await Chain.get();
        const creator = new ContractCreator(chain);
        const factory = new ExecutorFactory(creator);
        const [ account ] = await creator.getAccounts();
        const evaluator = new Evaluator(factory, account);
        await evaluator.listen();
    }
}

async function getInvocation(state: State, expr: Expr): Promise<[State,Invocation]> {
    throw Error(`TODO implement me`);
}

function lines(input: stream.Readable): AsyncIterable<string> {
    const output = new stream.PassThrough({ objectMode: true });
    const rl = readline.createInterface({ input });
    rl.on("line", line => { output.write(line); });
    rl.on("close", () => { output.push(null); });
    return output;
}
