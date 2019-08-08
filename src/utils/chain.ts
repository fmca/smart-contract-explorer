import Web3 from 'web3';
import { Address, Contract, Method } from '../frontend/metadata';
const ganache = require("ganache-core");

export interface BlockchainInterface {
    accounts: Address[];
    create(abi: Method[]): Contract;
}

interface Options {
    mnemonic?: string;
}

export async function get(params: Options = {}): Promise<BlockchainInterface> {
    const { mnemonic = 'anticonstitutionnellement' } = params;
    const options = { ...params, mnemonic };
    const provider = ganache.provider(options);
    provider.setMaxListeners(100);
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    const create = (abi: Method[]) => new web3.eth.Contract(abi);
    return { create, accounts };
}
