import Web3 from 'web3';

import { Contract } from 'web3-eth-contract';
import { Metadata } from './frontend';
import { Debugger } from './debug';

const debug = Debugger(__filename);
const ganache = require("ganache-cli");

export interface Harness {
    address: string;
    creator: Creator;
}

export async function setup(metadata: Metadata): Promise<Harness> {
    const provider = ganache.provider();
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    const address = accounts[1];
    const creator = getCreator(web3, metadata);
    return { address, creator };
}

interface Creator {
    create(address: string): Promise<Contract>;
}

function getCreator(web3: Web3, metadata: Metadata): Creator {
    return {
        create: async function(from: string): Promise<Contract> {
            const { abi, bytecode: data } = metadata;

            const contract = new web3.eth.Contract(abi);
            (contract as any).transactionConfirmationBlocks = 1;

            const tx = contract.deploy({ data });
            debug(`tx: %o`, tx);

            const gas = await tx.estimateGas() + 1;
            debug(`gas: %o`, gas);

            const instance = await tx.send({ from, gas });
            debug(`instance: %o`, instance.address);

            return instance;
        }
    };
}
