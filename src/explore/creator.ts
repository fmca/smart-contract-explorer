import Contract from 'web3/eth/contract';

import { Debugger } from '../debug';
import { Metadata } from '../frontend/metadata';
import { BlockchainInterface } from '../setup';

const debug = Debugger(__filename);

export class ContractCreator {
    constructor(public chain: BlockchainInterface) { }

    async create(metadata: Metadata, address: string): Promise<Contract> {
        const { bytecode } = metadata;
        const contract = this.getContract(metadata);
        const instance = await this.instantiate(contract, metadata, address);
        return instance;
    }

    async instantiate(contract: Contract, metadata: Metadata, address: string) {
        const { bytecode: data } = metadata;
        const tx = contract.deploy({ data, arguments: [] });
        debug(`tx: %o`, tx);

        const gas = await tx.estimateGas() + 1;
        debug(`gas: %o`, gas);

        const instance = await tx.send({ from: address, gas });
        return instance;
    }

    getContract(metadata: Metadata): Contract {
        const { abi } = metadata;
        const contract = new this.chain.web3.eth.Contract(abi);
        (contract as any).transactionConfirmationBlocks = 1;
        return contract;
    }
}
