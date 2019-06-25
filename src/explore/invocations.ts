import { Method, Metadata } from '../frontend/metadata';
import { Value, Values, ValueGenerator } from './values';
import { ContractCreator } from './creator';

export class Invocation {
    constructor(public method: Method, public inputs: Value[]) {}

    toString() {
        return `${this.method.name}(${this.inputs.join(', ')})`;
    }

    equals(that: Invocation): boolean {
        return Method.equals(this.method, that.method)
            && Values.equals(this.inputs, that.inputs);
    }

    static deserialize(obj: { [K in keyof Invocation]: Invocation[K] }): Invocation {
        const { method, inputs } = obj;
        return new Invocation(method, inputs);
    }
}

export class InvocationGenerator {
    valueGenerator: ValueGenerator;

    constructor(public metadata: Metadata, public creator: ContractCreator) {
        this.valueGenerator = new ValueGenerator(creator);
    }

    async * invocationsWith(accept: (method: Method) => boolean): AsyncIterable<Invocation> {
        const { abi } = this.metadata;
        for (const method of abi) {
            if (!accept(method))
                continue;

            const types = method.inputs === undefined ? [] : method.inputs.map(m => m.type);
            for await (const inputs of this.valueGenerator.valuesOfTypes(types)) {
                const invocation = new Invocation(method, inputs);
                yield invocation;
            }
        }
    }

    invocations(): AsyncIterable<Invocation> {
        return this.invocationsWith(() => true);
    }

    mutators(): AsyncIterable<Invocation> {
        return this.invocationsWith(isMutator);
    }

    observers(): AsyncIterable<Invocation> {
        return this.invocationsWith(m => !isMutator(m));
    }
}

function isMutator({ stateMutability }: Method): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
