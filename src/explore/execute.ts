import { State, Trace, Observation, Operation, Result } from '../model';
import { Invocation, InvocationGenerator } from '../model';
import { ContractCreator } from './creator';
import { Debugger } from '../utils/debug';
import { Address, Contract, Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../utils/chain';

const debug = Debugger(__filename);

type Effect = {
    operation: Operation;
    state: State;
};

export class ExecutorFactory {
    public creator: ContractCreator;
    public accounts: Address[];

    constructor(chain: BlockchainInterface) {
        this.creator = new ContractCreator(chain);
        this.accounts = chain.accounts;
     }

    getExecutor(invocationGenerator: InvocationGenerator, metadata: Metadata): Executor {
        const [ account ] = this.accounts;
        return new Executor(this.creator, invocationGenerator, this.accounts, metadata, account);
    }
}

export class Executor {
    constructor(
        public creator: ContractCreator,
        public invocationGenerator: InvocationGenerator,
        public accounts: Address[],
        public metadata: Metadata,
        public account: Address) { }

    async initial(): Promise<State> {
        const context = await this.createContext();
        const observation = await this.getObservation(context);
        const { source: { path: contractId }} = this.metadata;
        const trace = new Trace([]);
        return new State(contractId, trace, observation);
    }

    async execute(state: State, invocation: Invocation): Promise<Effect | ErrorResult> {
        const { contractId, trace: t } = state;
        const context = await this.createContext();

        await context.replayTrace(t);
        try {
            const result = await context.invoke(invocation);
            const operation = new Operation(invocation, result);
            const operations = [...t.operations, operation];
            const trace = new Trace(operations);

            const observation = await this.getObservation(context);
            const nextState = new State(contractId, trace, observation);
            return { operation, state: nextState };

        } catch (e) {
            if (isErrorResult(e))
                return e;
            throw e;
        }
    }

    async executeTrace(trace: Trace): Promise<State> {
        const { source: { path: contractId }} = this.metadata;
        const context = await this.createContext();
        await context.replayTrace(trace);
        const observation = await this.getObservation(context);
        return new State(contractId, trace, observation);
    }

    async getObservation(context: Context): Promise<Observation> {
        const observers = this.invocationGenerator.observers();
        const observation = await context.observe(observers);
        return observation;
    }

    async createContext(): Promise<Context> {
        const contract = await this.creator.create(this.metadata);
        return new Context(contract, this.metadata, this.account);
    }
}

export class Context {
    constructor(public contract: Contract, public metadata: Metadata, public account: Address) { }

    async replayTrace(trace: Trace): Promise<Result> {
        debug(`replaying trace: %s`, trace);
        const { operations } = trace;
        const invocations = operations.map(({ invocation }) => invocation);
        const result = await this.invokeSequence(invocations)
        if (isErrorResult(result))
            throw Error(`Unexpected error result: ${result.error}`);
        return result;
    }

    async invokeSequence(invocations: Invocation[]): Promise<Result | ErrorResult> {
        debug(`invoking sequence: %o`, invocations);
        let result = new Promise<Result>((resolve, _) => resolve(new Result()));
        try {
            for (const invocation of invocations)
                result = this.invoke(invocation);
            return result;
        } catch (e) {
            if (!isErrorResult(e))
                throw e;
            return e;
        }
    }

    async invoke(invocation: Invocation): Promise<Result> {
        return invocation.isMutator()
            ? this.invokeMutator(invocation)
            : this.invokeReadOnly(invocation);
    }

    async invokeMutator(invocation: Invocation): Promise<Result> {
        const { method, inputs } = invocation;
        const { name } = method;
        const from = this.account;

        debug(`invoking mutator method: %s`, invocation);

        const tx = this.contract.methods[name!](...inputs);
        const gas = await tx.estimateGas() * 10;

        try {
            debug(`sending transaction from %o with gas %o`, from, gas);
            await tx.send({ from, gas });

        } catch (e) {
            if (!isRuntimeError(e))
                throw e;

            const results = Object.values(e.results);
            if (results.length !== 1)
                throw Error(`Unexpected result count: ${results.length}`);

            const [ result ] = results;

            if (result.error !== 'revert')
                throw Error(`Unexpected error: ${result.error}`);

            debug(`throwing: %o`, result);
            throw result;
        }
        return new Result();
    }

    async invokeReadOnly(invocation: Invocation): Promise<Result> {
        const { method, inputs } = invocation;
        const { name } = method;

        debug(`invoking readonly method: %s`, invocation);
        const values = await this.contract.methods[name!](...inputs).call();
        debug("values: %o", values);
        const result = new Result(values);
        debug("result: %o", result);

        return result;
    }

    async observe(observers: Iterable<Invocation>): Promise<Observation> {
        const operations: Operation[] = [];

        for await (const invocation of observers) {
            const result = await this.invokeReadOnly(invocation);
            operations.push(new Operation(invocation, result));
        }

        return new Observation(operations);
    }
}

interface RuntimeError {
    name: string;
    results: Results;
    hashes: string[];
    message: string;
}

interface Results {
    [key: string]: TransactionResult;
}

type TransactionResult = ErrorResult;

interface ErrorResult {
    error: Error;
    program_counter: number;
    return: string;
    reason: string;
}

type Error = 'revert';

function isRuntimeError(error: any): error is RuntimeError {
    return ['name', 'results', 'hashes', 'message'].every(key => error[key] !== undefined);
}

function isResults(results: any): results is Results {
    const values = Object.values(results);
    return values.every(isErrorResult);
}

export function isErrorResult(result: any): result is ErrorResult {
    return result.error !== undefined;
}
