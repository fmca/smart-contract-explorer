import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import { Method } from '../frontend/metadata';
import { Value, Values } from './values';
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
        return FunctionDefinition.isMutator(this.method);
    }

    static deserialize(obj: { [K in keyof Invocation]: Invocation[K] }): Invocation {
        const { method, inputs } = obj;
        return new Invocation(method, ...inputs);
    }
}
