import { Debugger } from '../utils/debug';
import { Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../utils/chain';
import { ContractInstance } from './instance';
import { Value, TypedValue } from '../model';

const debug = Debugger(__filename);

export class ContractInstantiation {

    constructor(public chain: BlockchainInterface) { }

    async instantiate(metadata: Metadata, value: number | undefined, ...args: TypedValue[]) {
        const { abi, bytecode: data } = metadata;
        const [ from ] = await this.chain.getAccounts();
        const contract = this.chain.getContract(abi);
        const values = args.map(Value.encode);
        const transaction = contract.getDeployTransaction(from, data, value, ...values);
        const instance = transaction.then(async t => {
            try {
                return await t.send();
            } catch (e) {
                throw Error(`unexpected deployment error: ${e}`);
            }
        });
        return new ContractInstance(instance, from);
    }
}
