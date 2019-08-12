import { Debugger } from '../utils/debug';
import { Expr } from '../sexpr/expression';
import { State, Operation, Trace, Observation, NormalResult } from '../model';
import * as Compile from '../frontend/compile';
import { ExecutorFactory } from './execute';
import { Invocation, InvocationGenerator } from '../model';
import * as Chain from '../utils/chain';
import { Metadata, Address } from '../frontend/metadata';
import { extendWithPredicate, expressionEvaluator } from '../contracts/extension';
import { AbstractExample } from '../simulation/examples';
import { lines } from '../utils/lines';
import { ContractInstance } from './instance';
import { ContractInstantiation } from './instantiate';

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

        const { result } = operation;

        if (!(result instanceof NormalResult))
            throw Error(`Expected normal result`);

        const { values: [ value ] } = result;
        debug(`result: %o`, value);

        if (typeof(value) !== 'boolean')
            throw Error(`Expected Boolean-valued expression`);

        return { result: value };
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
    accounts: Address[];
    metadataCache = new Map<string, Metadata>();

    constructor(chain: Chain.BlockchainInterface) {
        this.accounts = chain.accounts;
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
    executorFactory: ExecutorFactory;

    constructor(chain: Chain.BlockchainInterface) {
        super(chain);
        this.executorFactory = new ExecutorFactory(chain);
    }

    async evaluate(example: AbstractExample, expression: Expr): Promise<Operation> {
        const { id: { contract, method: stateMethod } } = example;
        const metadata = await this.getMetadata(contract);
        const [ extension, predicateMethod ] = await extendWithPredicate(metadata, expression);
        const methods = [...Metadata.getFunctions(metadata)];
        const invocationGenerator = new InvocationGenerator(methods, this.accounts);
        const executor = this.executorFactory.getExecutor(invocationGenerator, extension);
        const state = ExtensionEvaluation.getState(extension, stateMethod);
        const invocation = ExtensionEvaluation.getInvocation(extension, predicateMethod);
        const result = await executor.execute(state, invocation);
        const { operation } = result;
        return operation;
    }

    static getState(metadata: Metadata, methodName: string): State {
        const invocation = ExtensionEvaluation.getInvocation(metadata, methodName);
        const operation = new Operation(invocation, new NormalResult());
        const trace = new Trace([operation]);
        const observation = new Observation([]);
        const state = new State('', trace, observation);
        return state;
    }

    static getInvocation(metadata: Metadata, methodName: string): Invocation {
        const method = Metadata.findFunction(methodName, metadata);
        if (method === undefined)
            throw Error(`method ${methodName} not found`);
        return new Invocation(method);
    }
}

type CachedExample = { metadata: Metadata, instance: ContractInstance };
type CachedExpression = { metadata: Metadata, instance: ContractInstance };

class CachingEvaluation extends Evaluation {
    exampleCache = new Map<string, CachedExample>();
    expressionCache = new Map<string, CachedExpression>();
    creator: ContractInstantiation;

    constructor(chain: Chain.BlockchainInterface) {
        super(chain);
        this.creator = new ContractInstantiation(chain);
    }

    async evaluate(example: AbstractExample, expression: Expr): Promise<Operation> {
        const { metadata, instance: { contract: { options: { address }}}} = await this.getExample(example);
        const { instance, metadata: m } = await this.getExpression(expression, metadata);
        const [method] = [...Metadata.getFunctions(m)];
        const invocation = new Invocation(method, address);
        const result = await instance.invokeReadOnly(invocation);
        const operation = new Operation(invocation, result);
        return operation;
    }

    async getExample(example: AbstractExample) {
        const key = JSON.stringify(example);

        if (!this.exampleCache.has(key)) {
            debug(`caching example: %o`, example);
            const { id: { contract, method: methodName } } = example;
            const metadata = await this.getMetadata(contract);
            const instance = await this.creator.instantiate(metadata);
            const method = Metadata.findFunction(methodName, metadata);
            if (method === undefined)
                throw Error(`unknown method: ${methodName}`);
            const invocation = new Invocation(method);
            await instance.invoke(invocation);
            this.exampleCache.set(key, { metadata, instance });
        }

        return this.exampleCache.get(key)!;
    }

    async getExpression(expression: Expr, examples: Metadata) {
        const key = JSON.stringify(expression);

        if (!this.expressionCache.has(key)) {
            debug(`caching expression: %o`, expression);
            const metadata = await expressionEvaluator(expression, examples);
            const instance = await this.creator.instantiate(metadata);
            this.expressionCache.set(key, { metadata, instance });
        }

        return this.expressionCache.get(key)!;
    }
}
