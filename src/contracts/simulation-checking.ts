import { Metadata } from "../frontend/metadata";
import { isElementaryTypeName, VariableDeclaration, FunctionDefinition, Parameters, ReturnParameters } from "../solidity";
import { ProductContract } from "./product";
import { Contract, ContractInfo, block } from "./contract";
import { FunctionMapping } from "../simulation/mapping";
import { Unit } from "../frontend/unit";

export class SimulationCheckingContract extends ProductContract {

    constructor(public mapping: FunctionMapping, public unit: Unit) {
        super(mapping.sourceMetadata, mapping.targetMetadata, unit);
    }

    async getBody(): Promise<string[]> {
        const lines: string[] = [];

        for (const { source, target } of this.mapping.entries())
            lines.push(...this.getMethod(source, target));

        return lines;
    }

    async getSpec(): Promise<string[]> {
        const { source } = this;
        const { simulations } = source.getContractSpec();
        if (simulations.length == 0)
            return [];

        return [
            `/**`,
            ...simulations.map(p => ` * @notice invariant ${p}`),
            ` */`
        ];
    }

    getMethod(source: FunctionDefinition, target: FunctionDefinition): string[] {
        const { name } = target;

        if (name === '')
            return this.getConstructor(source, target);

        const { modifies: srcMods } = this.source.getMethodSpec(name);
        const spec = this.target.getMethodSpec(name);
        const modifies = [
            ...srcMods.map(substituteFields(this.source)),
            ...spec.modifies.map(substituteFields(this.target))
        ];
        const returns: VariableDeclaration[] = [];
        const preconditions = spec.preconditions.map(substituteFields(this.target));
        const postconditions = [
            // ...spec.postconditions.map(p => substituteReturns(this.target, target)(substituteFields(this.target)(p))),
            ...this.getOutputEqualities(target)
        ];

        for (const [i, param] of [...FunctionDefinition.returns(target)].entries()) {
            returns.push({ ...param, name: `impl_ret_${i}` });
            returns.push({ ...param, name: `spec_ret_${i}` });
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
                `${this.callMethod(this.source.getName(), { ...source, parameters }, 'impl')};`,
                `${this.callMethod(this.target.getName(), target, 'spec')};`,
                ...this.getReturns(target),
            ),
            `}`
        ];
    }

    getConstructor(source: FunctionDefinition, target: FunctionDefinition): string[] {
        return [
            ``,
            `${Contract.signature(target)}`,
            ...block(4)(
                this.callMethod(this.source.getName(), { ...source, parameters: target.parameters }, 'impl'),
                this.callMethod(this.target.getName(), target, 'spec')
            ),
            `{ }`
        ];
    }

    getReturns(method: FunctionDefinition): string[] {
        const returns: string[] = [];

        for (const name of ['impl', 'spec'])
            for (const [i] of [...FunctionDefinition.returns(method)].entries())
                returns.push(`${name}_ret_${i}`);

        return returns.length > 0 ? [`return (${returns.join(', ')});`] : [];
    }

    getOutputEqualities(method: FunctionDefinition): string[] {
        const expressions: string[] = [];

        for (const [i, { typeName }] of [...FunctionDefinition.returns(method)].entries()) {
            const lhs = `impl_ret_${i}`;
            const rhs = `spec_ret_${i}`;

            if (isElementaryTypeName(typeName))
                expressions.push(`${lhs} == ${rhs}`);
            else
                expressions.push(`__verifier_eq(${lhs}, ${rhs})`);
        }
        return expressions;
    }

    sourceVar(x: string) { return this.qualifiedVariable(this.source,x); }
    targetVar(x: string) { return this.qualifiedVariable(this.target,x); }

    qualifiedVariable(metadata: Metadata, varName: string) {
        return `${metadata.getName()}_${varName}`;
    }
}

function substituteFields(metadata: Metadata) {
    return function(expression: string) {
        const ids = [...metadata.getVariables()].map(({ name }) => name);
        return prefixIdentifiers(expression, ids, metadata.getName());
    };
}

function substituteReturns(metadata: Metadata, method: FunctionDefinition) {
    return function(expression: string) {
        const substitutions =
            [...FunctionDefinition.returns(method)]
            .map(({ name }, i) => [name, `${metadata.getName()}_ret_${i}`]);

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
