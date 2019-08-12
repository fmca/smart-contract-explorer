import { Debugger } from '../utils/debug';
import { Contract, Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../utils/chain';
import { ContractInstance } from './instance';
import { Value } from '../model';

const debug = Debugger(__filename);

export class ContractInstantiation {

    constructor(public chain: BlockchainInterface) { }

    async instantiate(metadata: Metadata, ...args: Value[]) {
        const contract = this.getContract(metadata);

        const { bytecode: data } = metadata;
        const tx = contract.deploy({ data, arguments: args });

        const { accounts: [ from ] } = this.chain;
        const gas = await tx.estimateGas() + 1;
        debug(`gas: %o`, gas);

        const instance = tx.send({ from, gas });
        debug(`from: %o`, from);

        return new ContractInstance(instance, from);
    }

    getContract(metadata: Metadata): Contract {
        const { abi } = metadata;
        const contract = this.chain.create(abi);
        (contract as any).transactionConfirmationBlocks = 1;
        return contract;
    }
}

