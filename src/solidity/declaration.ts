import { Node } from './node';
import { Block } from './statement';
import { TypeDescriptions, TypeName } from './type';

export interface SourceUnit extends Node {
    nodeType: 'SourceUnit';
    nodes: SourceUnitElement[];
}

export type SourceUnitElement = PragmaDirective | ImportDirective | ContractDefinition;

export interface PragmaDirective extends Node {
    nodeType: 'PragmaDirective';
    literals: string[];
}

export interface ImportDirective extends Node {
    nodeType: 'ImportDirective';
    file: string;
    absolutePath: string;
    scope: number;
    sourceUnit: number;
    symbolAliases: any[];
    unitAlias: string;
}


export interface ContractDefinition extends Node {
    nodeType: 'ContractDefinition';
    baseContracts: any[];
    contractDependencies: any[];
    contractKind: ContractKind;
    documentation: null;
    fullyImplemented: boolean;
    linearizedBaseContracts: number[];
    name: string
    nodes: ContractMember[];
}

export type ContractKind = 'contract';

export interface ContractMember extends Node {
    nodeType: 'FunctionDefinition' | 'VariableDeclaration';
}

export interface FunctionDefinition extends ContractMember {
    nodeType: 'FunctionDefinition';

    kind: FunctionKind;
    stateMutability: StateMutability;
    visibility: Visibility;

    name: string;
    body: Block;
    parameters: Parameters;
    returnParameters: ReturnParameters;
    documentation: string;
}

export type FunctionKind = 'constructor' | 'function';
export type StateMutability = 'payable' | 'nonpayable' | 'view';
export type Visibility = 'external' | 'public' | 'private' | 'internal';

export interface VariableDeclaration extends ContractMember {
    nodeType: 'VariableDeclaration';
    name: string;
    scope: number;
    constant: boolean;
    stateVariable: boolean;
    storageLocation: StorageLocation;
    typeDescriptions: TypeDescriptions;
    typeName: TypeName;
}

export type StorageLocation = 'default' | 'memory';

export interface ParameterList extends Node {
    nodeType: 'ParameterList';
}

export interface Parameters extends ParameterList {
    parameters: VariableDeclaration[];
}

export interface ReturnParameters extends ParameterList {
    parameters: VariableDeclaration[];
}

export namespace SourceUnitElement {
    export function isContractDefinition(node: SourceUnitElement): node is ContractDefinition {
        return node.nodeType === 'ContractDefinition';
    }
}

export namespace ContractDefinition {
    export function * variables(contract: ContractDefinition): Iterable<VariableDeclaration> {
        for (const member of members(contract))
            if (ContractMember.isVariableDeclaration(member))
                yield member;
    }

    export function * functions(contract: ContractDefinition): Iterable<FunctionDefinition> {
        for (const member of members(contract))
            if (ContractMember.isFunctionDefinition(member))
                yield member;
    }

    export function * members(contract: ContractDefinition): Iterable<ContractMember> {
        for (const member of contract.nodes)
            yield member;
    }
}

export namespace ContractMember {
    export function isVariableDeclaration(node: ContractMember): node is VariableDeclaration {
        return node.nodeType === 'VariableDeclaration';
    }
    export function isFunctionDefinition(node: ContractMember): node is FunctionDefinition {
        return node.nodeType === 'FunctionDefinition';
    }
}

export namespace VariableDeclaration {
    export function isPayable(decl: VariableDeclaration) {
        return decl.typeDescriptions.typeString.split(' ').includes('payable');
    }
};

export namespace FunctionDefinition {
    export function isConstructor(method: FunctionDefinition) {
        return method.kind === 'constructor';
    }

    export function visibility(method: FunctionDefinition) {
        return method.visibility;
    }

    export function mutability(method: FunctionDefinition) {
        return method.stateMutability;
    }

    export function * parameters(method: FunctionDefinition) {
        const { parameters: { parameters } } = method;
        for (const parameter of parameters)
            yield parameter;
    }

    export function * returns(method: FunctionDefinition) {
        const { returnParameters: { parameters } } = method;
        for (const parameter of parameters)
            yield parameter;
    }

    export function isMutator({ stateMutability }: FunctionDefinition) {
        return stateMutability == undefined
            || !['pure', 'view'].includes(stateMutability);
    }

};
