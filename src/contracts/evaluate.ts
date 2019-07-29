import { Debugger } from '../utils/debug';
import { Expr } from '../frontend/sexpr';
import { State, Operation, Result, Trace, Observation } from '../explore/states';
import * as Compile from '../frontend/compile';
import { ExecutorFactory } from '../explore/execute';
import { Invocation } from '../explore/invocations';
import * as Chain from '../utils/chain';
import { Metadata } from '../frontend/metadata';
import { extendWithPredicate } from './extension';
import { AbstractExample } from './examples';
import { lines } from '../utils/lines';
import { Value } from '../explore/values';

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

    evaluation: Evaluation;

    constructor(chain: Chain.BlockchainInterface) {
        this.evaluation = new ExtensionEvaluation(chain);
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
        debug(`stopped listening`);
    }

    async processRequest(request: Request): Promise<Response> {
        const { example, expression } = request;
        const operation = await this.evaluation.evaluate(example, expression);
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

    static async listen() {
        const chain = await Chain.get();
        const evaluator = new Evaluator(chain);
        await evaluator.listen();
    }
}

abstract class Evaluation {
    executorFactory: ExecutorFactory;

    constructor(chain: Chain.BlockchainInterface) {
        this.executorFactory = new ExecutorFactory(chain);
    }

    abstract async evaluate(example: AbstractExample, expression: Expr): Promise<Operation>;
}

class ExtensionEvaluation extends Evaluation {
    metadataCache = new Map<string, Metadata>();

    constructor(chain: Chain.BlockchainInterface) {
        super(chain);
    }

    async evaluate(example: AbstractExample, expression: Expr): Promise<Operation> {
        const { id: { contract, method: stateMethod } } = example;
        const metadata = await this.getMetadata(contract);
        const [ extension, predicateMethod ] = await extendWithPredicate(metadata, expression);
        const executor = this.executorFactory.getExecutor(extension);
        const state = getState(extension, stateMethod);
        const invocation = getInvocation(extension, predicateMethod);
        const { operation } = await executor.execute(state, invocation);
        return operation;
    }

    async getMetadata(contractId: string): Promise<Metadata> {
        if (!this.metadataCache.has(contractId)) {
            const metadata = await Compile.fromFile(contractId);
            this.metadataCache.set(contractId, metadata);
        }
        return this.metadataCache.get(contractId)!;
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
