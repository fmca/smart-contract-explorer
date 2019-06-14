import { AbiItem } from 'web3-utils';

import { Value, ValueGenerator } from './values';

export type Invocation = {
    method: AbiItem;
    inputs: Value[];
};

export class InvocationGenerator {
    abi: Iterable<AbiItem>;
    valueGenerator: ValueGenerator;

    constructor(abi: Iterable<AbiItem>) {
        this.abi = abi;
        this.valueGenerator = new ValueGenerator();
    }

    * invocations(): Iterable<Invocation> {
        for (const method of this.abi) {
            const types = method.inputs === undefined ? [] : method.inputs.map(m => m.type);
            for (const inputs of this.valueGenerator.valuesOfTypes(types)) {
                const invocation = { method, inputs };
                yield invocation;
            }
        }
    }
}
