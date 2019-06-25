import { Node, IndexAccess, Identifier } from './ast';

interface App extends Array<Expr> { }
export type Expr = App | string;

export function parse(s: string): Expr {
    const json = s
        .replace(/(\w+)/g, '"$1"')
        .replace(/(?<=[)"])(\s+)(?=[("])/g, ',$1')
        .replace(/[(]/g, '[')
        .replace(/[)]/g, ']');
    return JSON.parse(json);
}

export function toNode(expr: Expr): Node {
    return new ExprToNode().visit(expr);
}

function unimplemented<T>(expr: Expr): T {
    const [head] = expr;
    throw Error(`unexpected ${head} expression`);
}

function checkArity<T>(args: T[], arity: number) {
    if (args.length !== arity)
        throw Error(`expected arity ${arity}, got ${args.length}`);
}

class Visitor<T> {
    visit(expr: Expr): T {
        const [hExpr, ...args] = expr;

        if (Array.isArray(hExpr))
            throw Error(`expected string head identifier`);

        const head = hExpr;

        if (args.length === 0)
            return this.visitIdentifier(head);

        switch (head) {
            case 'index':
                checkArity(args, 2);
                const [ base, index ] = args;
                return this.visitIndex(base, index);
            default:
                return unimplemented(expr);
        }
    }

    visitIndex(base: Expr, index: Expr): T {
        return unimplemented([ 'index', base, index ]);
    }

    visitIdentifier(name: string): T {
        return unimplemented([name]);
    }
}

class ExprToNode extends Visitor<Node> {

    visitIndex(base: Expr, index: Expr): IndexAccess {
        const id = 0;
        const src = "";
        const nodeType = 'IndexAccess';
        const baseExpression = this.visit(base);
        const indexExpression = this.visit(index);
        return { id, src, nodeType, baseExpression, indexExpression };
    }

    visitIdentifier(name: string): Identifier {
        const id = 0;
        const src = '';
        const nodeType = 'Identifier';
        return { id, src, nodeType, name };
    }
}
