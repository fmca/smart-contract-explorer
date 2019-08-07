import { Operation } from './operation';

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
