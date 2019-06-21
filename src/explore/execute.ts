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

export class Executer {
    constructor(public creator: ContractCreator) { }

    async initial(metadata: Metadata, address: string): Promise<State> {
        const contract = await this.creator.create(metadata, address);
        const observers = new InvocationGenerator(metadata).observers();
        const observations = await observe(contract, observers);
        const trace = new Trace([]);
        return new State(metadata, address, trace, observations);
    }

    async execute(state: State, invocation: Invocation): Promise<Effect> {
        const { metadata, address } = state;
        const contract = await this.creator.create(metadata, address);
        const observers = new InvocationGenerator(metadata).observers();

        for (const { invocation } of state.trace.operations) {
            invoke(contract, invocation, address);
        }

        await invoke(contract, invocation, address);

        const result = new Result([]);
        const operation = new Operation(invocation, result);
        const actions = [...state.trace.operations, operation];
        const trace = new Trace(actions);

        const observations = await observe(contract, observers);
        const nextState = new State(metadata, address, trace, observations);
        return { operation, state: nextState };
    }
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

async function observe(contract: Contract, observers: Iterable<Invocation>): Promise<Observation> {
    const operations: Operation[] = [];

    for (const invocation of observers) {
        const result = await invokeReadOnly(contract, invocation);
        operations.push(new Operation(invocation, result));
    }

    return new Observation(operations);
}
