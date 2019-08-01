import { Metadata, Method, SourceInfo, Parameter, Location } from "../frontend/metadata";
import { Operation } from "../explore/states";
import { AbstractExample, SimulationExample } from "./examples";
import { getMethodSpec, getContractSpec } from './product';
import * as Compile from '../frontend/compile';
import { Debugger } from '../utils/debug';
import { isVariableDeclaration, VariableDeclaration, isElementaryTypeName } from "../frontend/ast";

const debug = Debugger(__filename);

abstract class Contract {
    constructor(public info: ContractInfo) { }

    abstract async getContract(): Promise<string[]>;

    async getMetadata(): Promise<Metadata> {
        const info = await this.getSourceInfo();
        const metadata = Compile.fromString(info);
        return metadata;
    }

    async getSourceInfo(): Promise<SourceInfo> {
        const { path } = this.info;
        const content = await this.getContent();
        const info = { path, content };
        return info;
    }

    async getContent(): Promise<string> {
        const lines = await this.getContract();
        const content = format()(...lines);
        debug(content);
        return content;
    }

    static signatureOfMethod(method: Method) {
        const { name, inputs = [], stateMutability, payable, outputs = [] } = method;
        const parameters = inputs.map(p => Contract.parameter(p));
        const returns = outputs.map(p => Contract.parameter(p));

        const modifiers = ['public'];

        if (payable)
            modifiers.push('payable');

        if (stateMutability === 'view')
            modifiers.push('view');

        if (outputs.length > 0)
            modifiers.push(`returns (${returns.join(', ')})`);

        return `function check$${name}(${parameters.join(', ')}) ${modifiers.join(' ')}`;
    }

    static parameter(parameter: Parameter, location: Location = 'memory'): string {
        const { name, type } = parameter;
        const elems = [type];

        if (type.endsWith("[]"))
            elems.push(location);

        if (name !== '')
            elems.push(name);

        return elems.join(' ');
    }

    static callOfOperation({ name }: Metadata) {
        return function (operation: Operation) {
            const { invocation: { method, inputs } } = operation;
            return `${name}.${method.name}(${inputs.join(', ')});`;
        }
    }

    static callOfMethod({ name }: Metadata) {
        return function (method: Method) {
            const { inputs = [], outputs = [] } = method;
            if (outputs.length > 1)
                throw Error(`TODO: handle multiple outputs`);

            const assignments = outputs.length > 0
                ? `${outputs.map(({ name: y, type }) => Contract.parameter({ name: `${name}_${y}`, type }))} = `
                : ``;

            const args = inputs.map(({ name }) => name).join(', ');

            return `${assignments}${name}.${method.name}(${args});`
        }
    }
}

abstract class ProductContract extends Contract {
    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo) {
        super(info);
    }

    async getContract(): Promise<string[]> {
        const { name } = this.info;
        const spec = await this.getSpec();
        const body = await this.getBody();
        const lines = block()(
            `pragma solidity ^0.5.0;`,
            ``,
            `import "${this.source.source.path}";`,
            `import "${this.target.source.path}";`,
            ``,
            ...spec,
            `contract ${name} is ${this.source.name}, ${this.target.name} {`,
            ...block(4)(...body),
            `}`
        );
        return lines;
    }

    async getSpec(): Promise<string[]> {
        return [];
    }

    abstract async getBody(): Promise<string[]>;
}

interface Examples {
    positive: AbstractExample[];
    negative: AbstractExample[];
}

export interface SimulationContractInfo {
    metadata: Metadata;
    examples: Examples;
};

export type ExampleGenerator = (s: Metadata, t: Metadata) => AsyncIterable<SimulationExample>;

export interface ContractInfo {
    name: string;
    path: string;
}

export class SimulationExamplesContract extends ProductContract {
    public examples: Examples = { positive: [], negative: [] };

    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo, public gen: ExampleGenerator) {
        super(source, target, info);
    }

    async get(): Promise<SimulationContractInfo> {
        const metadata = await this.getMetadata();
        const { examples } = this;
        return { metadata, examples };
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
            for (const variable of metadata.members.filter(isVariableDeclaration)) {
                const lines = this.getAccessor(metadata, variable);
                methods.push(lines);
            }
        }

        this.examples = { positive, negative };
        return methods.flat();
    }

    getAccessor(metadata: Metadata, variable: VariableDeclaration): string[] {
        const { name: source } = metadata;
        const { name, typeName } = variable;
        if (!isElementaryTypeName(typeName))
            return [];
        const { name: t } = typeName;
        return [
            ``,
            `function ${source}$${name}() public pure returns (${t}) {`,
            ...block(4)(`return ${source}.${name};`),
            `}`]
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

export class SimulationCheckingContract extends ProductContract {
    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo) {
        super(source, target, info);
    }

    async getBody(): Promise<string[]> {
        const { source, target: { abi } } = this;
        return abi.map(m => this.getMethod(m)).flat();
    }

    async getSpec(): Promise<string[]> {
        const { source } = this;
        const { simulations } = getContractSpec(source);
        if (simulations.length == 0)
            return [];

        return [
            `/**`,
            ...simulations.map(p => ` * @notice invariant ${p}`),
            ` */`
        ];
    }

    getMethod(method: Method): string[] {
        const { source, target } = this;
        const { modifies: srcMods } = getMethodSpec(source, method);
        const spec = getMethodSpec(target, method);
        const modifies = [
            ...srcMods.map(substituteFields(source)),
            ...spec.modifies.map(substituteFields(target))
        ];
        const preconditions = spec.preconditions.map(substituteFields(target));
        const postconditions = spec.postconditions.map(substituteFields(target));
        return [
            ``,
            `/**`,
            ...modifies.map(p => ` * @notice modifies ${p}`),
            ...preconditions.map(p => ` * @notice precondition ${p}`),
            ...postconditions.map(p => ` * @notice postcondition ${p}`),
            ` */`,
            `${Contract.signatureOfMethod(method)} {`,
            ...block(4)(
                Contract.callOfMethod(this.source)(method),
                Contract.callOfMethod(this.target)(method),
                ...this.getValidationsAndReturn(method),
            ),
            `}`
        ];
    }

    getValidationsAndReturn(method: Method): string[] {
        const { outputs = [] } = method;
        const varName = ({ name }: Metadata, varName: string) => `${name}_${varName}`;
        return [
            ...outputs.map(({ name }) => `assert(${varName(this.source,name)} == ${varName(this.target,name)});`),
            ...(outputs.length > 0 ? [`return (${outputs.map(({ name }) => `${varName(this.source,name)}`)});`] : []),
        ];
    }
}

function substituteFields(metadata: Metadata) {
    return function(expression: string) {
        const { name, members } = metadata;
        const fields = members.filter(isVariableDeclaration)
            .filter(f => f.stateVariable)
            .map(({ name }) => name);
        const re = new RegExp(`\\b(${fields.join('|')})\\b`, 'g');
        return expression.replace(re, `${name}.$1`);
    };
}

function block(indent?: number) {
    return function(...lines: string[]): string[] {
        return lines.map(line => `${' '.repeat(indent || 0)}${line}`);
    }
}

function format(indent?: number) {
    return function(...lines: string[]): string {
        return lines.map(line => `${' '.repeat(indent || 0)}${line}`).join('\n');
    }
}
