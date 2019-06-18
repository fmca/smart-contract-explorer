
export type Value = number;

export function valuesOf(x: any): Value[] {
    if (x !== undefined && x._hex !== undefined)
        return [parseInt(x._hex)];

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
