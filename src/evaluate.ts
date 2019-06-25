import { Debugger } from './utils/debug';
import * as readline from 'readline';
import stream from 'stream';
import { Expr } from './frontend/sexpr';
import { State } from './explore/states';
import { Executer } from './explore/execute';
import { Invocation } from './explore/invocations';
import { ContractCreator } from './explore/creator';
import * as Chain from './utils/chain';

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

    executer: Executer;

    constructor(public chain: Chain.BlockchainInterface) {
        const creator = new ContractCreator(this.chain);
        this.executer = new Executer(creator);
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
        const invocation = this.invocationOfExpr(expression);
        const { operation } = await this.executer.execute(state, invocation);
        const { result: { values: [ result ] } } = operation;

        if (typeof(result) !== 'boolean')
            throw Error(`Expected Boolean-valued expression`);

        return { result };
    }

    invocationOfExpr(expr: Expr): Invocation {
        throw Error(`TODO implement me`);
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
        const evaluator = new Evaluator(chain);
        await evaluator.listen();
    }
}

function lines(input: stream.Readable): AsyncIterable<string> {
    const output = new stream.PassThrough({ objectMode: true });
    const rl = readline.createInterface({ input });
    rl.on("line", line => { output.write(line); });
    rl.on("close", () => { output.push(null); });
    return output;
}
