import { ABIDefinition, ABIDataTypes } from 'web3/eth/abi';
import Contract from 'web3/eth/contract';
import { SourceUnit, ContractMember, SourceUnitElement, ContractDefinition, FunctionDefinition } from '../solidity';
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

export interface ContractSpec {
    simulations: string[];
    invariants: string[];
}

export interface MethodSpec {
    modifies: string[];
    preconditions: string[];
    postconditions: string[];
}

export namespace Method {
    export function equals(m1: FunctionDefinition, m2: FunctionDefinition): boolean {
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

    export function findStruct(name: string, metadata: Metadata) {
        for (const member of getStructs(metadata))
            if (member.name === name)
                return member

        return undefined;
    }

    export function * getVariables(metadata: Metadata) {
        const contract = getContract(metadata);
        for (const m of ContractDefinition.variables(contract))
            if (m.stateVariable)
                yield m;
    }

    export function * getFunctions(metadata: Metadata) {
        const contract = getContract(metadata);
        for (const m of ContractDefinition.functions(contract))
            yield m;
    }

    export function * getStructs(metadata: Metadata) {
        const contract = getContract(metadata);
        for (const m of ContractDefinition.structs(contract))
            yield m;
    }

    export function getContractSpec(metadata: Metadata): ContractSpec {
        const { name, userdoc: { notice = '' } } = metadata;
        debug(`notice(%s): %O`, name, notice);
        const specs = notice.trim().split(/(?=simulation)|(?=invariant)/);
        const strip = (s: string) => s.replace(/[^\s]*\s+/,'').replace(/\s+/g, ' ').trim();
        const invariants = specs.filter(s => s.startsWith('invariant')).map(strip);
        const simulations = specs.filter(s => s.startsWith('simulation')).map(strip);
        const spec = { invariants, simulations };
        debug(`spec(%s): %O`, name, spec);
        return spec;
    }

    export function getMethodSpec(metadata: Metadata, name: string): MethodSpec {
        debug(`getMethodSpec(%o, %O)`, name, metadata);

        const { userdoc: { methods } } = metadata;

        if (name === undefined)
            return emptySpec();

        const key = Object.keys(methods).find(key => key.split('(')[0] === name);

        if (key === undefined)
            return getInternalMethodSpec(metadata,name);

        const { notice = '' } = methods[key];
        const specs = notice.split(/(?=modifies)|(?=precondition)|(?=postcondition)/);
        const strip = (s: string) => s.replace(/[^\s]*\s+/,'');
        const modifies = specs.filter(s => s.startsWith('modifies')).map(strip);
        const preconditions = specs.filter(s => s.startsWith('precondition')).map(strip);
        const postconditions = specs.filter(s => s.startsWith('postcondition')).map(strip);
        const spec = { modifies, preconditions, postconditions };
        debug(`spec(%s): %O`, name, spec)
        return spec;
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

    function getInternalMethodSpec(metadata: Metadata, name: string): MethodSpec {
        debug(`getInternalSpec(%o, %O)`, name, metadata);

        const method = Metadata.findFunction(name, metadata);

        if (method === undefined)
            return emptySpec();

        if (method.documentation  === null)
            return emptySpec();

        const documentation = method.documentation as string

        const rmstart = (s: string) => s.replace(/\n*\s*/,'');
        const documentations = documentation.split(/(?=\n)/).map(rmstart);

        const strip = (s: string) => s.replace(/[^\s]*\s+/,'');

        const specs = documentations.filter(s => s.startsWith('@notice')).map(strip);
        const modifies = specs.filter(s => s.startsWith('modifies')).map(strip);
        const preconditions = specs.filter(s => s.startsWith('precondition')).map(strip);
        const postconditions = specs.filter(s => s.startsWith('postcondition')).map(strip);
        const spec = { modifies, preconditions, postconditions };
        debug(`spec(%s): %O`, name, spec)
        return spec;
    }

    function emptySpec() {
        return { modifies: [], preconditions: [], postconditions: [] };
    }
}
