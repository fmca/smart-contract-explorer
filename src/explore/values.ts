
export type Value = number;

export function valuesOf(x: any): Value[] {
    if (x !== undefined && x._hex !== undefined)
        return [parseInt(x._hex)];

    throw Error(`Unexpected value: ${x}`);
}

export class ValueGenerator {
    * valuesOfType(type: string): Iterable<Value> {
        yield 0;
    }

    * valuesOfTypes(types: string[]): Iterable<Value[]> {
        yield types.map(_ => 0);
    }
}
