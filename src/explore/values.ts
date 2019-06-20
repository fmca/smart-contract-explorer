
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
    * valuesOfType(type: string): Iterable<Value> {

        if (type.match(/int\d*/)) {
            for (const v of [0,1,2])
                yield v;
            return;
        }

        throw Error(`unexpected type: ${type}`);
    }

    * valuesOfTypes(types: string[]): Iterable<Value[]> {
        if (types.length !== 1)
            throw Error(`unexpected arity: ${types.length}`);

        const [ type ] = types;

        for (const value of this.valuesOfType(type))
            yield [value];
    }
}
