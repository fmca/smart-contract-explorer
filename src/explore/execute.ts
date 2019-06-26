import { State, Trace, Observation, Operation, Result } from './states';
import { Invocation, InvocationGenerator } from './invocations';
import { valuesOf } from './values';
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

    getExecutor(metadata: Metadata): Executor {
        const [ account ] = this.accounts;
        return new Executor(this.creator, this.accounts, metadata, account);
    }
}

export class Executor {
    constructor(public creator: ContractCreator, public accounts: Address[], public metadata: Metadata, public account: Address) { }

    async initial(): Promise<State> {
        const context = await this.createContext();
        const observation = await this.getObservation(context);
        const { source: { path: contractId }} = this.metadata;
        const trace = new Trace([]);
        return new State(contractId, trace, observation);
    }

    async execute(state: State, invocation: Invocation): Promise<Effect> {
        const { contractId, trace: t } = state;
        const context = await this.createContext();

        context.replayTrace(t);
        const result = await context.invoke(invocation);
        const operation = new Operation(invocation, result);
        const operations = [...t.operations, operation];
        const trace = new Trace(operations);

        const observation = await this.getObservation(context);
        const nextState = new State(contractId, trace, observation);
        return { operation, state: nextState };
    }

    async executeTrace(trace: Trace): Promise<State> {
        const { source: { path: contractId }} = this.metadata;
        const context = await this.createContext();
        await context.replayTrace(trace);
        const observation = await this.getObservation(context);
        return new State(contractId, trace, observation);
    }

    async getObservation(context: Context): Promise<Observation> {
        const observers = new InvocationGenerator(this.metadata, this.accounts).observers();
        const observation = await context.observe(observers);
        return observation;
    }

    async createContext(): Promise<Context> {
        const contract = await this.creator.create(this.metadata);
        return new Context(contract, this.account);
    }
}

class Context {
    constructor(public contract: Contract, public account: Address) { }

    async replayTrace(trace: Trace): Promise<Result> {
        const { operations } = trace;
        const invocations = operations.map(({ invocation }) => invocation);
        return this.invokeSequence(invocations);
    }

    async invokeSequence(invocations: Invocation[]): Promise<Result> {
        let result = new Promise<Result>(_ => {});
        for (const invocation of invocations)
            result = this.invoke(invocation);
        return result;
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

        const tx = this.contract.methods[name!](...inputs);
        const gas = await tx.estimateGas() * 10;

        debug(`sending transaction from %o with gas %o`, from, gas);
        await tx.send({ from, gas });
        return new Result();
    }

    async invokeReadOnly(invocation: Invocation): Promise<Result> {
        const { method, inputs } = invocation;
        const { name } = method;

        debug(`calling method: %o`, invocation);
        const outputs = await this.contract.methods[name!](...inputs).call();

        const values = valuesOf(outputs);
        const result = new Result(...values);
        debug("result: %o", outputs);

        return result;
    }

    async observe(observers: AsyncIterable<Invocation>): Promise<Observation> {
        const operations: Operation[] = [];

        for await (const invocation of observers) {
            const result = await this.invokeReadOnly(invocation);
            operations.push(new Operation(invocation, result));
        }

        return new Observation(operations);
    }
}
