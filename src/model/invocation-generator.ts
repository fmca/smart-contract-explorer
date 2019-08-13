import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import {  Address } from '../frontend/metadata';
import { ValueGenerator } from './values';
import { FunctionDefinition, node } from '../solidity';
import { Invocation } from './invocations';

export class InvocationGenerator {
    valueGenerator: ValueGenerator;

    constructor(public methods: FunctionDefinition[], public accounts: Address[]) {
        this.valueGenerator = new ValueGenerator(accounts);
    }

    * invocationsWith(accept: (_: FunctionDefinition) => boolean): Iterable<Invocation> {
        for (const method of this.methods) {
            debug(`considering method: %o`, method.name);

            if (!accept(method))
                continue;

            if (method.visibility === 'private')
                continue;

            const types = method.parameters.parameters.map(({ typeName }) => typeName);

            debug(`parameter types: %O`, types);

            for (const inputs of this.valueGenerator.valuesOfTypes(types)) {
                const invocation = new Invocation(method, ...inputs);

                debug(`invocation: %s`, invocation);
                yield invocation;
            }
        }
    }

    invocations(): Iterable<Invocation> {
        return this.invocationsWith(() => true);
    }

    constructors(): Iterable<Invocation> {
        if (!this.methods.some(FunctionDefinition.isConstructor))
            return [new Invocation(FunctionDefinition.get('', 'constructor'))];

        return this.invocationsWith(FunctionDefinition.isConstructor);
    }

    mutators(): Iterable<Invocation> {
        return this.invocationsWith(FunctionDefinition.isMutator);
    }

    observers(): Iterable<Invocation> {
        return this.invocationsWith(FunctionDefinition.isReadOnly);
    }
}
