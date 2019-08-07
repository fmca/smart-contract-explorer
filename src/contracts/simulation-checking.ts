import { Metadata } from "../frontend/metadata";
import { isElementaryTypeName, VariableDeclaration, FunctionDefinition, Parameters, ReturnParameters } from "../solidity";
import { ProductContract } from "./product";
import { Contract, ContractInfo, block } from "./contract";

const { getMethodSpec, getContractSpec } = Metadata;

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
