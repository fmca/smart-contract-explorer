import Contract from 'web3/eth/contract';

import { Debugger } from '../debug';
import { Metadata } from '../frontend';
import Web3 from 'web3';

const debug = Debugger(__filename);

export class ContractCreator {
    address: string;
    bytecode: string;
    contract: Contract;

    constructor(web3: Web3, metadata: Metadata, address: string) {
        const { abi, bytecode } = metadata;
        this.bytecode = bytecode;
        this.address = address;
        this.contract = new web3.eth.Contract(abi);
        (this.contract as any).transactionConfirmationBlocks = 1;
    }

    async createInstance(): Promise<Contract> {
        const tx = this.contract.deploy({ data: this.bytecode, arguments: [] });
        debug(`tx: %o`, tx);

        const gas = await tx.estimateGas() + 1;
        debug(`gas: %o`, gas);

        const instance = await tx.send({ from: this.address, gas });

        return instance;
    }
}
