import { Value, Values } from './values';

export class Result {
    public values: Value[];

    constructor(value: Value);
    constructor(...values: Value[]);
    constructor(v: Value | Value[]) {
        this.values = v === undefined ? [] : (Array.isArray(v)) ? v : [v];
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
