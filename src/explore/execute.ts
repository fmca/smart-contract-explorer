import Contract from 'web3/eth/contract';

import { State, Trace, Observation, Operation, Result } from './states';
import { Invocation } from './invocations';
import { valuesOf } from './values';
import { ContractCreator } from './creator';
import { Debugger } from '../debug';

const debug = Debugger(__filename);

export class Executer {
    creator: ContractCreator;
    address: string;

    constructor(creator: ContractCreator, address: string) {
        this.creator = creator;
        this.address = address;
    }

    async initial(observers: Invocation[]): Promise<State> {
        const contract = await this.creator.createInstance();
        const observations = await observe(contract, observers);
        const trace = new Trace([]);
        return new State(trace, observations);
    }

    async execute(state: State, invocation: Invocation, observers: Invocation[]): Promise<State> {
        const contract = await this.creator.createInstance();

        for (const { invocation } of state.trace.operations) {
            invoke(contract, invocation, this.address);
        }

        await invoke(contract, invocation, this.address);

        const result = new Result([]);
        const operation = new Operation(invocation, result);
        const actions = [...state.trace.operations, operation];
        const trace = new Trace(actions);

        const observations = await observe(contract, observers);

        return new State(trace, observations);
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

async function observe(contract: Contract, observers: Invocation[]): Promise<Observation> {
    const operations: Operation[] = [];

    for (const invocation of observers) {
        const result = await invokeReadOnly(contract, invocation);
        operations.push(new Operation(invocation, result));
    }

    return new Observation(operations);
}
