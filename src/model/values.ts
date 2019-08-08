import { Address } from "../frontend/metadata";
import { Debugger } from '../utils/debug';
import { cross } from 'd3-array';
import { Mapping, isMapping, getKeyTypesAndValueType, TypeName, isElementaryTypeName } from "../solidity";

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

    * bytesValues(): Iterable<Value> {
        for (const v of ["0x00000000","0x00000001","0x00000002"])
            yield v;
    }

    * addressValues(): Iterable<Value> {
        // TODO: consider which accounts

        for (const account of this.accounts.slice(0, 2))
            yield account;
    }

    * boolValues(): Iterable<Value> {
        for (const v of [true,false])
            yield v;
    }

    * mapIndicies(mapping: Mapping): Iterable<Value[]> {
        const { keyTypes } = getKeyTypesAndValueType(mapping);
        const keyValues = this.valuesOfTypes(keyTypes);

        for (const indicies of keyValues)
            yield indicies;
    }

    valuesOfType(typeName: TypeName): Iterable<Value> {
        if (!isElementaryTypeName(typeName))
            throw Error(`expected elementary type, but got: ${typeName}`);

        const { name: type } = typeName;

        if (type.match(/u?int\d*/))
            return this.intValues();

        if (type === 'address')
            return this.addressValues();

        if (type === 'bool')
            return this.boolValues();

        if (type.match(/bytes\d*/))
            return this.bytesValues();

        throw Error(`unexpected type: ${type}`);
    }

    * valuesOfTypes(typeNames: TypeName[]): Iterable<Value[]> {
        if (typeNames.length === 0) {
            yield [];
            return;
        }

        const values = typeNames.map(t => this.valuesOfType(t));

        for (const tuple of (cross as any)(...values)) {
            yield tuple;
        }
    }
}
