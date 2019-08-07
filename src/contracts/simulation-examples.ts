import { Metadata } from "../frontend/metadata";
import { AbstractExample, SimulationExample, AbstractExamples } from "../simulation/examples";
import { isElementaryTypeName, VariableDeclaration, isMapping } from "../solidity";
import { ValueGenerator } from "../model/values";
import { ProductContract } from "./product";
import { Contract, ContractInfo, block } from "./contract";

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

        for (const metadata of [this.source, this.target]) {
            for (const variable of Metadata.getVariables(metadata)) {
                const lines = this.getAccessor(metadata, variable);
                methods.push(lines);
            }
        }

        return methods.flat();
    }

    getAccessor(metadata: Metadata, variable: VariableDeclaration): string[] {
        const { name: source } = metadata;
        const { name } = variable;
        const { expr, type } = this.getTypedObserverExpr(metadata, variable);

        return [
            ``,
            `function ${source}$${name}() public view returns (${type}) {`,
            ...block(4)(`return ${expr};`),
            `}`
        ];
    }

    getTypedObserverExpr(metadata: Metadata, variable: VariableDeclaration) {
        const { name: source } = metadata;
        const { name, typeName } = variable;

        if (isElementaryTypeName(typeName))
            return { expr: `${source}.${name}`, type: typeName.name };

        if (isMapping(typeName)) {
            const idxss = [...this.values.mapIndicies(typeName)];
            const elems = idxss.map(idxs => `${source}.${name}${idxs.map(i => `[${i}]`).join('')}`);;
            const expr = `keccak256(abi.encode(${elems.join(', ')}))`;
            const type = `bytes32`;
            return { expr, type };
        }

        throw Error(`Unexpected type name: ${typeName}`);
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
