import { Address } from "../frontend/metadata";
import { Debugger } from '../utils/debug';

const debug = Debugger(__filename);

export type Value = number | boolean | Address;

export namespace Value {
    export function equals(v1: Value, v2: Value) {
        return v1 === v2;
    }
}

export namespace Values {
    export function equals(vs1: Value[], vs2: Value[]) {
        return vs1.length === vs2.length
            && vs1.every((v1,i) => Value.equals(v1, vs2[i]))
    }
}

export function valuesOf(x: any): Value[] {
    const intVal = parseInt(x);
    if (Number.isInteger(intVal))
        return [intVal];

    if (x === true || x === false)
        return [x];

    throw Error(`Unexpected value: ${x}`);
}

export class ValueGenerator {
    constructor(public accounts: Address[]) { }

    * intValues(): Iterable<Value> {
        for (const v of [0,1,2])
            yield v;
    }

    * addressValues(): Iterable<Value> {
        // TODO: consider which accounts

        for (const account of this.accounts.slice(0, 3))
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

        debug("types: %o", types);

        const values : Value[][] = [];
        var i;
        for (const type of types) {
            i = 0;
            for (const value of this.valuesOfType(type)) {
                if (values[i] === undefined) {
                    values[i] = []
                }
                values[i].push(value);
                i = i + 1;
            }
        }

        for (const value of values){
            debug(`value: %o`, value);
            yield value;
        }
    }




}


