import { Address } from "../frontend/metadata";
import { Debugger } from '../utils/debug';
import { cross } from 'd3-array';
import { Mapping, getKeyTypesAndValueType, TypeName, isElementaryTypeName, ElementaryTypeName, ArrayTypeName, isArrayTypeName, ElementaryType } from "../solidity";

const debug = Debugger(__filename);

export type ElementaryValue = { type: ElementaryType, value: number | boolean | Address };
export type ArrayValue = { length?: number, values: Value[] };
export type Value = ElementaryValue | ArrayValue;

export namespace Value {
    export function isElementaryValue(v: Value): v is ElementaryValue {
        return !isArrayValue(v);
    }

    export function isArrayValue(v: Value): v is ArrayValue {
        return (v as any).values !== undefined;
    }

    export function encode(v: Value): number | boolean | Address {
        if (isElementaryValue(v))
            return v.value;

        throw Error(`Unexpected value: ${v}`);
    }

    export function parse(v: string, outputs: { name: string, type: string }[] | undefined): Value[] {
        debug(`parsing %o from %o`, v, outputs);

        if (outputs === undefined || outputs.length <= 0) {
            if (v.trim() !== '')
                throw Error(`Unexpected value string: ${v}`);

            return [];
        }

        if (outputs.length > 1)
            throw Error(`TODO handle multiple return values`);

        return [parseValue(v, outputs[0].type)];
    }

    export function parseValue(v: string, type: string): Value {
        if (type === 'int256') {
            const value = parseInt(v);
            return { type, value };
        }

        throw Error(`Unexpected type: ${type}`);
    }

    export function toString(v: Value): string {
        return isElementaryValue(v)
            ? v.value.toString()
            : v.length === undefined
            ? `[${v.values.map(Value.toString).join(', ')}]`
            : `[${v.values.map(Value.toString).join(', ')}]`;
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

    * ofInt(): Iterable<ElementaryValue> {
        const type = 'int';

        for (const value of [0,1,2])
            yield { type, value };
    }

    * ofBytes(): Iterable<ElementaryValue> {
        const type = 'bytes';

        for (const value of ["0x00000000","0x00000001","0x00000002"])
            yield { type, value };
    }

    * ofAddress(): Iterable<ElementaryValue> {
        // TODO: consider which accounts
        const type = 'address';

        for (const value of this.accounts.slice(0, 2))
            yield { type, value };
    }

    * ofBool(): Iterable<ElementaryValue> {
        const type = 'bool';

        for (const value of [true,false])
            yield { type, value };
    }

    * mapIndicies(mapping: Mapping): Iterable<Value[]> {
        const { keyTypes } = getKeyTypesAndValueType(mapping);
        const keyValues = this.valuesOfTypes(keyTypes);

        for (const indicies of keyValues)
            yield indicies;
    }

    valuesOfType(typeName: TypeName): Iterable<Value> {
        const { typeDescriptions: { typeString } } = typeName;
        debug(`typeName: %O`, typeName);

        if (isElementaryTypeName(typeName))
            return this.ofElementary(typeName);

        if (isArrayTypeName(typeName))
            return this.ofArray(typeName);

        throw Error(`unexpected type name: ${typeString}`);
    }

    * ofArray(typeName: ArrayTypeName): Iterable<ArrayValue> {
        const { length, baseType } = typeName;

        if (length !== null)
            throw Error(`TODO handle static arrays`);

        if (!isElementaryTypeName(baseType))
            throw Error(`TODO handle nested arrays`);

        for (const vs of this.valuesOfTypes([baseType])) {
            const values = vs as ElementaryValue[];
            yield { length: undefined, values };
        }
    }

    ofElementary(typeName: ElementaryTypeName): Iterable<ElementaryValue> {
        const { name: type } = typeName;

        if (type.match(/u?int\d*/))
            return this.ofInt();

        if (type === 'address')
            return this.ofAddress();

        if (type === 'bool')
            return this.ofBool();

        if (type.match(/bytes\d*/))
            return this.ofBytes();

        throw Error(`unexpected elementary type: ${type}`);
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
