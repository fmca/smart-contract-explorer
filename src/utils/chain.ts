import Web3 from 'web3';
import { Address, Method } from '../frontend/metadata';
import Web3Contract from 'web3/eth/contract';
import { Debugger } from '../utils/debug';
import { Value } from '../model';
import { ABIDefinition } from 'web3/eth/abi';
const ganache = require("ganache-core");
const debug = Debugger(__filename);

interface Options {
    mnemonic?: string;
}

export type Address = string;

export class BlockchainInterface {
    web3: Web3;

    constructor(params: Options = {}) {
        const { mnemonic = 'anticonstitutionnellement' } = params;
        const gasLimit = Number.MAX_SAFE_INTEGER;
        const gasPrice = '0x0';
        const allowUnlimitedContractSize = true;
        const options = { ...params, mnemonic, allowUnlimitedContractSize, gasLimit, gasPrice };
        const provider = ganache.provider(options);
        provider.setMaxListeners(100);
        this.web3 = new Web3(provider);
    }

    async getAccounts(): Promise<Address[]> {
        const accounts = await this.web3.eth.getAccounts();
        return accounts;
    }

    getContract(abi: Method[]): UndeployedContract {
        const contract = new this.web3.eth.Contract(abi);
        (contract as any).transactionConfirmationBlocks = 1;
        return new UndeployedContract(contract);
    }
}

export interface Transaction<T> {
    send(): Promise<T>;
}

export class Contract {
    constructor(protected contract: Web3Contract) { }

    getABI(): ABIDefinition[] {
        return this.contract.options.jsonInterface;
    }
}

export class UndeployedContract extends Contract {
    constructor(contract: Web3Contract) { super(contract); }

    async getDeployTransaction(from: Address, data: string, value: number | undefined, ...inputs: Value[]): Promise<Transaction<DeployedContract>> {
        debug(`computing gas for deployment of %o bytes`, data.length / 2);
        const transaction = this.contract.deploy({ data, arguments: inputs });
        const gas = await transaction.estimateGas() + 1;
        return { send: () => transaction.send({ from, gas, value }).then(c => new DeployedContract(c)) };
    }
}

export class DeployedContract extends Contract {
    constructor(contract: Web3Contract) { super(contract); }

    async getTransaction<T>(from: Address, name: string, value: number | undefined, ...inputs: Value[]): Promise<Transaction<T>> {
        debug(`computing gas for transaction: %s`, name);
        const target = this.contract.methods[name!];
        if (typeof(target) !== 'function')
            throw Error(`Unknown function: '${name}'`);
        const transaction = target(...inputs);
        const gas = await transaction.estimateGas() * 10;
        return { send: () => transaction.send({ from, gas, value }) }
    }

    async callFunction<T>(name: string, ...inputs: Value[]): Promise<T> {
        debug(`calling function: %s`, name);
        const target = this.contract.methods[name!];
        if (typeof(target) !== 'function')
            throw Error(`Unknown function: '${name}'`);
        return target(...inputs).call();
    }

    getAddress(): Address {
        return this.contract.options.address;
    }
}
