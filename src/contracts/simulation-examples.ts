import { Debugger } from '../utils/debug';
import { Metadata } from "../frontend/metadata";
import { SimulationExample } from "../simulation/examples";
import { isElementaryTypeName, VariableDeclaration, isMapping, isArrayTypeName, FunctionDefinition, ArrayTypeName, ElementaryTypeName, isNode } from "../solidity";
import { ValueGenerator, Value } from "../model/values";
import { Contract, block } from "./contract";
import { Operation } from '../model';
import { Unit } from '../frontend/unit';
import { PathElement, sumExpressionPaths } from '../simulation/accessors';

const debug = Debugger(__filename);

export class SimulationExamplesContract extends Contract {
    constructor(public source: Metadata, public target: Metadata,
            public unit: Unit,
            public examples: { positive: SimulationExample[], negative: SimulationExample[] },
            public values: ValueGenerator) {

        super(unit);
    }

    async getImports() {
        return [this.source.getSource().path, this.target.getSource().path];
    }

    async getParents() {
        return [] as string[];
    }

    async getSpec() {
        return [] as string[];
    }

    async getBody(): Promise<string[]> {
        const members: string[] = [];

        members.push(`${this.source.getName()} impl;`);
        members.push(`${this.target.getName()} spec;`);

        for (const examples of Object.values(this.examples)) {
            for (const example of examples) {
                const lines = this.getMethod(example);
                members.push(...lines);
            }
        }

        debug(`generated ${members.length - 2} example methods`);

        for (const metadata of [this.source, this.target]) {
            for (const lines of this.storageAccessorMethodDefinitions(metadata))
                members.push(...lines);

            for (const lines of this.sumAccessorMethodDefinitions(metadata))
                members.push(...lines);
        }

        return members.flat();
    }

    * sumAccessorMethodDefinitions(metadata: Metadata): Iterable<string[]> {
        for (const { elements, typeName } of sumExpressionPaths(metadata)) {
            const { source, name, expr, type } = this.sumAccessor(metadata, elements, typeName);
            const result = [...expr];
            result.splice(0, 1, `return ${expr[0]}`);
            result.splice(-1, 1, `${expr[expr.length-1]};`);
            yield [
                ``,
                `function ${name}() public view returns (${type}) {`,
                ...block(4)(...result),
                `}`
            ];
        }
    }

    * storageAccessorMethodDefinitions(metadata: Metadata): Iterable<string[]> {
        for (const { source, name, expr, type } of this.storageAccessors(metadata)) {
            const result = [...expr];
            result.splice(0, 1, `return ${expr[0]}`);
            result.splice(-1, 1, `${expr[expr.length-1]};`);
            yield [
                ``,
                `function ${metadata.name}$${name}() public view returns (${type}) {`,
                ...block(4)(...result),
                `}`
            ];
        }
    }

    * storageAccessors(metadata: Metadata) {
        for (const variable of metadata.getVariables()) {
            const target = variable.constant
                ? metadata.getName()
                : metadata === this.source ? 'impl' : 'spec';

            yield this.storageAccessor(target, variable);
        }
    }

    storageAccessor(source: string, variable: VariableDeclaration) {
        const { name, typeName } = variable;
        const { typeDescriptions: { typeString } } = typeName;
        debug(`storageAccessor for %o of type %O`, name, typeName);

        if (isElementaryTypeName(typeName))
            return { source, name, expr: [`${source}.${name}()`], type: typeName.name };

        if (isArrayTypeName(typeName)) {
            const fn = this.arrayAccessorFunctionName(typeName);
            const expr = [`${fn}(${source}.${name}, ${source}.${name}$length)`];
            if (!this.auxiliaryDefinitions.has(fn))
                this.auxiliaryDefinitions.set(fn, this.arrayAccessorFunction(typeName));
            return { source, name, expr, type: `${typeString} memory`};
        }

        if (isMapping(typeName)) {
            const keyLists = [...this.values.mapIndicies(typeName)];
            const values = keyLists.map(keys => `${source}.${name}(${keys.map(k => `${this.argument(k)}`).join(', ')})`);;
            const expr = [
                `keccak256(abi.encode(`,
                ...block(4)(...values.slice(0,-1).map(v => `${v},`), ...values.slice(-1)),
                `))`];
            const type = `bytes32`;
            return { source, name, expr, type };
        }

        throw Error(`Unexpected type name: ${typeString}`);
    }

    sumAccessor(metadata: Metadata, elements: PathElement[], typeName: ElementaryTypeName) {
        const path = elements.map(p => isNode(p) && isElementaryTypeName(p) ? p.name : p);
        const name = ['sum', metadata.name, ...path].join('$');
        const source = metadata === this.source ? 'impl' : 'spec';
        const indexTypes = elements.filter(p => typeof(p) !== 'string') as ElementaryTypeName[];
        const indexLists = this.values.valuesOfTypes(indexTypes);

        const expressions: string[] = [];
        for (const indexList of indexLists) {
            let expressionParts = [source];
            for (const elem of elements) {
                if (isNode(elem)) {
                    const typedValue = indexList.pop();
                    if (typedValue === undefined || !Value.isElementaryValue(typedValue))
                        throw Error(`!`);

                    expressionParts.push(`(${typedValue.value.toString()})`);

                } else {
                    expressionParts.push(`.${elem}`);
                }
            }
            expressions.push(expressionParts.join(''));
        }

        const expr = [
            ...block(4)(
                ...expressions.slice(0,-1).map(v => `${v} +`),
                ...expressions.slice(-1)
            ),
        ];
        const { name: type } = typeName;
        return { source, name, expr, type };
    }

    arrayAccessorFunctionName(typeName: ArrayTypeName): string {
        const { baseType } = typeName;

        if (!isElementaryTypeName(baseType))
            throw Error(`TODO nested arrays`);

        const { name }  = baseType;
        return `${name}$ary`;
    }

    arrayAccessorFunction(typeName: ArrayTypeName): string[] {
        const { baseType } = typeName;

        if (!isElementaryTypeName(baseType))
            throw Error(`TODO nested arrays`);

        const { name }  = baseType;
        return [
            ``,
            `function ${name}$ary(`,
            ...block(4)(
                `function(uint) external view returns (${name}) ary,`,
                `function() external view returns (uint) len`),
            `) public view returns (${name}[] memory) {`,
            ...block(4)(
                `${name}[] memory ret = new ${name}[](len());`,
                `for (uint i = 0; i < len(); i++)`,
                ...block(4)(`ret[i] = ary(i);`),
                `return ret;`
            ),
            `}`
        ];
    }

    getMethod(example: SimulationExample): string[] {
        const { source: { trace: { operations: sOps }},
                target: { trace: { operations: tOps }},
                id } = example;

        return [
            ``,
            `function ${id}() public {`,
            ...block(4)(
                ...sOps.map(o => this.call(o, 'impl', this.source.getName())),
                ...tOps.map(o => this.call(o, 'spec', this.target.getName())),
            ),
            `}`
        ];
    }

    call(operation: Operation, prefix: string, name: string): string {
        const { invocation: { method, inputs } } = operation;

        return FunctionDefinition.isConstructor(method)
            ? `${prefix} = ${this.constructorCall(operation, name)}`
            : this.lowLevelCall(operation, prefix);
    }
}
