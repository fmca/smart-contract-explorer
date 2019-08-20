import { Address } from "../frontend/metadata";
import { Debugger } from '../utils/debug';
import { cross } from 'd3-array';
import { Mapping, getKeyTypesAndValueType, TypeName, isElementaryTypeName, ElementaryTypeName, ArrayTypeName, isArrayTypeName, ElementaryType } from "../solidity";

const debug = Debugger(__filename);

export type ElementaryValue = number | boolean | Address;
export type ArrayValue = ElementaryValue[];
export type Value = ElementaryValue | ArrayValue;

export type TypedElementaryValue = { type: ElementaryType, value: ElementaryValue };
export type TypedArrayValue = { length?: number, values: TypedValue[] };
export type TypedValue = TypedElementaryValue | TypedArrayValue;

interface Ary extends Array<UnparsedValue> { }
export type UnparsedValue = Ary | string;

export namespace Value {
    export function isTypedValue(v: any): v is TypedValue {
        return isElementaryValue(v) || isArrayValue(v);
    }

    export function isElementaryValue(v: TypedValue): v is TypedElementaryValue {
        return !isArrayValue(v);
    }

    export function isArrayValue(v: TypedValue): v is TypedArrayValue {
        return (v as any).values !== undefined;
    }

    export function encode(v: TypedValue): Value {
        debug(`encoding value: %o`, v);

        if (isElementaryValue(v))
            return v.value;

        if (isArrayValue(v)) {
            if (!v.values.every(isElementaryValue))
                throw Error(`TODO: encoding nested arrays`);

            return v.values.map(v => encode(v) as ElementaryValue);
        }

        throw Error(`Unexpected value: ${v}`);
    }

    export function parse(v: UnparsedValue, outputs: { name: string, type: string }[] | undefined): TypedValue[] {
        debug(`parsing values %o from %o`, v, outputs);

        if (outputs === undefined || outputs.length <= 0) {
            if (v !== undefined || v != null)
                throw Error(`Unexpected value: ${v}`);

            return [];
        }

        if (outputs.length > 1)
            throw Error(`TODO handle multiple return values`);

        return [parseValue(v, outputs[0].type)];
    }

    export function parseValue(v: UnparsedValue, type: string): TypedValue {
        debug(`parsing value %o of %o`, v, type);

        if (type.endsWith('[]')) {
            if (!Array.isArray(v))
                throw Error(`Expected array value, got: ${v}`);

            const values = v.map(v => parseValue(v, type.slice(0, -2)));
            return { values };
        }

        if (Array.isArray(v))
            throw Error(`Unexpected array value: ${v}`);

        if (type.match(/.*int.*|bool/)) {
            const value = JSON.parse(v) as number | boolean;
            const t = type as ElementaryType;
            return { value, type: t };
        }

        if (type === 'address') {
            const value = parseInt(v, 16);
            return { value, type };
        }

        throw Error(`Unexpected type: ${type}`);
    }

    export function elementary(value: ElementaryValue, type: ElementaryType): TypedElementaryValue {
        return { value, type };
    }

    export function array(...values: TypedValue[]): TypedArrayValue {
        return { values };
    }

    export function staticArray(length: number, ...values: TypedValue[]): TypedArrayValue {
        return { values, length };
    }

    export const int256 = (v: number) => elementary(v, 'int256');
    export const uint256 = (v: number) => elementary(v, 'uint256');

    export const int = (v: number) => elementary(v, 'int256');
    export const uint = (v: number) => elementary(v, 'uint256');

    export function toString(v: TypedValue): string {
        return isElementaryValue(v)
            ? (typeof(v.value) === 'string' ? v.value.substr(0, 8) : v.value.toString())
            : v.length === undefined
            ? `[${v.values.map(Value.toString).join(', ')}]`
            : `[${v.values.map(Value.toString).join(', ')}]`;
    }

    export function equals(v1: TypedValue, v2: TypedValue) {
        return JSON.stringify(v1) == JSON.stringify(v2);
    }
}

export namespace Values {
    export function toString(vs: TypedValue[]) {
        return vs.toString();
    }

    export function equals(vs1: TypedValue[], vs2: TypedValue[]) {
        return JSON.stringify(vs1) == JSON.stringify(vs2);
    }
}

export class ValueGenerator {
    constructor(public accounts: Address[]) { }

    * ofPayment(): Iterable<TypedElementaryValue> {
        const type = 'uint';
        for (const value of [0,1])
            yield { type, value };
    }

    * ofInt(): Iterable<TypedElementaryValue> {
        const type = 'int';

        for (const value of [0,1,-1,2,-2])
            yield { type, value };
    }

    * ofUint(): Iterable<TypedElementaryValue> {
        const type = 'uint';

        for (const value of [0,1,2])
            yield { type, value };
    }

    * ofBytes(bytesLength: number): Iterable<TypedElementaryValue> {
        const type = `bytes${bytesLength.toString}` as ElementaryType;
        const prefix = new Array(bytesLength).join( "00" );

        for (const value of [`0x${prefix}00`,`0x${prefix}01`,`0x${prefix}02`])
            yield { type, value };
    }

    * ofAddress(): Iterable<TypedElementaryValue> {
        // TODO: consider which accounts
        const type = 'address';

        for (const value of this.accounts.slice(0, 2))
            yield { type, value };
    }

    * ofBool(): Iterable<TypedElementaryValue> {
        const type = 'bool';

        for (const value of [true,false])
            yield { type, value };
    }

    * mapIndicies(mapping: Mapping): Iterable<TypedValue[]> {
        const { keyTypes } = getKeyTypesAndValueType(mapping);
        const keyValues = this.valuesOfTypes(keyTypes);

        for (const indicies of keyValues)
            yield indicies;
    }

    valuesOfType(typeName: TypeName): Iterable<TypedValue> {
        const { typeDescriptions: { typeString } } = typeName;
        debug(`typeName: %O`, typeName);

        if (isElementaryTypeName(typeName))
            return this.ofElementary(typeName);

        if (isArrayTypeName(typeName))
            return this.ofArray(typeName);

        throw Error(`unexpected type name: ${typeString}`);
    }

    * ofArray(typeName: ArrayTypeName): Iterable<TypedArrayValue> {
        const { length, baseType } = typeName;

        if (length !== null)
            throw Error(`TODO handle static arrays`);

        if (!isElementaryTypeName(baseType))
            throw Error(`TODO handle nested arrays`);

        for (const vs of this.valuesOfTypes([baseType])) {
            const values = vs as TypedElementaryValue[];
            yield { length: undefined, values };
        }
    }

    ofElementary(typeName: ElementaryTypeName): Iterable<TypedElementaryValue> {
        const { name: type } = typeName;

        if (type.match(/int\d*/))
            return this.ofInt();

        if (type.match(/uint\d*/))
            return this.ofUint();

        if (type === 'address')
            return this.ofAddress();

        if (type === 'bool')
            return this.ofBool();

        if (type.match(/bytes\d*/)) {
            const bytesLength = Number(type.split("s").pop());
            return this.ofBytes(bytesLength);
        }


        throw Error(`unexpected elementary type: ${type}`);
    }

    * valuesOfTypes(typeNames: TypeName[]): Iterable<TypedValue[]> {
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
