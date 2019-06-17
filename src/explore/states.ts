import { Value } from './values';
import { Invocation } from './invocations';

export class Result {
    constructor(public outputs: Value[]) {}

    toString() {
        switch (this.outputs.length) {
        case 0:
            return `void`;
        case 1:
            return this.outputs[0].toString();
        default:
            return `(${this.outputs.map(toString).join(', ')})`
        }
    }
};

export class Operation {
    constructor(public invocation: Invocation, public result: Result) {}

    toString() {
        return `${this.invocation} => ${this.result}`;
    }
}

export class Trace {
    constructor(public operations: Operation[]) {}

    toString() {
        return this.operations.length > 0
            ? this.operations.join("; ")
            : `@empty`;
    }
}

export const emptyTrace: Trace = new Trace([]);

type Observation = {

};

export class State {
    constructor(public trace: Trace) {}

    toString() {
        return `[[ ${this.trace} ]]`;
    }
}
