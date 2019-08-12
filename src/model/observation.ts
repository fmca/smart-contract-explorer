import { Operation } from './operation';

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

    // static deserialize(obj: { [K in keyof Observation]: Observation[K] }): Observation {
    //     const { operations: ops } = obj;
    //     const operations = ops.map(Operation.deserialize);
    //     return new Observation(operations);
    // }
}
