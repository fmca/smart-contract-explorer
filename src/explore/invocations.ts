import { Method, Metadata } from '../frontend/metadata';
import { Value, Values, ValueGenerator } from './values';

export class Invocation {
    constructor(public method: Method, public inputs: Value[]) {}

    toString() {
        return `${this.method.name}(${this.inputs.join(', ')})`;
    }

    equals(that: Invocation): boolean {
        return Method.equals(this.method, that.method)
            && Values.equals(this.inputs, that.inputs);
    }
}

export class InvocationGenerator {
    valueGenerator: ValueGenerator;

    constructor(public metadata: Metadata) {
        this.valueGenerator = new ValueGenerator();
    }

    * invocations(accept: (method: Method) => boolean): Iterable<Invocation> {
        const { abi } = this.metadata;
        for (const method of abi) {
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

function isMutator({ stateMutability }: Method): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
