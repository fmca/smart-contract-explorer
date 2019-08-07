import path from 'path';
import * as Compile from '../frontend/compile';
import { Metadata, SourceInfo } from "../frontend/metadata";
import { prefixIdentifiers } from '../frontend/identifier-prefixer';
import { normalizedReturn } from '../frontend/return-normalizer';
import { toSExpr } from '../frontend/node-to-sexpr';
import { Block } from '../solidity';
import { Debugger } from '../utils/debug';
import { SimulationCheckingContract, ContractInfo } from './contract';
import { fieldNames } from './pie';
import { internalize } from './rewriting';

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
    const s = { ...await Compile.fromFile(source), source: si };
    const t = { ...await Compile.fromFile(target), source: ti };
    const contract = await new SimulationCheckingContract(s, t, o).getSourceInfo();
    return { contract, internalized };
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

    return function bodyToExpr(block: Block): string {
        // const { statements: [ stmt, ...rest ] } = block;
        // if (rest.length > 0 || Statement.isReturn(stmt))
        //     throw Error('expected single return statement in observation function');

        debug(`block: %O`, block);

        const expr = normalizedReturn(block);
        debug(`expr: %O`, expr)

        const prefixed = prefixIdentifiers(expr, name, ids);
        debug(`prefixed: %O`, prefixed);

        const sexpr = toSExpr(prefixed);
        debug(`sexpr: %O`, sexpr);

        return sexpr;
    }
}
