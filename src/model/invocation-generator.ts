import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import {  Address } from '../frontend/metadata';
import { ValueGenerator, TypedValue } from './values';
import { FunctionDefinition, TypeName } from '../solidity';
import { Invocation } from './invocations';

export type Kind = 'constructor' | 'observer' | 'mutator';

export interface FunctionProvider {
    getFunctions(): Iterable<FunctionDefinition>;
}

export class InvocationGenerator {
    valueGenerator: ValueGenerator;
    methods: FunctionDefinition[];

    constructor(metadata: FunctionProvider, public accounts: Address[]) {
        this.valueGenerator = new ValueGenerator(accounts);
        this.methods = [...metadata.getFunctions()];

        if (!this.methods.some(FunctionDefinition.isConstructor))
            this.methods.push(FunctionDefinition.get('', 'constructor'));
    }

    * getInvocations(kind?: Kind) {
        debug(`getInvocations(%o)`, kind || 'any');

        for (const method of this.methods) {
            if (!this.accept(method, kind))
                continue;

            for (const invocation of this.fromMethod(method)) {
                debug(`invocation: %s`, invocation);
                yield invocation;
            }
        }
    }

    accept(method: FunctionDefinition, kind?: Kind) {
        const result = (method.visibility !== 'private') && (
            kind === 'observer' && FunctionDefinition.isReadOnly(method)
            || kind === 'mutator' && FunctionDefinition.isMutator(method)
            || kind === 'constructor' && FunctionDefinition.isConstructor(method)
            || kind === undefined && (FunctionDefinition.isReadOnly(method) || FunctionDefinition.isMutator(method))
        );

        debug(`accept(%o, %o}): %o`, method.name, kind || 'any', result);
        return result;
    }

    fromMethod(method: FunctionDefinition) {
        const generator = new PerMethodInvocationGenerator(method, this.valueGenerator);
        return generator.getInvocations();
    }

    invocations() { return this.getInvocations(); }
    constructors() { return this.getInvocations('constructor'); }
    mutators() { return this.getInvocations('mutator'); }
    observers() { return this.getInvocations('observer'); }
}

class PerMethodInvocationGenerator {
    constructor(public method: FunctionDefinition, public valueGenerator: ValueGenerator) { }

    getInvocations() {
        const { parameters: { parameters }} = this.method;
        const types = parameters.map(({ typeName }) => typeName);
        return this.fromTypes(types);
    }

    * fromTypes(types: TypeName[]) {
        debug(`fromTypes(%O)`, types);
        for (const inputs of this.valueGenerator.valuesOfTypes(types))
            for (const invocation of this.fromInputs(inputs))
                yield invocation;
    }

    * fromInputs(inputs: TypedValue[]) {
        debug(`fromInputs(%O)`, inputs);
        const { stateMutability } = this.method;

        if (stateMutability === 'payable') {
            for (const invocation of this.fromInputsWithPayment(inputs)) {
                yield invocation;
            }

        } else {
            const invocation = new Invocation(this.method, ...inputs);
            yield invocation;
        }
    }

    * fromInputsWithPayment(inputs: TypedValue[]) {
        for (const { value } of this.valueGenerator.ofPayment()) {
            if (typeof(value) !== 'number')
                throw Error(`Expected numeric payment value`);

            const invocation = new Invocation(this.method, value, ...inputs);
            yield invocation;
        }
    }
}
