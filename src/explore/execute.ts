import { Contract } from 'web3-eth-contract';

import { State } from './states';
import { Invocation } from './invocations';
import { ContractCreator } from './creator';

export class Executer {
    creator: ContractCreator;
    address: string;

    constructor(creator: ContractCreator, address: string) {
        this.creator = creator;
        this.address = address;
    }

    async execute(state: State, invocation: Invocation): Promise<State> {
        const contract = await this.creator.createInstance();

        for (const { invocation } of state.trace.actions) {
            invoke(contract, invocation, this.address);
        }

        await invoke(contract, invocation, this.address);

        const result = { outputs: [] };
        const actions = [...state.trace.actions, { invocation, result }];
        const trace = { actions };
        return { trace };
    }
}

async function invoke(contract: Contract, invocation: Invocation, from: string): Promise<void> {
    const { method, inputs } = invocation;
    const { name } = method;

    const tx = contract.methods[name!];
    const gas = await tx.estimateGas() + 1;
    return tx.send({ from, gas });
}

