import { Value, Values } from './values';
import { Invocation } from './invocations';

export class Result {
    public values: Value[];

    constructor(value: Value);
    constructor(...values: Value[]);
    constructor(v: Value | Value[]) {
        this.values = (Array.isArray(v)) ? v : [v];
    }

    toString() {
        return Values.toString(this.values);
    }

    equals(that: Result): boolean {
        return Values.equals(this.values, that.values);
    }

    static deserialize(obj: { [K in keyof Result]: Result[K] }): Result {
        const { values } = obj;
        return new Result(...values);
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

    static deserialize(obj: { [K in keyof Operation]: Operation[K] }): Operation {
        const { invocation: i, result: r } = obj;
        const invocation = Invocation.deserialize(i);
        const result = Result.deserialize(r);
        return new Operation(invocation, result);
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

    static deserialize(obj: { [K in keyof Trace]: Trace[K] }): Trace {
        const { operations: ops } = obj;
        const operations = ops.map(Operation.deserialize);
        return new Trace(operations);
    }
}

export class Observation {
    constructor(public operations: Operation[]) {}

    toString() {
        return this.operations.join(', ');
    }

    equals(that: Observation): boolean {
        const map = new Map<string,string>();

        for (const { invocation, result } of this.operations)
            map.set(invocation.toString(), result.toString());

        for (const { invocation, result } of that.operations) {
            const r = map.get(invocation.toString())
            if (r !== undefined && r !== result.toString())
                return false;
        }

        return true;
    }

    static deserialize(obj: { [K in keyof Observation]: Observation[K] }): Observation {
        const { operations: ops } = obj;
        const operations = ops.map(Operation.deserialize);
        return new Observation(operations);
    }
}

export class State {
    constructor(public contractId: string, public trace: Trace,
        public observation: Observation) { }

    toString() {
        return `[[ ${this.trace} : ${this.observation} ]]`;
    }

    obsEquals(that: State) {
        return this.observation.equals(that.observation);
    }

    static initial(contractId: string, observation: Observation): State {
        return new State(contractId, Trace.empty(), observation);
    }

    static deserialize(obj: { [K in keyof State]: State[K] }): State {
        const { contractId, trace: t, observation: o } = obj;
        const trace = Trace.deserialize(t);
        const observation = Observation.deserialize(o);
        return new State(contractId, trace, observation);
    }
}
