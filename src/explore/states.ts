import { Value } from './values';
import { Invocation } from './invocations';

export class Result {
    constructor(public values: Value[]) {}

    toString() {
        switch (this.values.length) {
        case 0:
            return `void`;
        case 1:
            return this.values[0].toString();
        default:
            return `(${this.values.join(', ')})`
        }
    }
};

export class Operation {
    constructor(public invocation: Invocation, public result: Result) {}

    toString() {
        return this.result.values.length < 1
            ? `${this.invocation}`
            : `${this.invocation} => ${this.result}`;
    }
}

export class Trace {
    constructor(public operations: Operation[]) {}

    toString() {
        return this.operations.length > 0
            ? this.operations.join("; ")
            : `@empty`;
    }

    static empty(): Trace {
        return new Trace([]);
    }
}

export class Observation {
    constructor(public operations: Operation[]) {}

    toString() {
        return this.operations.join(', ');
    }
}

export class State {
    constructor(public trace: Trace, public observation: Observation) {}

    toString() {
        return `[[ ${this.trace} : ${this.observation} ]]`;
    }

    static initial(observation: Observation): State {
        return new State(Trace.empty(), observation);
    }
}
