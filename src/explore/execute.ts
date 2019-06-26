import Contract from 'web3/eth/contract';

import { State, Trace, Observation, Operation, Result } from './states';
import { Invocation, InvocationGenerator } from './invocations';
import { valuesOf } from './values';
import { ContractCreator } from './creator';
import { Debugger } from '../utils/debug';
import { Metadata } from '../frontend/metadata';

const debug = Debugger(__filename);

type Effect = {
    operation: Operation;
    state: State;
};

export class ExecutorFactory {
    constructor(public creator: ContractCreator) { }

    getExecutor(metadata: Metadata): Executor {
        return new Executor(this.creator, metadata);
    }
}

export class Executor {
    constructor(public creator: ContractCreator, public metadata: Metadata) { }

    async initial(address: string): Promise<State> {
        const contract = await this.createContract(address);
        const observation = await this.getObservation(contract);
        const trace = new Trace([]);
        return new State(this.metadata, address, trace, observation);
    }

    async execute(state: State, invocation: Invocation): Promise<Effect> {
        // TODO use this.metadata or state.metadata?
        const { metadata, address, trace: t } = state;
        const contract = await this.createContract(address);

        replayTrace(contract, t, address);
        await invoke(contract, invocation, address);

        const result = new Result([]);
        const operation = new Operation(invocation, result);
        const actions = [...state.trace.operations, operation];
        const trace = new Trace(actions);

        const observation = await this.getObservation(contract);
        const nextState = new State(metadata, address, trace, observation);
        return { operation, state: nextState };
    }

    async executeTrace(trace: Trace, address: string): Promise<State> {
        const contract = await this.createContract(address);
        await replayTrace(contract, trace, address);
        const observation = await this.getObservation(contract);
        return new State(this.metadata, address, trace, observation);
    }

    async createContract(address: string): Promise<Contract> {
        return this.creator.create(this.metadata, address);
    }

    async getObservation(contract: Contract): Promise<Observation> {
        const observers = new InvocationGenerator(this.metadata, this.creator).observers();
        const observation = await observe(contract, observers);
        return observation;
    }
}

async function replayTrace(contract: Contract, trace: Trace, from: string): Promise<void> {
    const { operations } = trace;
    const invocations = operations.map(({ invocation }) => invocation);
    return invokeSequence(contract, invocations, from);
}

async function invokeSequence(contract: Contract, invocations: Invocation[], from: string): Promise<void> {
    let promise = new Promise<void>(_ => {});
    for (const invocation of invocations)
        promise = invoke(contract, invocation, from);
    return promise;
}

async function invoke(contract: Contract, invocation: Invocation, from: string): Promise<void> {
    const { method, inputs } = invocation;
    const { name } = method;

    const tx = contract.methods[name!](...inputs);
    const gas = await tx.estimateGas() * 10;

    debug(`sending transaction from %o with gas %o`, from, gas);
    return tx.send({ from, gas });
}

async function invokeReadOnly(contract: Contract, invocation: Invocation): Promise<Result> {
    const { method, inputs } = invocation;
    const { name } = method;

    debug(`calling method: %o`, invocation);
    const outputs = await contract.methods[name!](...inputs).call();

    const values = valuesOf(outputs);
    const result = new Result(values);
    debug("result: %o", outputs);

    return result;
}

async function observe(contract: Contract, observers: AsyncIterable<Invocation>): Promise<Observation> {
    const operations: Operation[] = [];

    for await (const invocation of observers) {
        const result = await invokeReadOnly(contract, invocation);
        operations.push(new Operation(invocation, result));
    }

    return new Observation(operations);
}
