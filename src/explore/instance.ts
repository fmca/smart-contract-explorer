import { Debugger } from '../utils/debug';
import { Contract, Address } from '../frontend/metadata';
import { Result, Invocation, Observation, Operation, Trace, NormalResult, ErrorResult } from '../model';
import { isRuntimeError } from './errors';
import { TransactionObject } from 'web3/eth/types';

const debug = Debugger(__filename);

interface Transaction<T> {
    transaction: TransactionObject<T>;
    gas: number;
}

export class ContractInstance {
    constructor(public contract: Promise<Contract>, public account: Address) { }

    async invokeSequence(invocations: Invocation[]): Promise<void> {
        debug(`invoking sequence: %O`, invocations);
        const transactions = await Promise.all(invocations.map(this.getTransaction.bind(this)));
        const results = transactions.map(this.sendTransaction.bind(this));
        await results[results.length-1];
    }

    async invoke(invocation: Invocation): Promise<Result> {
        try {
            return invocation.isMutator()
                ? this.invokeMutator(invocation)
                : this.invokeReadOnly(invocation);

        } catch (e) {
            return this.handleErrors(e);
        }
    }

    async invokeMutator(invocation: Invocation): Promise<Result> {
        debug(`invoking mutator method: %s`, invocation);
        const transaction = await this.getTransaction(invocation);
        return this.sendTransaction(transaction);
    }

    async invokeReadOnly(invocation: Invocation): Promise<Result> {
        const contract = await this.contract;
        const { method, inputs } = invocation;
        const { name } = method;

        debug(`invoking readonly method: %s`, invocation);
        const values = await contract.methods[name!](...inputs).call();
        debug("values: %o", values);
        const result = new NormalResult(values);
        debug("result: %o", result);

        return result;
    }

    async getTransaction<T>(invocation: Invocation): Promise<Transaction<T>> {
        const contract = await this.contract;
        const { method, inputs } = invocation;
        const { name } = method;

        debug(`computing gas for transaction: %s`, invocation);
        const transaction = contract.methods[name!](...inputs);
        const gas = await transaction.estimateGas() * 10;
        return { transaction, gas };
    }

    async sendTransaction<T>({ transaction, gas }: Transaction<T>): Promise<Result> {
        const from = this.account;

        debug(`sending transaction from %o with gas %o`, from, gas);
        await transaction.send({ from, gas });

        // TODO maybe don’t ignore the return value?
        return new NormalResult();
    }

    async observe(observers: Iterable<Invocation>): Promise<Observation> {
        const operations: Promise<Operation>[] = [];

        for (const invocation of observers) {
            const operation = this.invokeReadOnly(invocation)
                .then(result => new Operation(invocation, result));
            operations.push(operation);
        }

        return new Observation(await Promise.all(operations));
    }

    handleErrors(e: any): Result {
        if (!isRuntimeError(e))
        throw e;

        const results = Object.values(e.results);
        if (results.length !== 1)
            throw Error(`Unexpected result count: ${results.length}`);

        const [ result ] = results;

        if (result.error !== 'revert')
            throw Error(`Unexpected error: ${result.error}`);

        const { error, reason } = result;
        return new ErrorResult(error, reason);
    }
}
