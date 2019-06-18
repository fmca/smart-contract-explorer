import { AbiItem } from 'web3-utils';

import { Value, ValueGenerator } from './values';

export class Invocation {
    constructor(public method: AbiItem, public inputs: Value[]) {}

    toString() {
        return `${this.method.name}(${this.inputs.join(', ')})`;
    }
}

export class InvocationGenerator {
    abi: Iterable<AbiItem>;
    valueGenerator: ValueGenerator;

    constructor(abi: Iterable<AbiItem>) {
        this.abi = abi;
        this.valueGenerator = new ValueGenerator();
    }

    * invocations(accept: (method: AbiItem) => boolean): Iterable<Invocation> {
        for (const method of this.abi) {
            if (!accept(method))
                continue;

            const types = method.inputs === undefined ? [] : method.inputs.map(m => m.type);
            for (const inputs of this.valueGenerator.valuesOfTypes(types)) {
                const invocation = new Invocation(method, inputs);
                yield invocation;
            }
        }
    }

    mutators(): Iterable<Invocation> {
        return this.invocations(isMutator);
    }

    observers(): Iterable<Invocation> {
        return this.invocations(m => !isMutator(m));
    }
}

function isMutator({ stateMutability }: AbiItem): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
