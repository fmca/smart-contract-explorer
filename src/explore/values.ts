
export type Value = number;

export class ValueGenerator {
    * valuesOfType(type: string): Iterable<Value> {
        yield 0;
    }

    * valuesOfTypes(types: string[]): Iterable<Value[]> {
        yield types.map(_ => 0);
    }
}
