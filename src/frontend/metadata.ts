import { ABIDefinition, ABIDataTypes } from 'web3/eth/abi';
import Contract from 'web3/eth/contract';
import { SourceUnit, ContractMember, SourceUnitElement, ContractDefinition, FunctionDefinition, VariableDeclaration } from './ast';
import { UserDoc } from './solc';

import { Debugger } from '../utils/debug';

const debug = Debugger(__filename);

export type Contract = Contract;

export type Address = string;
export type Method = ABIDefinition;

export type Location = 'storage' | 'memory';

export interface Parameter {
    name: string;
    type: ABIDataTypes;
};

export namespace Method {
    export function equals(m1: Method, m2: Method): boolean {
        return JSON.stringify(m1) === JSON.stringify(m2);
    }
}

export interface SourceInfo {
    path: string;
    content: string;
}

export interface Metadata {
    name: string;
    source: SourceInfo;
    abi: Method[];
    bytecode: string;
    userdoc: UserDoc;
    ast: SourceUnit;
    members: ContractMember[];
}

export namespace Metadata {

    export function findVariable(name: string, metadata: Metadata) {
        for (const m of getVariables(metadata))
            if (m.name === name)
                return m;

        return undefined;
    }

    export function findFunction(name: string, metadata: Metadata) {
        for (const m of getFunctions(metadata))
            if (m.name === name)
                return m;

        return undefined;
    }

    export function * getVariables(metadata: Metadata) {
        const contract = getContract(metadata);
        for (const m of ContractDefinition.variables(contract))
            yield m;
    }

    export function * getFunctions(metadata: Metadata) {
        const contract = getContract(metadata);
        for (const m of ContractDefinition.functions(contract))
            yield m;
    }

    function getContract(metadata: Metadata): ContractDefinition {
        const { name } = metadata;

        for (const contract of contracts(metadata))
            if (contract.name === name)
                return contract;

        throw Error(`Expected contract named '${name}'`);
    }

    function * contracts(metadata: Metadata): Iterable<ContractDefinition> {
        for (const node of metadata.ast.nodes)
            if (SourceUnitElement.isContractDefinition(node))
                yield node;
    }
}
