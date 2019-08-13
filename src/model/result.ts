import { Value, Values } from './values';

export abstract class Result {
    abstract isVoid(): boolean;
    abstract equals(_: Result): boolean;
}

export class ErrorResult extends Result {
    constructor(public error: string, public reason: string | undefined = undefined) {
        super();
    }

    isVoid() {
        return false;
    }

    equals(that: Result): boolean {
        return that instanceof ErrorResult && this.error === that.error && this.reason === that.reason;
    }
}

export class NormalResult extends Result {
    public values: Value[];

    constructor(value: Value);
    constructor(...values: Value[]);
    constructor(v: Value | Value[]) {
        super();
        this.values = v === undefined ? [] : (Array.isArray(v)) ? v : [v];
    }

    isVoid() {
        return this.values.length > 0;
    }

    toString() {
        return Values.toString(this.values);
    }

    equals(that: Result): boolean {
        return that instanceof NormalResult && Values.equals(this.values, that.values);
    }

    // static deserialize(obj: { [K in keyof Result]: Result[K] }): Result {
    //     const { values } = obj;
    //     return new Result(...values);
    // }
};
