import { State, Trace, Observation, Operation, Result, NormalResult } from '../model';
import { Invocation, InvocationGenerator } from '../model';
import { ContractInstantiation } from './instantiate';
import { Debugger } from '../utils/debug';
import { Address, Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../utils/chain';
import { ContractInstance } from './instance';

const debug = Debugger(__filename);

type Effect = {
    operation: Operation;
    state: State;
};

export class ExecutorFactory {
    public creator: ContractInstantiation;
    public accounts: Address[];

    constructor(chain: BlockchainInterface) {
        this.creator = new ContractInstantiation(chain);
        this.accounts = chain.accounts;
     }

    getExecutor(invocationGenerator: InvocationGenerator, metadata: Metadata): Executor {
        return new Executor(this.creator, invocationGenerator, metadata);
    }
}

export class Executor {
    constructor(
        public creator: ContractInstantiation,
        public invocationGenerator: InvocationGenerator,
        public metadata: Metadata) { }

    async * initials(): AsyncIterable<State> {
        for (const invocation of this.invocationGenerator.constructors()) {
            const instance = await this.create(invocation);
            const result = new NormalResult();
            const operation = new Operation(invocation, result);
            const trace = new Trace([operation]);
            const observation = await this.getObservation(instance);
            const { source: { path: contractId }} = this.metadata;
            yield new State(contractId, trace, observation);
        }
    }

    async execute(state: State, invocation: Invocation): Promise<Effect> {
        const { contractId, trace: t } = state;
        const instance = await this.replay(t);

        const result = await instance.invoke(invocation);
        const operation = new Operation(invocation, result);
        const operations = [...t.operations, operation];
        const trace = new Trace(operations);

        const observation = await this.getObservation(instance);
        const nextState = new State(contractId, trace, observation);
        return { operation, state: nextState };
    }

    async create(invocation: Invocation): Promise<ContractInstance> {
        if (!invocation.isConstructor)
            throw Error(`Expected constructor invocation`);

        const { inputs } = invocation;
        return this.creator.instantiate(this.metadata, ...inputs);
    }

    async replay(trace: Trace): Promise<ContractInstance> {
        debug(`replaying trace: %s`, trace);
        const { operations: [{ invocation }, ...operations] } = trace;
        const instance = await this.create(invocation);
        const invocations = operations.map(({ invocation }) => invocation);
        await instance.invokeSequence(invocations);
        return instance;
    }

    async getObservation(instance: ContractInstance): Promise<Observation> {
        const observers = this.invocationGenerator.observers();
        const observation = await instance.observe(observers);
        return observation;
    }
}
