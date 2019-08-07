import { Metadata, SourceInfo } from "../frontend/metadata";
import { Operation } from "../explore/states";
import { SimulationExample } from "../explore/examples";
import * as Compile from '../frontend/compile';
import { Debugger } from '../utils/debug';
import { VariableDeclaration, FunctionDefinition } from "../solidity";

const debug = Debugger(__filename);

export interface ContractInfo {
    name: string;
    path: string;
}

export abstract class Contract {
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

export function block(indent?: number) {
    return function(...lines: string[]): string[] {
        return lines.map(line => `${' '.repeat(indent || 0)}${line}`);
    }
}

export function format(indent?: number) {
    return function(...lines: string[]): string {
        return lines.map(line => `${' '.repeat(indent || 0)}${line}`).join('\n');
    }
}
