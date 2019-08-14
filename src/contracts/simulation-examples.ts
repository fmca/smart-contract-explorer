import { Debugger } from '../utils/debug';
import { Metadata } from "../frontend/metadata";
import { AbstractExample, SimulationExample, AbstractExamples } from "../simulation/examples";
import { isElementaryTypeName, VariableDeclaration, isMapping, TypeName, isIntegerType, isArrayTypeName, isUserDefinedTypeName } from "../solidity";
import { ValueGenerator } from "../model/values";
import { ProductContract } from "./product";
import { Contract, ContractInfo, block } from "./contract";
import { type } from "../sexpr/pie";

const debug = Debugger(__filename);

export class SimulationExamplesContract extends ProductContract {
    examples?: (SimulationExample & AbstractExample)[];

    constructor(public source: Metadata, public target: Metadata,
            public info: ContractInfo,
            public generator: () => AsyncIterable<SimulationExample>,
            public values: ValueGenerator) {

        super(source, target, info);
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
        const methods: string[][] = [];

        for await (const example of await this.getExamples()) {
            const { method } = example.id;
            const lines = this.getMethod(example, method);
            methods.push(lines);
        }

        for (const metadata of [this.source, this.target])
            for (const lines of this.storageAccessorMethodDefinitions(metadata))
                methods.push(lines);

        return methods.flat();
    }

    * storageAccessorsForPie(): Iterable<string> {
        for (const metadata of [this.source, this.target]) {
            for (const variable of Metadata.getVariables(metadata)) {
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

            const decl = Metadata.findStruct(name, metadata);

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
        for (const variable of Metadata.getVariables(metadata))
            yield this.storageAccessor(metadata.name, variable);
    }

    storageAccessor(source: string, variable: VariableDeclaration) {
        const { name, typeName } = variable;
        const { typeDescriptions: { typeString } } = typeName;
        debug(`storageAccessor for %o of type %O`, name, typeName);

        if (isElementaryTypeName(typeName) || isArrayTypeName(typeName))
            return { source, name, expr: `${source}.${name}`, type: typeName.name };

        if (isMapping(typeName)) {
            const idxss = [...this.values.mapIndicies(typeName)];
            const elems = idxss.map(idxs => `${source}.${name}${idxs.map(i => `[${i}]`).join('')}`);;
            const expr = `keccak256(abi.encode(${elems.join(', ')}))`;
            const type = `bytes32`;
            return { source, name, expr, type };
        }

        throw Error(`Unexpected type name: ${typeString}`);
    }

    getMethod(example: SimulationExample, name: string): string[] {
        const { source: { trace: { operations: sOps }},
                target: { trace: { operations: tOps }} } = example;

        return [
            ``,
            `function ${name}() public {`,
            ...block(4)(
                ...sOps.map(Contract.callOfOperation(this.source)),
                ...tOps.map(Contract.callOfOperation(this.target)),
            ),
            `}`
        ];
    }
}
