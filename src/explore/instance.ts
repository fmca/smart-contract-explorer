import { Debugger } from '../utils/debug';
import { Transaction, DeployedContract } from '../utils/chain';
import { Address } from '../frontend/metadata';
import { Result, Invocation, Observation, Operation, NormalResult, ErrorResult, Value, TypedValue } from '../model';
import { isRuntimeError } from './errors';

const debug = Debugger(__filename);

export class ContractInstance {
    constructor(public contract: Promise<DeployedContract>, public account: Address) { }

    async invokeSequence(invocations: Invocation[]): Promise<void> {
        debug(`invoking sequence: %O`, invocations);
        const transactions = await Promise.all(invocations.map(this.getTransaction.bind(this)));
        const results = transactions.map(async t => {
            try {
                await t.send();
            } catch (e) {
                this.handleErrors(e);
            }
        });
        await results[results.length-1];
    }

    async invoke(invocation: Invocation): Promise<Result> {
        return await (invocation.isMutator()
            ? this.invokeMutator(invocation)
            : this.invokeReadOnly(invocation));
    }

    async invokeMutator(invocation: Invocation): Promise<Result> {
        debug(`invoking mutator method: %s`, invocation);
        try {
            const transaction = await this.getTransaction(invocation);
            await transaction.send();

            // TODO maybe don’t ignore the result?
            return new NormalResult();

        } catch (e) {
            return this.handleErrors(e);
        }
    }

    async invokeReadOnly(invocation: Invocation): Promise<Result> {
        debug(`invoking readonly method: %s`, invocation);
        try {
            const contract = await this.contract;
            const { method: { name }, inputs } = invocation;
            const values = inputs.map(Value.encode);
            const returns = await contract.callFunction<string>(name, ...values);
            debug(`return values: %o`, returns);
            const parsed = await this.readValues(name, returns);
            debug(`parsed values: %o`, parsed);
            const result = new NormalResult(...parsed);
            debug("result: %o", result);
            return result;

        } catch (e) {
            return this.handleErrors(e);
        }
    }

    async readValues(method: string, values: string): Promise<TypedValue[]> {
        const contract = await this.contract;
        const abi = contract.getABI().find(({ name }) => name === method);
        if (abi === undefined)
            throw Error(`Unknown method: ${method}`);
        const { outputs } = abi;
        return Value.parse(values, outputs);
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

    async getTransaction<T>(invocation: Invocation): Promise<Transaction<T>> {
        const contract = await this.contract;
        const { method: { name }, inputs } = invocation;
        const values = inputs.map(Value.encode);
        return contract.getTransaction(this.account, name, ...values);
    }

    handleErrors(e: any): Result {
        debug(`caught: %O`, e);

        if (!isRuntimeError(e))
            throw Error(`Unexpected error: ${e}`);

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
