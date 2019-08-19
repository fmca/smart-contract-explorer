import { Value, TypedValue, Values } from './values';

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

    toString() {
        return `${this.error}(${this.reason || ''})`;
    }

    equals(that: Result): boolean {
        return that instanceof ErrorResult && this.error === that.error && this.reason === that.reason;
    }
}

export class NormalResult extends Result {
    public values: TypedValue[];

    constructor(value: TypedValue);
    constructor(...values: TypedValue[]);
    constructor(v: TypedValue | TypedValue[]) {
        super();
        this.values = v === undefined ? [] : (Array.isArray(v)) ? v : [v];
    }

    isVoid() {
        return this.values.length < 1;
    }

    toString() {
        return this.values.length > 1
            ? `(${this.values.map(Value.toString).join(', ')})`
            : Value.toString(this.values[0]);
    }

    equals(that: Result): boolean {
        return that instanceof NormalResult && Values.equals(this.values, that.values);
    }

    // static deserialize(obj: { [K in keyof Result]: Result[K] }): Result {
    //     const { values } = obj;
    //     return new Result(...values);
    // }
};
