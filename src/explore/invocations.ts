import { Method, Metadata, Address } from '../frontend/metadata';
import { Value, Values, ValueGenerator } from './values';

export class Invocation {
    public inputs: Value[];
    constructor(public method: Method, ...args: Value[]) {
        const { name, inputs } = method;
        const count = inputs === undefined ? 0 : inputs.length;
        if (args.length !== count)
            throw Error(`method ${name} requires ${count} parameters`);
        this.inputs = args;
    }

    toString() {
        return `${this.method.name}(${this.inputs.join(', ')})`;
    }

    equals(that: Invocation): boolean {
        return Method.equals(this.method, that.method)
            && Values.equals(this.inputs, that.inputs);
    }

    isMutator(): boolean {
        return isMutator(this.method);
    }

    static deserialize(obj: { [K in keyof Invocation]: Invocation[K] }): Invocation {
        const { method, inputs } = obj;
        return new Invocation(method, ...inputs);
    }
}

export class InvocationGenerator {
    valueGenerator: ValueGenerator;

    constructor(public metadata: Metadata, public accounts: Address[]) {
        this.valueGenerator = new ValueGenerator(accounts);
    }

    * invocationsWith(accept: (method: Method) => boolean): Iterable<Invocation> {
        const { abi } = this.metadata;
        for (const method of abi) {
            if (!accept(method))
                continue;

            if (method.type === 'constructor')
                continue;

            const types = method.inputs === undefined ? [] : method.inputs.map(m => m.type);
            for (const inputs of this.valueGenerator.valuesOfTypes(types)) {
                const invocation = new Invocation(method, ...inputs);
                yield invocation;
            }
        }
    }

    invocations(): Iterable<Invocation> {
        return this.invocationsWith(() => true);
    }

    mutators(): Iterable<Invocation> {
        return this.invocationsWith(isMutator);
    }

    observers(): Iterable<Invocation> {
        return this.invocationsWith(m => !isMutator(m));
    }
}

function isMutator({ stateMutability }: Method): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
