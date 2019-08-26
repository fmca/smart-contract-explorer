import { Debugger } from '../utils/debug';
import { Expr } from '../sexpr/expression';
import { State, Operation, Trace, Observation, NormalResult, Value } from '../model';
import * as Compile from '../frontend/compile';
import { ExecutorFactory } from './execute';
import { Invocation, InvocationGenerator } from '../model';
import * as Chain from '../utils/chain';
import { Metadata } from '../frontend/metadata';
import { extendWithPredicate, expressionEvaluator } from '../contracts/extension';
import { AbstractExample } from '../simulation/examples';
import fs from 'fs-extra';
import { lines } from '../utils/lines';
import { ContractInstance } from './instance';
import { ContractInstantiation } from './instantiate';
import { EvaluatorQuery, SimulationData } from '../simulation/simulation-data';

const debug = Debugger(__filename);


interface Request extends EvaluatorQuery {
    expression: string;
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
            debug(`line: %o`, line);
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
        const { dataPath, exampleId, expression } = request;
        const operation = await this.evaluation.evaluate(dataPath, exampleId, expression);

        const { result } = operation;

        if (!(result instanceof NormalResult))
            throw Error(`Expected normal result; got ${result}`);

        const { values: [ value ] } = result;
        debug(`result: %o`, value);

        if (!Value.isElementaryValue(value) || value.type !== 'bool')
            throw Error(`Expected Boolean-valued expression`);

        return { result: value.value as boolean };
    }

    parseRequest(line: string): Request {
        const split = line.split(Evaluator.DELIMITER);

        if (split.length !== 2)
            throw new Error(`unexpected request: ${line}`);

        const [ exampleString, expression ] = split;
        const example: EvaluatorQuery = JSON.parse(exampleString);
        return { ...example, expression };
    }

    static async listen() {
        const chain = new Chain.BlockchainInterface();
        const evaluator = new Evaluator(chain);
        await evaluator.listen();
    }
}

abstract class Evaluation {
    dataCache = new Map<string, SimulationData>();
    metadataCache = new Map<string, Metadata>();

    constructor(public chain: Chain.BlockchainInterface) {}

    abstract async evaluate(dataPath: string, exampleId: string, expression: string): Promise<Operation>;

    async getSimualtionData(dataPath: string): Promise<SimulationData> {
        if (!this.dataCache.has(dataPath)) {
            debug(`caching simulation data: %o`, dataPath);
            const buffer = await fs.readFile(dataPath);
            const data: SimulationData = await JSON.parse(buffer.toString());
            this.dataCache.set(dataPath, data);
        }
        return this.dataCache.get(dataPath)!;
    }

    async getMetadata(contractId: string): Promise<Metadata> {
        if (!this.metadataCache.has(contractId)) {
            debug(`caching contract: %o`, contractId);
            const metadata = await Compile.fromFile(contractId);
            this.metadataCache.set(contractId, metadata);
        }
        return this.metadataCache.get(contractId)!;
    }

    async parseExpression(dataPath: string, expression: string) {
        const data = await this.getSimualtionData(dataPath);

        // TODO use data.expressions to parse the expression
        const expr = Expr.parse(expression);

        return expr;
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

    async evaluate(dataPath: string, exampleId: string, expression: string): Promise<Operation> {
        const data = await this.getSimualtionData(dataPath);
        const { examplesContractPath } = data;
        const metadata = await this.getMetadata(examplesContractPath);
        const expr = await this.parseExpression(dataPath, expression);
        const [ extension, predicateMethod ] = await extendWithPredicate(metadata, expr);
        const accounts = await this.chain.getAccounts();
        const invocationGenerator = new InvocationGenerator(metadata, accounts);
        const executor = this.executorFactory.getExecutor(invocationGenerator, extension);
        const state = ExtensionEvaluation.getState(extension, exampleId);
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
        const method = metadata.findFunction(methodName);
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

    async evaluate(dataPath: string, exampleId: string, expression: string): Promise<Operation> {
        const { metadata, instance: { contract }} = await this.getExample(dataPath, exampleId);
        const value = (await contract).getAddress();
        const { instance, metadata: m } = await this.getExpression(dataPath, expression, metadata);
        const [method] = [...m.getFunctions()];
        const invocation = new Invocation(method, { type: 'address', value });
        const result = await instance.invokeReadOnly(invocation);
        const operation = new Operation(invocation, result);
        debug(`evaluate(%o, %o): %s`, exampleId, expression, operation);
        return operation;
    }

    async getExample(dataPath: string, exampleId: string) {
        const key = JSON.stringify({ dataPath, exampleId });

        if (!this.exampleCache.has(key)) {
            debug(`caching example: %o`, exampleId);
            const data = await this.getSimualtionData(dataPath);
            const { examplesContractPath } = data;
            const metadata = await this.getMetadata(examplesContractPath);
            const value = undefined;
            const instance = await this.creator.instantiate(metadata, value);
            const methodName = exampleId;
            const method = metadata.findFunction(methodName);
            if (method === undefined)
                throw Error(`unknown method: ${methodName}`);
            const invocation = new Invocation(method);
            await instance.invoke(invocation);
            this.exampleCache.set(key, { metadata, instance });
        }

        return this.exampleCache.get(key)!;
    }

    async getExpression(dataPath: string, expression: string, examples: Metadata) {
        const key = JSON.stringify({ dataPath, expression });

        if (!this.expressionCache.has(key)) {
            debug(`caching expression: %o`, expression);
            const expr = await this.parseExpression(dataPath, expression);
            const metadata = await expressionEvaluator(expr, examples);
            const value = undefined;
            const instance = await this.creator.instantiate(metadata, value);
            this.expressionCache.set(key, { metadata, instance });
        }

        return this.expressionCache.get(key)!;
    }
}
