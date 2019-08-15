import { ABIDefinition, ABIDataTypes } from 'web3/eth/abi';
import Contract from 'web3/eth/contract';
import { SourceUnit, ContractMember, SourceUnitElement, ContractDefinition, FunctionDefinition } from '../solidity';
import { UserDoc } from './solc';

import { Debugger } from '../utils/debug';
import { copy } from 'fs-extra';

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

export class Metadata {
    constructor(
        public abi: Method[],
        public name: string,
        public source: SourceInfo,
        public bytecode: string,
        public userdoc: UserDoc,
        public ast: SourceUnit,
        public members: ContractMember[]) {}

    findVariable(name: string) {
        for (const m of this.getVariables())
            if (m.name === name)
                return m;

        return undefined;
    }

    findFunction(name: string) {
        for (const m of this.getFunctions())
            if (m.name === name)
                return m;

        return undefined;
    }

    findStruct(name: string) {
        for (const member of this.getStructs())
            if (member.name === name)
                return member

        return undefined;
    }

    * getVariables() {
        const contract = this.getContract();
        for (const m of ContractDefinition.variables(contract))
            if (m.stateVariable && !m.constant)
                yield m;
    }

    * getFunctions() {
        const contract = this.getContract();
        for (const m of ContractDefinition.functions(contract))
            yield m;
    }

    * getStructs() {
        const contract = this.getContract();
        for (const m of ContractDefinition.structs(contract))
            yield m;
    }

    getContractSpec(): ContractSpec {
        const { name, userdoc: { notice = '' } } = this;
        debug(`notice(%s): %O`, name, notice);
        const specs = notice.trim().split(/(?=simulation)|(?=invariant)/);
        const strip = (s: string) => s.replace(/[^\s]*\s+/,'').replace(/\s+/g, ' ').trim();
        const invariants = specs.filter(s => s.startsWith('invariant')).map(strip);
        const simulations = specs.filter(s => s.startsWith('simulation')).map(strip);
        const spec = { invariants, simulations };
        debug(`spec(%s): %O`, name, spec);
        return spec;
    }

    getMethodSpec(name: string): MethodSpec {
        debug(`getMethodSpec(%o, %O)`, name, this);

        const { userdoc: { methods } } = this;

        if (name === undefined)
            return emptySpec();

        const key = Object.keys(methods).find(key => key.split('(')[0] === name);

        if (key === undefined)
            return this.getInternalMethodSpec(name);

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

    getContract(): ContractDefinition {
        const { name } = this;

        for (const contract of this.contracts())
            if (contract.name === name)
                return contract;

        throw Error(`Expected contract named '${name}'`);
    }

    * contracts(): Iterable<ContractDefinition> {
        for (const node of this.ast.nodes)
            if (SourceUnitElement.isContractDefinition(node))
                yield node;
    }

    getInternalMethodSpec(name: string): MethodSpec {
        debug(`getInternalSpec(%o, %O)`, name, this);

        const method = this.findFunction(name);

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

    private static copy(metadata: { [K in keyof Metadata]: Metadata[K] }): Metadata {
        const { abi, name, source, bytecode, userdoc, ast, members } = metadata;
        return new Metadata(abi, name, source, bytecode, userdoc, ast, members);
    }

    redirect(source: SourceInfo): Metadata {
        return Metadata.copy({ ...this, source });
    }
}

function emptySpec() {
    return { modifies: [], preconditions: [], postconditions: [] };
}
