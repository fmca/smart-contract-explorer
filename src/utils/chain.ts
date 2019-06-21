import Web3 from 'web3';
const ganache = require("ganache-core");

export interface BlockchainInterface {
    web3: Web3;
}

export async function get(): Promise<BlockchainInterface> {
    const provider = ganache.provider();
    const web3 = new Web3(provider);
    return { web3 };
}
