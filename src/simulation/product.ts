import path from 'path';
import * as Compile from '../frontend/compile';
import { Metadata, SourceInfo } from "../frontend/metadata";
import { prefixIdentifiers } from '../frontend/identifier-prefixer';
import { normalizedReturn } from '../frontend/return-normalizer';
import * as SExpr from '../sexpr/conversions';
import { Block } from '../solidity';
import { Debugger } from '../utils/debug';
import { SimulationCheckingContract } from '../contracts';
import { fieldNames } from '../sexpr/pie';
import { internalize } from '../contracts/rewriting';
import { Expr } from '../sexpr/expression';
import { FunctionMapping } from './mapping';
import { Unit } from '../frontend/unit';
import { Feature } from './simulation-data';
import { warning } from '../utils/warn';

const debug = Debugger(__filename);

export interface Parameters {
    source: Unit;
    target: Unit;
    output: Unit;
}

export interface Result {
    units: Unit[];
}

export async function getSimulationCheckContract(parameters: Parameters): Promise<Result> {
    const { source: s, target: t, output } = parameters;

    const si = s.suffix('.internalized').relocate(output.getDirname());
    const ti = t.suffix('.internalized').relocate(output.getDirname());
    const units = [si, ti, output];

    await internalize(s, si);
    await internalize(t, ti);

    const source = await s.getMetadata();
    const target = await t.getMetadata();

    const sr = source.redirect(await si.getSourceInfo());
    const tr = target.redirect(await ti.getSourceInfo());
    const mapping = FunctionMapping.getMapping(sr, tr);
    const c = new SimulationCheckingContract(mapping, output);
    await output.setContent(c);
    return { units };
}


export function getProductSeedFeatures(impl: Metadata, spec: Metadata): Feature[] {
    const features: Feature[] = [];
    const specBodyToExpr = getBodyToExpr(spec.name, spec);
    const implBodyToExpr = getBodyToExpr(impl.name, impl);

    for (const m2 of spec.getFunctions()) {
        if (m2.visibility !== 'public' || m2.stateMutability !== 'view')
            continue;

        const { name, body: b2 } = m2;
        const m1 = impl.findFunction(name);

        if (m1 === undefined)
            continue;

        if (m1.visibility !== 'public' || m1.stateMutability !== 'view')
            continue;

        const { body: b1 } = m1;

        if (b1 === null || b2 === null)
            throw Error(`Unexpected null block(s)`);

        try {
            const e1 = implBodyToExpr(b1);
            console.log("e1", e1);
            const e2 = specBodyToExpr(b2);
            console.log("e2", e2);
            
            const expression = simplify(`(= ${e1} ${e2})`);
            console.log("exp", expression)
            features.push({ expression, name });

        } catch (e) {
            if (!(e instanceof SyntaxError))
                throw e;

            console.log(e, name, m2.body);
            warning(`did not generate seed feature from function: ${name}`);
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

function getBodyToExpr(mode: string, metadata: Metadata) {
    const ids = fieldNames(metadata);

    return function bodyToExpr(block: Block): string {
        // const { statements: [ stmt, ...rest ] } = block;
        // if (rest.length > 0 || Statement.isReturn(stmt))
        //     throw Error('expected single return statement in observation function');

        debug(`block: %O`, block);

        const expr = normalizedReturn(block);
        debug(`expr: %O`, expr)

        const prefixed = prefixIdentifiers(expr, mode, ids);
        debug(`prefixed: %O`, prefixed);

        const sexpr = SExpr.fromNode(prefixed);
        debug(`sexpr: %O`, sexpr);

        return sexpr;
    }
}
