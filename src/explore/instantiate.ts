import { Debugger } from '../utils/debug';
import { Metadata } from '../frontend/metadata';
import { BlockchainInterface, getDeployTransaction, getContract } from '../utils/chain';
import { ContractInstance } from './instance';
import { Value, TypedValue } from '../model';
import { sendTransaction } from '../utils/chain';

const debug = Debugger(__filename);

export class ContractInstantiation {

    constructor(public chain: BlockchainInterface) { }

    async instantiate(metadata: Metadata, ...args: TypedValue[]) {
        const { abi, bytecode: data } = metadata;
        const { accounts: [ from ] } = this.chain;
        const contract = getContract(this.chain, abi);
        const values = args.map(Value.encode);
        const transaction = getDeployTransaction(contract, from, data, ...values);
        const instance = transaction.then(sendTransaction);
        return new ContractInstance(instance, from);
    }
}

