import { Debugger } from '../utils/debug';
import { Contract, Address } from '../frontend/metadata';
import { Result, Invocation, Observation, Operation, Trace, NormalResult, ErrorResult } from '../model';
import { isRuntimeError } from './errors';

const debug = Debugger(__filename);

export class ContractInstance {
    constructor(public contract: Promise<Contract>, public account: Address) { }

    async invokeSequence(invocations: Invocation[]): Promise<Result> {
        debug(`invoking sequence: %o`, invocations);
        const [ result ] = invocations.map(i => this.invoke(i)).slice(-1);
        return result;
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
        const contract = await this.contract;
        const { method, inputs } = invocation;
        const { name } = method;
        const from = this.account;

        debug(`invoking mutator method: %s`, invocation);

        const tx = contract.methods[name!](...inputs);
        const gas = await tx.estimateGas() * 10;

        debug(`sending transaction from %o with gas %o`, from, gas);
        await tx.send({ from, gas });

        // TODO maybe don’t ignore the return value?

        return new NormalResult();
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
