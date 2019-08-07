import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import {  Address } from '../frontend/metadata';
import { ValueGenerator } from './values';
import { FunctionDefinition } from '../solidity';
import { Invocation } from './invocations';

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
        return this.invocationsWith(FunctionDefinition.isMutator);
    }

    observers(): Iterable<Invocation> {
        return this.invocationsWith(m => !FunctionDefinition.isMutator(m));
    }
}
