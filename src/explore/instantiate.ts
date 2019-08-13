import { Debugger } from '../utils/debug';
import { Contract, Metadata } from '../frontend/metadata';
import { BlockchainInterface, getDeployTransaction } from '../utils/chain';
import { ContractInstance } from './instance';
import { Value } from '../model';
import { sendTransaction } from '../utils/chain';

const debug = Debugger(__filename);

export class ContractInstantiation {

    constructor(public chain: BlockchainInterface) { }

    async instantiate(metadata: Metadata, ...args: Value[]) {
        const contract = this.getContract(metadata);
        const { bytecode: data } = metadata;
        const { accounts: [ from ] } = this.chain;
        const transaction = getDeployTransaction(contract, from, data, ...args);
        const instance = transaction.then(sendTransaction);
        return new ContractInstance(instance, from);
    }

    getContract(metadata: Metadata): Contract {
        const { abi } = metadata;
        const contract = this.chain.create(abi);
        (contract as any).transactionConfirmationBlocks = 1;
        return contract;
    }
}

