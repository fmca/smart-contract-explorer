import { Debugger } from '../utils/debug';
import { Contract, Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../utils/chain';

const debug = Debugger(__filename);

export class ContractCreator {
    constructor(public chain: BlockchainInterface) { }

    async create(metadata: Metadata): Promise<Contract> {
        const contract = this.getContract(metadata);
        const instance = await this.instantiate(contract, metadata);
        return instance;
    }

    async instantiate(contract: Contract, metadata: Metadata) {
        const { bytecode: data } = metadata;
        const tx = contract.deploy({ data, arguments: [] });
        //debug(`tx: %o`, tx);

        const { accounts: [ from ] } = this.chain;
        const gas = await tx.estimateGas() + 1;
        debug(`gas: %o`, gas);

        const instance = await tx.send({ from, gas });
        debug(`from: %o`, from);
        return instance;
    }

    getContract(metadata: Metadata): Contract {
        const { abi } = metadata;
        const contract = this.chain.create(abi);
        (contract as any).transactionConfirmationBlocks = 1;
        return contract;
    }
}
