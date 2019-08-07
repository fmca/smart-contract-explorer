import { Invocation } from './invocations';
import { Result } from './result';

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
