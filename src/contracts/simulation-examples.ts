import { Debugger } from '../utils/debug';
import { Metadata } from "../frontend/metadata";
import { AbstractExample, SimulationExample, AbstractExamples } from "../simulation/examples";
import { isElementaryTypeName, VariableDeclaration, isMapping, TypeName, isIntegerType, isArrayTypeName, isUserDefinedTypeName, FunctionDefinition, ArrayTypeName } from "../solidity";
import { ValueGenerator } from "../model/values";
import { Contract, ContractInfo, block } from "./contract";
import { type } from "../sexpr/pie";
import { Operation } from '../model';

const debug = Debugger(__filename);

export class SimulationExamplesContract extends Contract {
    examples?: (SimulationExample & AbstractExample)[];

    constructor(public source: Metadata, public target: Metadata,
            public info: ContractInfo,
            public generator: () => AsyncIterable<SimulationExample>,
            public values: ValueGenerator) {

        super(info);
    }

    async getImports() {
        return [this.source.source.path, this.target.source.path];
    }

    async getParents() {
        return [] as string[];
    }

    async getSpec() {
        return [] as string[];
    }

    async getExamples(): Promise<(SimulationExample & AbstractExample)[]> {
        if (this.examples !== undefined)
            return this.examples;

        this.examples = [];
        const { path } = this.info;
        const counts = { positive: 0, negative: 0 };

        for await (const example of this.generator()) {
            const { kind } = example;
            const method = `${kind}Example${counts[kind]++}`;
            const abstract = { id: { contract: path, method }};
            this.examples.push({ ...example, ...abstract });
        }
        return this.examples;
    }

    async getAbstractExamples(): Promise<AbstractExamples> {
        const examples = await this.getExamples();
        const positive = examples.filter(e => e.kind === 'positive').map(({ id }) => ({ id }));
        const negative = examples.filter(e => e.kind === 'negative').map(({ id }) => ({ id }));
        return { positive, negative };
    }

    async getBody(): Promise<string[]> {
        const members: string[] = [];

        members.push(`${this.source.name} impl;`);
        members.push(`${this.target.name} spec;`);

        for await (const example of await this.getExamples()) {
            const { method } = example.id;
            const lines = this.getMethod(example, method);
            members.push(...lines);
        }

        for (const metadata of [this.source, this.target])
            for (const lines of this.storageAccessorMethodDefinitions(metadata))
                members.push(...lines);

        return members.flat();
    }

    * storageAccessorsForPie(): Iterable<string> {
        for (const metadata of [this.source, this.target]) {
            for (const variable of metadata.getVariables()) {
                if (variable.constant)
                    continue;

                const { name, typeName } = variable;
                const { typeDescriptions: { typeString } } = typeName;
                debug(`storageAccessorForPie for %o of type %O`, name, typeName);

                const prefix = `${metadata.name}$${name}`;

                yield `${prefix}: ${type(typeName)}`;

                if (isMapping(typeName)) {
                    for (const path of this.storageAccessorPaths(prefix, variable.typeName, metadata)) {
                        debug(`path: %o`, path);
                        yield path;
                    }
                }
            }
        }
    }

    * storageAccessorPaths(prefix: string, typeName: TypeName, metadata: Metadata): Iterable<string> {
        const { typeDescriptions: { typeString } } = typeName;

        if (isElementaryTypeName(typeName)) {
            if (isIntegerType(typeName.name))
                yield `${prefix}: ${type(typeName)}`;

            return;
        }

        if (isUserDefinedTypeName(typeName)) {
            const { name } = typeName;

            const decl = metadata.findStruct(name);

            if (decl === undefined)
                throw Error(`Unknown struct name: ${name}`);

            for (const { name, typeName } of decl.members)
                for (const path of this.storageAccessorPaths(`${prefix}.${name}`, typeName, metadata))
                    yield path;

            return;
        }

        if (isMapping(typeName)) {
            const { keyType, valueType } = typeName;

            if (!isElementaryTypeName(keyType))
                throw Error(`Unexpected type name: ${keyType}`);

            for (const path of this.storageAccessorPaths(`${prefix}[__verifier_idx_${keyType.name}]`, valueType, metadata))
                yield path;

            return;
        }

        throw Error(`Unexpected type: ${typeString}`);
    }

    * storageAccessorMethodDefinitions(metadata: Metadata): Iterable<string[]> {
        for (const { source, name, expr, type } of this.storageAccessors(metadata))
            yield [
                ``,
                `function ${source}$${name}() public view returns (${type}) {`,
                ...block(4)(`return ${expr};`),
                `}`
            ];
    }

    * storageAccessors(metadata: Metadata) {
        for (const variable of metadata.getVariables()) {
            const target = variable.constant
                ? metadata.name
                : metadata === this.source ? 'impl' : 'spec'

            if (isMapping(variable.typeName) &&
                !isElementaryTypeName(variable.typeName.valueType)) {

                console.error(`Warning: did not generate accessor for mapping: ${variable.name}`);
                continue;
            }

            yield this.storageAccessor(target, variable);
        }
    }

    storageAccessor(source: string, variable: VariableDeclaration) {
        const { name, typeName } = variable;
        const { typeDescriptions: { typeString } } = typeName;
        debug(`storageAccessor for %o of type %O`, name, typeName);

        if (isElementaryTypeName(typeName))
            return { source, name, expr: `${source}.${name}()`, type: typeName.name };

        if (isArrayTypeName(typeName)) {
            const fn = this.arrayAccessorFunctionName(typeName);
            const expr = `${fn}(${source}.${name}, ${source}.${name}$length)`;
            if (!this.auxiliaryDefinitions.has(fn))
                this.auxiliaryDefinitions.set(fn, this.arrayAccessorFunction(typeName));
            return { source, name, expr, type: `${typeString} memory`};
        }

        if (isMapping(typeName)) {
            const { valueType } = typeName;
            const idxss = [...this.values.mapIndicies(typeName)];
            const elems = idxss.map(idxs => `${source}.${name}${idxs.map(i => `(${this.argument(i)})`).join('')}`);;
            const expr = `keccak256(abi.encode(${elems.join(', ')}))`;
            const type = `bytes32`;
            return { source, name, expr, type };
        }

        throw Error(`Unexpected type name: ${typeString}`);
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

    getMethod(example: SimulationExample, name: string): string[] {
        const { source: { trace: { operations: sOps }},
                target: { trace: { operations: tOps }} } = example;

        return [
            ``,
            `function ${name}() public {`,
            ...block(4)(
                ...sOps.map(o => this.call(o, 'impl', this.source.name)),
                ...tOps.map(o => this.call(o, 'spec', this.target.name)),
            ),
            `}`
        ];
    }

    call(operation: Operation, prefix: string, name: string): string {
        const { invocation: { method, inputs } } = operation;

        return FunctionDefinition.isConstructor(method)
            ? `${prefix} = ${this.constructorCall(operation, name)}`
            : this.methodCall(operation, prefix);
    }
}
