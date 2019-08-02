import fs from 'fs-extra';
import path from 'path';
import * as Compile from '../frontend/compile';
import { Metadata, Method, Contract, SourceInfo } from "../frontend/metadata";
import { FunctionDefinition, Return, Node } from '../frontend/ast';
import * as Pie from './pie';
import { Debugger } from '../utils/debug';
import { SimulationCheckingContract, ContractInfo } from './contract';

const debug = Debugger(__filename);

export interface Parameters {
    paths: {
        source: string;
        target: string;
    },
    output: ContractInfo
}

export interface Result {
    contract: SourceInfo;
    internalized: {
        source: SourceInfo;
        target: SourceInfo;
    }
}

export async function getSimulationCheckContract(parameters: Parameters): Promise<Result> {
    const { paths: { source, target }, output: o } = parameters;
    const dir = path.dirname(o.path);
    const si = await internalize(source, dir);
    const ti = await internalize(target, dir);
    const internalized = {
        source: si,
        target: ti
    };
    const s = await Compile.fromString({ ...internalized.source, content: si.original });
    const t = await Compile.fromString({ ...internalized.target, content: ti.original });
    const contract = await new SimulationCheckingContract(s, t, o).getSourceInfo();
    return { contract, internalized };
}

async function internalize(file: string, dir: string): Promise<SourceInfo & { original: string }> {
    const name = path.basename(file, '.sol');
    const loc = path.join(dir, `${name}-internalized.sol`);
    const buffer = await fs.readFile(file);
    const original = buffer.toString();
    const content = original.replace(/\bpublic*\s*payable\b/g, 'internal')
                            .replace(/\bexternal*\s*payable\b/g, 'internal')
                            .replace(/\bpublic\b/g, 'internal')
                            .replace(/\bexternal\b/g, 'internal');
    return { path: loc, content, original };
}

export interface ContractSpec {
    simulations: string[];
}

export interface MethodSpec {
    modifies: string[];
    preconditions: string[];
    postconditions: string[];
}

export function getContractSpec(metadata: Metadata): ContractSpec {
    const { name, userdoc: { notice } } = metadata;
    debug(`notice(%s): %O`, name, notice);
    const specs = notice.split(/(?=simulation)/);
    const strip = (s: string) => s.replace(/[^\s]*\s+/,'');
    const simulations = specs.filter(s => s.startsWith('simulation')).map(strip);
    const spec = { simulations };
    debug(`spec(%s): %O`, name, spec);
    return spec;
}

export function getMethodSpec(metadata: Metadata, method: Method): MethodSpec {
    const { userdoc: { methods } } = metadata;
    const empty: MethodSpec = { modifies: [], preconditions: [], postconditions: [] };

    if (method.name === undefined)
        return empty;

    const name = Object.keys(methods).find(key => key.split('(')[0] === method.name);

    if (name === undefined)
        return empty;

    const { notice } = methods[name];
    const specs = notice.split(/(?=modifies)|(?=precondition)|(?=postcondition)/);
    const strip = (s: string) => s.replace(/[^\s]*\s+/,'');
    const modifies = specs.filter(s => s.startsWith('modifies')).map(strip);
    const preconditions = specs.filter(s => s.startsWith('precondition')).map(strip);
    const postconditions = specs.filter(s => s.startsWith('postcondition')).map(strip);
    const spec = { modifies, preconditions, postconditions };
    debug(`spec(%s): %O`, method.name, spec)
    return spec;
}

export function getProductSeedFeatures(spec: Metadata, impl: Metadata): [string,string][] {

    const spec_contractMembers = spec.members;
    const impl_contractMembers = impl.members;

    const spec_fieldsNames = Pie.fieldNames(spec);
    const impl_fieldsNames = Pie.fieldNames(impl);

    const spec_contractName = spec.name;
    const impl_contractName = impl.name;

    const seed_features : [string,string][] = [];

    for (const spec_node of spec_contractMembers)
    {
        if(spec_node.nodeType === 'FunctionDefinition')
        {
            const spec_func = spec_node as FunctionDefinition;

            if(spec_func.visibility === 'public' && spec_func.stateMutability === 'view')
            {
                for (const impl_node of impl_contractMembers)
                {
                    if(impl_node.nodeType === 'FunctionDefinition')
                    {
                        const impl_func = impl_node as FunctionDefinition;

                        if(impl_func.name === spec_func.name && impl_func.visibility === 'public' && impl_func.stateMutability === 'view')
                        {
                            if(spec_func.body.statements.length != 1 || spec_func.body.statements.length != impl_func.body.statements.length)
                                throw Error('expected single statement in observation function');

                            const spec_statement = spec_func.body.statements[0];
                            const impl_statement = impl_func.body.statements[0];

                            if(spec_statement.nodeType != 'Return' || impl_statement.nodeType != 'Return')
                                throw Error('expected return statement');

                            const return_spec = spec_statement as Return;
                            debug(`return_spec: %o`, return_spec);
                            const return_impl = impl_statement as Return;
                            debug(`return_impl: %o`, return_impl);


                            const spec_expression = Node.addPrefixToNode(return_spec.expression,spec_contractName,spec_fieldsNames);
                            const impl_expression = Node.addPrefixToNode(return_impl.expression,impl_contractName,impl_fieldsNames);

                            const spec_exper = Node.toSExpr(spec_expression);
                            const impl_exper = Node.toSExpr(impl_expression);

                            const seed_feature = `(= ${spec_exper} ${impl_exper})`;

                            seed_features.push([seed_feature,spec_func.name]);
                        }
                    }
                }
            }
        }
    }

    return seed_features;
}
