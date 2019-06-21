import { ContractCreator } from "./creator";

export type Value = number;

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
    if (intVal !== undefined)
        return [intVal];

    throw Error(`Unexpected value: ${x}`);
}

export class ValueGenerator {
    constructor(public creator: ContractCreator) { }

    async * valuesOfType(type: string): AsyncIterable<Value> {

        if (type.match(/int\d*/)) {
            for (const v of [0,1,2])
                yield v;
            return;
        }

        if (type === 'address') {
            const accounts = await this.creator.getAccounts();
            for (const account of accounts.slice(0, 2))
                /* yield account */ ;

            throw Error(`TODO generate address values`);
        }

        throw Error(`unexpected type: ${type}`);
    }

    async * valuesOfTypes(types: string[]): AsyncIterable<Value[]> {
        if (types.length === 0) {
            yield [];
            return;
        }

        if (types.length !== 1)
            throw Error(`unexpected arity: ${types.length}`);

        const [ type ] = types;

        for await (const value of this.valuesOfType(type))
            yield [value];
    }
}
