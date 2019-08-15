import { Debugger } from '../utils/debug';
import { Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../utils/chain';
import { ContractInstance } from './instance';
import { Value, TypedValue } from '../model';

const debug = Debugger(__filename);

export class ContractInstantiation {

    constructor(public chain: BlockchainInterface) { }

    async instantiate(metadata: Metadata, ...args: TypedValue[]) {
        const { abi, bytecode: data } = metadata;
        const [ from ] = await this.chain.getAccounts();
        const contract = this.chain.getContract(abi);
        const values = args.map(Value.encode);
        const transaction = contract.getDeployTransaction(from, data, ...values);
        const instance = transaction.then(t => t.send());
        return new ContractInstance(instance, from);
    }
}

