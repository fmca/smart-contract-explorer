import Contract from 'web3/eth/contract';

import { State, Trace, Observation, Operation, Result } from './states';
import { Invocation, InvocationGenerator } from './invocations';
import { valuesOf } from './values';
import { ContractCreator } from './creator';
import { Debugger } from '../utils/debug';
import { Address, Metadata } from '../frontend/metadata';

const debug = Debugger(__filename);

type Effect = {
    operation: Operation;
    state: State;
};

export class ExecutorFactory {
    constructor(public creator: ContractCreator) { }

    getExecutor(metadata: Metadata, account: Address): Executor {
        return new Executor(this.creator, metadata, account);
    }
}

export class Executor {
    constructor(public creator: ContractCreator, public metadata: Metadata, public account: Address) { }

    async initial(address: Address): Promise<State> {
        const context = await this.createContext(address);
        const observation = await this.getObservation(context);
        const { source: { path: contractId }} = this.metadata;
        const trace = new Trace([]);
        return new State(contractId, address, trace, observation);
    }

    async execute(state: State, invocation: Invocation): Promise<Effect> {
        const { contractId, address, trace: t } = state;
        const context = await this.createContext(address);

        context.replayTrace(t);
        await context.invoke(invocation);

        const result = new Result([]);
        const operation = new Operation(invocation, result);
        const actions = [...state.trace.operations, operation];
        const trace = new Trace(actions);

        const observation = await this.getObservation(context);
        const nextState = new State(contractId, address, trace, observation);
        return { operation, state: nextState };
    }

    async executeTrace(trace: Trace, address: Address): Promise<State> {
        const { source: { path: contractId }} = this.metadata;
        const context = await this.createContext(address);
        await context.replayTrace(trace);
        const observation = await this.getObservation(context);
        return new State(contractId, address, trace, observation);
    }

    async getObservation(context: Context): Promise<Observation> {
        const observers = new InvocationGenerator(this.metadata, this.creator).observers();
        const observation = await context.observe(observers);
        return observation;
    }

    async createContext(address: Address): Promise<Context> {
        const contract = await this.creator.create(this.metadata, address);
        return new Context(contract, this.account);
    }
}

class Context {
    constructor(public contract: Contract, public account: Address) { }

    async replayTrace(trace: Trace): Promise<void> {
        const { operations } = trace;
        const invocations = operations.map(({ invocation }) => invocation);
        return this.invokeSequence(invocations);
    }

    async invokeSequence(invocations: Invocation[]): Promise<void> {
        let promise = new Promise<void>(_ => {});
        for (const invocation of invocations)
            promise = this.invoke(invocation);
        return promise;
    }

    async invoke(invocation: Invocation): Promise<void> {
        const { method, inputs } = invocation;
        const { name } = method;
        const from = this.account;

        const tx = this.contract.methods[name!](...inputs);
        const gas = await tx.estimateGas() * 10;

        debug(`sending transaction from %o with gas %o`, from, gas);
        return tx.send({ from, gas });
    }

    async invokeReadOnly(invocation: Invocation): Promise<Result> {
        const { method, inputs } = invocation;
        const { name } = method;

        debug(`calling method: %o`, invocation);
        const outputs = await this.contract.methods[name!](...inputs).call();

        const values = valuesOf(outputs);
        const result = new Result(values);
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
