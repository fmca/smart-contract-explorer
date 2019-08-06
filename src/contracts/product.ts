import fs from 'fs-extra';
import path from 'path';
import * as Compile from '../frontend/compile';
import { Metadata, SourceInfo } from "../frontend/metadata";
import { Body, Node, Statement, Expression } from '../frontend/ast';
import { Debugger } from '../utils/debug';
import { SimulationCheckingContract, ContractInfo } from './contract';
import { fieldNames } from './pie';

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

export function getProductSeedFeatures(spec: Metadata, impl: Metadata): [string, string][] {
    const features: [string, string][] = [];
    const specBodyToExpr = getBodyToExpr(spec);
    const implBodyToExpr = getBodyToExpr(impl);

    for (const m1 of Metadata.getFunctions(spec)) {
        if (m1.visibility !== 'public' || m1.stateMutability !== 'view')
            continue;

        const { name, body: b1 } = m1;
        const m2 = Metadata.findFunction(name, impl);

        if (m2 === undefined)
            continue;

        if (m2.visibility !== 'public' || m2.stateMutability !== 'view')
            continue;

        const { body: b2 } = m2;
        const e1 = specBodyToExpr(b1);
        const e2 = implBodyToExpr(b2);
        const feature = `(= ${e1} ${e2})`;
        features.push([feature, name]);
    }

    return features;
}

function getBodyToExpr(metadata: Metadata) {
    const { name } = metadata;
    const ids = fieldNames(metadata);

    return function bodyToExpr(body: Body): string {
        const { statements } = body;

        if (statements.length != 1)
            throw Error('expected single statement in observation function');

        const [ stmt ] = statements;

        if (!Statement.isReturn(stmt))
            throw Error('expected return statement');

        const expr = Expression.prefixIdentifiers(stmt.expression, name, ids);
        return Node.toSExpr(expr);
    }
}
