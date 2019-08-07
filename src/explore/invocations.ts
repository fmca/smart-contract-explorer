import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import { Method, Address } from '../frontend/metadata';
import { Value, Values, ValueGenerator } from './values';
import { FunctionDefinition } from '../solidity';

export class Invocation {
    public inputs: Value[];
    constructor(public method: FunctionDefinition, ...args: Value[]) {
        const { name, parameters: { parameters } } = method;
        const count = parameters.length;
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

    constructor(public methods: FunctionDefinition[], public accounts: Address[]) {
        this.valueGenerator = new ValueGenerator(accounts);
    }

    * invocationsWith(accept: (_: FunctionDefinition) => boolean): Iterable<Invocation> {
        for (const method of this.methods) {
            if (!accept(method))
                continue;

            // ignore constructors
            if (method.name === '')
                continue;

            if (method.visibility === 'private')
                continue;

            const types = method.parameters.parameters.map(({ typeName }) => typeName);

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

function isMutator({ stateMutability }: FunctionDefinition): boolean {
    return stateMutability == undefined
        || !['pure', 'view'].includes(stateMutability);
}
