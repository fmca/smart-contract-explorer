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

export interface Parameters { }


export class Evaluator {
    static DELIMITER = "@";

    constructor(public chain: Chain.BlockchainInterface) { }

    async listen(params: Parameters) {
        for await (const line of lines(process.stdin)) {
            const request = this.parseRequest(line);
            const result = await this.processRequest(request);
            console.log(`${result}`);
        }
    }

    async processRequest(request: Request): Promise<Response> {
        const { state, expression } = request;
        const invocation = this.invocationOfExpr(expression);
        const creator = new ContractCreator(this.chain);
        const executer = new Executer(creator);
        const { operation } = await executer.execute(state, invocation);
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
        const state = JSON.parse(stateString);
        const expression = Expr.parse(exprString);
        return { state, expression };
    }

    static async listen(params: Parameters) {
        const chain = await Chain.get();
        const evaluator = new Evaluator(chain);
        await evaluator.listen(params);
    }
}

interface Request {
    state: State;
    expression: Expr;
}

interface Response {
    result: boolean;
}

function lines(input: stream.Readable): AsyncIterable<string> {
    const output = new stream.PassThrough({ objectMode: true });
    const rl = readline.createInterface({ input });
    rl.on("line", line => { output.write(line); });
    rl.on("close", () => { output.push(null); });
    return output;
}
