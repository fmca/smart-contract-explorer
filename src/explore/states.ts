import { Value, Values } from './values';
import { Invocation } from './invocations';
import { Metadata } from '../frontend/metadata';

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

    equals(that: Result): boolean {
        return Values.equals(this.values, that.values);
    }
};

export class Operation {
    constructor(public invocation: Invocation, public result: Result) {}

    toString() {
        return this.result.values.length < 1
            ? `${this.invocation}`
            : `${this.invocation} => ${this.result}`;
    }

    equals(that: Operation): boolean {
        return this.invocation.equals(that.invocation)
            && this.result.equals(that.result);
    }
}

export class Trace {
    constructor(public operations: Operation[]) {}

    toString() {
        return this.operations.length > 0
            ? this.operations.join("; ")
            : `@empty`;
    }

    equals(that: Trace): boolean {
        return this.operations.length === that.operations.length
            && this.operations.every((o1,i) => o1.equals(that.operations[i]));
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

    equals(that: Observation): boolean {
        return this.operations.length === that.operations.length
            && this.operations.every((o1,i) => o1.equals(that.operations[i]));
    }
}

export class State {
    constructor(public metadata: Metadata, public address: string,
        public trace: Trace, public observation: Observation) {}

    toString() {
        return `[[ ${this.trace} : ${this.observation} ]]`;
    }

    obsEqual(that: State) {
        return this.observation.equals(that.observation);
    }

    static initial(metadata: Metadata, address: string, observation: Observation): State {
        return new State(metadata, address, Trace.empty(), observation);
    }
}
