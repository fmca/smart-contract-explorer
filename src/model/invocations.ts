import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import { Method } from '../frontend/metadata';
import { TypedValue, Value, Values } from './values';
import { FunctionDefinition } from '../solidity';

export class Invocation {
    public inputs: TypedValue[];
    public value: number | undefined;

    constructor(method: FunctionDefinition, ...args: TypedValue[]);
    constructor(method: FunctionDefinition, value: number, ...args: TypedValue[]);

    constructor(public method: FunctionDefinition, ...valueAndArgs: (number | TypedValue)[]) {
        const { name, parameters: { parameters } } = method;
        const count = parameters.length;

        if (valueAndArgs.length > 0 && typeof(valueAndArgs[0]) === 'number') {
            const [ value, ...args ] = valueAndArgs;
            this.value = value;
            valueAndArgs = args;
        }

        if (!valueAndArgs.every(Value.isTypedValue))
            throw Error(`Unexpected values: ${valueAndArgs}`);

        if (valueAndArgs.length !== count)
            throw Error(`method ${name} requires ${count} parameters`);

        this.inputs = valueAndArgs as TypedValue[];
    }

    toString() {
        const name = this.isConstructor() ? 'constructor' : this.method.name;
        return `${name}(${this.inputs.map(Value.toString).join(', ')})`;
    }

    equals(that: Invocation): boolean {
        return Method.equals(this.method, that.method)
            && Values.equals(this.inputs, that.inputs);
    }

    isConstructor(): boolean {
        return FunctionDefinition.isConstructor(this.method);
    }

    isMutator(): boolean {
        return FunctionDefinition.isMutator(this.method);
    }

    // static deserialize(obj: { [K in keyof Invocation]: Invocation[K] }): Invocation {
    //     const { method, inputs } = obj;
    //     return new Invocation(method, ...inputs);
    // }
}
