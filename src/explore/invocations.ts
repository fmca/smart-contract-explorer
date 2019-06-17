import { AbiItem } from 'web3-utils';

import { Value, ValueGenerator } from './values';
import { stat } from 'fs-extra';

export class Invocation {
    constructor(public method: AbiItem, public inputs: Value[]) {}

    toString() {
        return `${this.method.name}(${this.inputs.map(toString).join(', ')})`;
    }
}

export class InvocationGenerator {
    abi: Iterable<AbiItem>;
    valueGenerator: ValueGenerator;

    constructor(abi: Iterable<AbiItem>) {
        this.abi = abi;
        this.valueGenerator = new ValueGenerator();
    }

    * invocations(): Iterable<Invocation> {
        for (const method of this.abi) {
            if (!isMutator(method))
                continue;

            const types = method.inputs === undefined ? [] : method.inputs.map(m => m.type);
            for (const inputs of this.valueGenerator.valuesOfTypes(types)) {
                const invocation = new Invocation(method, inputs);
                yield invocation;
            }
        }
    }
}

function isMutator({ stateMutability }: AbiItem): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
