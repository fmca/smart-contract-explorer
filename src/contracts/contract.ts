import { Metadata, SourceInfo } from "../frontend/metadata";
import { Operation } from "../explore/states";
import { AbstractExample, SimulationExample, AbstractExamples } from "./examples";
import * as Compile from '../frontend/compile';
import { Debugger } from '../utils/debug';
import { isElementaryTypeName, VariableDeclaration, ContractMember, FunctionDefinition, Parameters, ReturnParameters } from "../solidity";

const { isVariableDeclaration } = ContractMember;
const { getMethodSpec, getContractSpec } = Metadata;

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

    static signature(method: FunctionDefinition) {
        const { modifiers: _, stateMutability, visibility } = method;
        const attributes: string[] = [];
        const parameters = [...FunctionDefinition.parameters(method)].map(Contract.parameter);
        const returns = [...FunctionDefinition.returns(method)].map(Contract.parameter);

        attributes.push(visibility);

        if (stateMutability !== 'nonpayable')
            attributes.push(stateMutability);

        if (returns.length > 0)
            attributes.push(`returns (${returns.join(', ')})`);

        const name = FunctionDefinition.isConstructor(method)
            ? `constructor`
            : `function check$${method.name}`;

        return `${name}(${parameters.join(', ')}) ${attributes.join(' ')}`;
    }

    static parameter(variable: VariableDeclaration): string {
        const { name, storageLocation, typeDescriptions: { typeString: type } } = variable;
        const elems = [type];

        if (storageLocation === 'memory')
            elems.push(storageLocation);

        if (name !== '')
            elems.push(name);

        return elems.join(' ');
    }

    static isPrimitive(type: string) {
        return type.endsWith('[]');
    }

    static callOfOperation({ name }: Metadata) {
        return function (operation: Operation) {
            const { invocation: { method, inputs } } = operation;
            return `${name}.${method.name}(${inputs.join(', ')});`;
        }
    }

    static callMethod(contractName: string, method: FunctionDefinition) {
        const args = [...FunctionDefinition.parameters(method)].map(({ name }) => name).join(', ');
        const returns = [...FunctionDefinition.returns(method)].map((_, i) => `${contractName}_ret_${i}`);
        const assignments = returns.length > 0 ? `${returns.join(', ')} = ` : ``;

        const name = FunctionDefinition.isConstructor(method)
            ? contractName
            : `${contractName}.${method.name}`;

        return `${assignments}${name}(${args})`
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

export type ExampleGenerator = (s: Metadata, t: Metadata) => AsyncIterable<SimulationExample>;

export interface ContractInfo {
    name: string;
    path: string;
}

export class SimulationExamplesContract extends ProductContract {
    public examples: AbstractExamples = { positive: [], negative: [] };

    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo, public gen: ExampleGenerator) {
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
        const { source, target } = this;
        const lines: string[] = [];

        for (const { name, visibility } of Metadata.getFunctions(target))
            if (Metadata.findFunction(name, source) !== undefined && (visibility === 'public' || visibility === 'external'))
                lines.push(...this.getMethod(name));

        return lines;
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

    getMethod(name: string): string[] {
        if (name === undefined || name === '')
            return this.getConstructor(name);

        const source = Metadata.findFunction(name, this.source);
        const target = Metadata.findFunction(name, this.target);

        if (source === undefined || target === undefined)
            throw Error(`Expected function named ${name}`);

        const { modifies: srcMods } = getMethodSpec(this.source, name);
        const spec = getMethodSpec(this.target, name);
        const modifies = [
            ...srcMods.map(substituteFields(this.source)),
            ...spec.modifies.map(substituteFields(this.target))
        ];
        const returns: VariableDeclaration[] = [];
        const preconditions = spec.preconditions.map(substituteFields(this.target));
        const postconditions = [
            ...spec.postconditions.map(p => substituteReturns(this.target, target)(substituteFields(this.target)(p))),
            ...this.getOutputEqualities(target)
        ];

        for (const [i, param] of [...FunctionDefinition.returns(target)].entries()) {
            returns.push({ ...param, name: `${this.source.name}_ret_${i}` });
            returns.push({ ...param, name: `${this.target.name}_ret_${i}` });
        }

        const parameters: Parameters = {
            id: -1,
            src: '',
            nodeType: 'ParameterList',
            parameters: [...FunctionDefinition.parameters(target)]
        };

        const returnParameters: ReturnParameters = {
            id: -1,
            src: '',
            nodeType: 'ParameterList',
            parameters: returns
        };

        return [
            ``,
            `/**`,
            ...modifies.map(p => ` * @notice modifies ${p}`),
            ...preconditions.map(p => ` * @notice precondition ${p}`),
            ...postconditions.map(p => ` * @notice postcondition ${p}`),
            ` */`,
            `${Contract.signature({ ...target, returnParameters })} {`,
            ...block(4)(
                `${Contract.callMethod(this.source.name, { ...source, parameters })};`,
                `${Contract.callMethod(this.target.name, target)};`,
                ...this.getReturns(target),
            ),
            `}`
        ];
    }

    getConstructor(name: string): string[] {
        const source = Metadata.findFunction(name, this.source);
        const target = Metadata.findFunction(name, this.target);

        if (source === undefined || target === undefined)
            throw Error(`Expected function named ${name}`);

        const parameters: Parameters = {
            id: -1,
            src: '',
            nodeType: 'ParameterList',
            parameters: [...FunctionDefinition.parameters(target)]
        };

        return [
            ``,
            `${Contract.signature(target)}`,
            ...block(4)(
                Contract.callMethod(this.source.name, { ...source, parameters }),
                Contract.callMethod(this.target.name, target)
            ),
            `{ }`
        ];
    }

    getReturns(method: FunctionDefinition): string[] {
        const returns: string[] = [];

        for (const { name } of [this.source, this.target])
            for (const [i] of [...FunctionDefinition.returns(method)].entries())
                returns.push(`${name}_ret_${i}`);

        return returns.length > 0 ? [`return (${returns.join(', ')});`] : [];
    }

    getOutputEqualities(method: FunctionDefinition): string[] {
        const expressions: string[] = [];

        for (const [i, { typeName }] of [...FunctionDefinition.returns(method)].entries()) {
            const lhs = `${this.source.name}_ret_${i}`;
            const rhs = `${this.target.name}_ret_${i}`;

            if (isElementaryTypeName(typeName))
                expressions.push(`${lhs} == ${rhs}`);
            else
                expressions.push(`__verifier_eq(${lhs}, ${rhs})`);
        }
        return expressions;
    }

    sourceVar(x: string) { return this.qualifiedVariable(this.source,x); }
    targetVar(x: string) { return this.qualifiedVariable(this.target,x); }

    qualifiedVariable({ name }: Metadata, varName: string) {
        return `${name}_${varName}`;
    }
}

function substituteFields(metadata: Metadata) {
    return function(expression: string) {
        const ids = [...Metadata.getVariables(metadata)].map(({ name }) => name);
        return prefixIdentifiers(expression, ids, metadata.name);
    };
}

function substituteReturns(metadata: Metadata, method: FunctionDefinition) {
    return function(expression: string) {
        const substitutions =
            [...FunctionDefinition.returns(method)]
            .map(({ name }, i) => [name, `${metadata.name}_ret_${i}`]);

        for (const [x, y] of substitutions) {
            const re = new RegExp(`\\b${x}\\b`, 'g');
            expression = expression.replace(re, y);
        }

        return expression;
    }
}

function prefixIdentifiers(expression: string, ids: string[], prefix: string) {
    return substitute(expression, ids, `${prefix}.$1`);
}

function substitute(expression: string, ids: string[], replacement: string) {
    const re = new RegExp(`\\b(${ids.join('|')})\\b`, 'g');
    return expression.replace(re, replacement);
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
