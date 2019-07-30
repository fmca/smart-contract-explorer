import { Address } from "../frontend/metadata";
import { Debugger } from '../utils/debug';
import { cross } from 'd3-array';

const debug = Debugger(__filename);

export type Value = number | boolean | Address;

export namespace Value {
    export function toString(v: Value) {
        return v.toString();
    }

    export function equals(v1: Value, v2: Value) {
        return JSON.stringify(v1) == JSON.stringify(v2);
    }
}

export namespace Values {
    export function toString(vs: Value[]) {
        return vs.toString();
    }

    export function equals(vs1: Value[], vs2: Value[]) {
        return JSON.stringify(vs1) == JSON.stringify(vs2);
    }
}

export class ValueGenerator {
    constructor(public accounts: Address[]) { }

    * intValues(): Iterable<Value> {
        for (const v of [0,1,2])
            yield v;
    }

    * addressValues(): Iterable<Value> {
        // TODO: consider which accounts

        for (const account of this.accounts.slice(0, 2))
            yield account;
    }

    valuesOfType(type: string): Iterable<Value> {

        if (type.match(/u?int\d*/))
            return this.intValues();

        if (type === 'address')
            return this.addressValues();

        throw Error(`unexpected type: ${type}`);
    }

    * valuesOfTypes(types: string[]): Iterable<Value[]> {
        if (types.length === 0) {
            yield [];
            return;
        }

        const values = types.map(type => this.valuesOfType(type));

        for (const tuple of (cross as any)(...values)) {
            yield tuple;
        }
    }
}
