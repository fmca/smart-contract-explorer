import { Debugger } from '../utils/debug';
import { Expr } from '../sexpr/expression';
import { State, Operation, Result, Trace, Observation } from '../explore/states';
import * as Compile from '../frontend/compile';
import { ExecutorFactory, Context, isErrorResult } from '../explore/execute';
import { Invocation } from '../explore/invocations';
import * as Chain from '../utils/chain';
import { Metadata } from '../frontend/metadata';
import { extendWithPredicate, expressionEvaluator } from './extension';
import { AbstractExample } from './examples';
import { lines } from '../utils/lines';

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
        this.evaluation = Evaluation.get(chain, true);
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
    metadataCache = new Map<string, Metadata>();

    constructor(chain: Chain.BlockchainInterface) {
        this.executorFactory = new ExecutorFactory(chain);
    }

    abstract async evaluate(example: AbstractExample, expression: Expr): Promise<Operation>;

    async getMetadata(contractId: string): Promise<Metadata> {
        if (!this.metadataCache.has(contractId)) {
            debug(`caching contract: %o`, contractId);
            const metadata = await Compile.fromFile(contractId);
            this.metadataCache.set(contractId, metadata);
        }
        return this.metadataCache.get(contractId)!;
    }

    static get(chain: Chain.BlockchainInterface, caching: boolean) {
        return caching ? new CachingEvaluation(chain) : new ExtensionEvaluation(chain);
    }
}

class ExtensionEvaluation extends Evaluation {

    constructor(chain: Chain.BlockchainInterface) {
        super(chain);
    }

    async evaluate(example: AbstractExample, expression: Expr): Promise<Operation> {
        const { id: { contract, method: stateMethod } } = example;
        const metadata = await this.getMetadata(contract);
        const [ extension, predicateMethod ] = await extendWithPredicate(metadata, expression);
        const executor = this.executorFactory.getExecutor(extension);
        const state = ExtensionEvaluation.getState(extension, stateMethod);
        const invocation = ExtensionEvaluation.getInvocation(extension, predicateMethod);
        const result = await executor.execute(state, invocation);

        if (isErrorResult(result))
            throw Error(`Unexpected error result: ${result.error}`);

        const { operation } = result;
        return operation;
    }

    static getState(metadata: Metadata, methodName: string): State {
        const invocation = ExtensionEvaluation.getInvocation(metadata, methodName);
        const operation = new Operation(invocation, new Result());
        const trace = new Trace([operation]);
        const observation = new Observation([]);
        const state = new State('', trace, observation);
        return state;
    }

    static getInvocation({ abi }: Metadata, methodName: string): Invocation {
        const method = abi.find(({ name }) => name === methodName);
        if (method === undefined)
            throw Error(`method ${methodName} not found`);
        return new Invocation(method);
    }
}

type CachedExample = { metadata: Metadata, context: Context };

class CachingEvaluation extends Evaluation {
    exampleCache = new Map<string, CachedExample>();
    expressionCache = new Map<string, Context>();

    constructor(chain: Chain.BlockchainInterface) {
        super(chain);
    }

    async evaluate(example: AbstractExample, expression: Expr): Promise<Operation> {
        const { metadata, context: { contract: { options: { address }}}} = await this.getExample(example);
        const context = await this.getExpression(expression, metadata);
        const { contract: { options: { jsonInterface: [method] }} } = context;
        const invocation = new Invocation(method, address);
        const result = await context.invokeReadOnly(invocation);
        const operation = new Operation(invocation, result);
        return operation;
    }

    async getExample(example: AbstractExample) {
        const key = JSON.stringify(example);

        if (!this.exampleCache.has(key)) {
            debug(`caching example: %o`, example);
            const { id: { contract, method: methodName } } = example;
            const metadata = await this.getMetadata(contract);
            const executor = this.executorFactory.getExecutor(metadata);
            const context = await executor.createContext();
            const method = metadata.abi.find(({ name }) => name === methodName);
            if (method === undefined)
                throw Error(`unknown method: ${methodName}`);
            const invocation = new Invocation(method);
            await context.invoke(invocation);
            this.exampleCache.set(key, { metadata, context });
        }

        return this.exampleCache.get(key)!;
    }

    async getExpression(expression: Expr, examples: Metadata) {
        const key = JSON.stringify(expression);

        if (!this.expressionCache.has(key)) {
            debug(`caching expression: %o`, expression);
            const metadata = await expressionEvaluator(expression, examples);
            const executor = this.executorFactory.getExecutor(metadata);
            const context = await executor.createContext();
            this.expressionCache.set(key, context);
        }

        return this.expressionCache.get(key)!;
    }
}
