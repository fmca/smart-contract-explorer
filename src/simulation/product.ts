import path from 'path';
import * as Compile from '../frontend/compile';
import { Metadata, SourceInfo } from "../frontend/metadata";
import { prefixIdentifiers } from '../frontend/identifier-prefixer';
import { normalizedReturn } from '../frontend/return-normalizer';
import { toSExpr } from '../frontend/node-to-sexpr';
import { Block } from '../solidity';
import { Debugger } from '../utils/debug';
import { SimulationCheckingContract, ContractInfo } from '../contracts';
import { fieldNames } from '../sexpr/pie';
import { internalize } from '../contracts/rewriting';
import { Expr } from '../sexpr/expression';
import { FunctionMapping } from './mapping';

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
    const { paths, output: o } = parameters;
    const dir = path.dirname(o.path);
    const internalized = {
        source: await internalize(paths.source, dir),
        target: await internalize(paths.target, dir)
    }

    const source = await Compile.fromFile(paths.source);
    const target = await Compile.fromFile(paths.target);

    const s = { ...source, source: internalized.source };
    const t = { ...target, source: internalized.target };

    const mapping = FunctionMapping.getMapping(s, t);
    const contract = await new SimulationCheckingContract(mapping, o).getSourceInfo();
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

        if (b1 === null || b2 === null)
            throw Error(`Unexpected null block(s)`);

        try {
            const e1 = specBodyToExpr(b1);
            const e2 = implBodyToExpr(b2);
            const feature = simplify(`(= ${e1} ${e2})`);
            features.push([feature, name]);

        } catch (e) {
            if (!(e instanceof SyntaxError))
                throw e;

            console.error(`Warning: did not generate seed feature from function: ${name}`);
        }
    }

    return features;
}

function simplify(s: string): string {
    let e = Expr.parse(s);
    e = fix(simplifyMapEqualities, e);
    const r = Expr.toString(e);
    debug(`simplify(%o): %o`, s, r);
    return r;
}

function simplifyMapEqualities(expr: Expr): Expr {
    if (!Expr.isApp(expr))
        return expr;

    const [ op, x, y ] = expr;

    if (Expr.isApp(op) || op !== '=')
        return expr;

    if (!Expr.isApp(x) || x[0] !== 'index')
        return expr;

    if (!Expr.isApp(y) || y[0] !== 'index')
        return expr;

    return ['=', x[1], y[1]];
}

function fix(f: (_: Expr) => Expr, expr: Expr): Expr {
    let next = expr;
    do {
        expr = next;
        next = f(expr);
    } while (!Expr.equals(next, expr));

    return expr;
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
