import Web3 from 'web3';
import { Address, Contract, Method } from '../frontend/metadata';
import { TransactionObject } from 'web3/eth/types';
import { Debugger } from '../utils/debug';
import { ABIDefinition } from 'web3/eth/abi';
const ganache = require("ganache-core");
const debug = Debugger(__filename);

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

export interface Transaction<T> {
    transaction: TransactionObject<T>;
    from: Address;
    gas: number;
}

export type Value = number | boolean | Address;

export function getContract(chain: BlockchainInterface, abi: ABIDefinition[]): Contract {
    const contract = chain.create(abi);
    (contract as any).transactionConfirmationBlocks = 1;
    return contract;
}

export async function getTransaction<T>(contract: Contract, from: Address, name: string, ...inputs: Value[]): Promise<Transaction<T>> {
    debug(`computing gas for transaction: %s`, name);
    const target = contract.methods[name!];
    if (typeof(target) !== 'function')
        throw Error(`Unknown function: '${name}'`);
    const transaction = target(...inputs);
    const gas = await transaction.estimateGas() * 10;
    return { transaction, from, gas };
}

export async function getDeployTransaction(contract: Contract, from: Address, data: string, ...inputs: Value[]) {
    debug(`computing gas for deployment`);
    const transaction = contract.deploy({ data, arguments: inputs });
    const gas = await transaction.estimateGas() + 1;
    return { transaction, from, gas };
}

export async function sendTransaction<T>({ transaction, from, gas }: Transaction<T>): Promise<T> {
    debug(`sending transaction from %o with gas %o`, from, gas);
    return transaction.send({ from, gas });
}

export async function callFunction<T>(contract: Contract, name: string, ...inputs: Value[]): Promise<T> {
    debug(`calling function: %s`, name);
    const target = contract.methods[name!];
    if (typeof(target) !== 'function')
        throw Error(`Unknown function: '${name}'`);
    return target(...inputs).call();
}
