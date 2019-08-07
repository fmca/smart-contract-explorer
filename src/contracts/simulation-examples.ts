import { Metadata } from "../frontend/metadata";
import { AbstractExample, SimulationExample, AbstractExamples } from "../explore/examples";
import { isElementaryTypeName, VariableDeclaration, isMapping } from "../solidity";
import { ValueGenerator } from "../explore/values";
import { ProductContract } from "./product";
import { Contract, ContractInfo, block } from "./contract";

export type ExampleGenerator = (s: Metadata, t: Metadata) => AsyncIterable<SimulationExample>;

export class SimulationExamplesContract extends ProductContract {
    public examples: AbstractExamples = { positive: [], negative: [] };

    constructor(public source: Metadata, public target: Metadata,
            public info: ContractInfo, public gen: ExampleGenerator,
            public values: ValueGenerator) {

        super(source, target, info);
    }

    async getBody(): Promise<string[]> {
        const { path } = this.info;
        const methods: string[][] = [];
        const positive: AbstractExample[] = [];
        const negative: AbstractExample[] = [];

        for await (const example of this.gen(this.source, this.target)) {
            const { kind } = example;
            const method = `${kind}Example${methods.length}`;
            const lines = this.getMethod(example, method);
            methods.push(lines);
            (kind === 'positive' ? positive : negative).push({ id: { contract: path, method }});
        }

        for (const metadata of [this.source, this.target]) {
            for (const variable of Metadata.getVariables(metadata)) {
                const lines = this.getAccessor(metadata, variable);
                methods.push(lines);
            }
        }

        this.examples = { positive, negative };
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
