import { ABIDefinition } from 'web3/eth/abi';

import { Value, ValueGenerator } from './values';

export class Invocation {
    constructor(public method: ABIDefinition, public inputs: Value[]) {}

    toString() {
        return `${this.method.name}(${this.inputs.join(', ')})`;
    }
}

export class InvocationGenerator {
    abi: Iterable<ABIDefinition>;
    valueGenerator: ValueGenerator;

    constructor(abi: Iterable<ABIDefinition>) {
        this.abi = abi;
        this.valueGenerator = new ValueGenerator();
    }

    * invocations(accept: (method: ABIDefinition) => boolean): Iterable<Invocation> {
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

function isMutator({ stateMutability }: ABIDefinition): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
