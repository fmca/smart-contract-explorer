import { Node, IndexAccess, Identifier, BinaryOperation, UnaryOperation, Assignment, Literal } from './ast';

interface App extends Array<Expr> { }
export type Expr = App | string;
type Boperators = '+' | '-' | '*' | '/' | '||' | '&&' | '==' | '!=' | '<' | '<=' | '>=' | '>';
type Uoperators = '-' | '!' | '--' | '++';

export namespace Expr {
    export function parse(s: string): Expr {
        const json = s
            .replace(/([\w\-+\|\/\*\!\=\<\>\&]+)/g, '"$1"')
            .replace(/(?<=[)"])(\s+)(?=[("])/g, ',$1')
            .replace(/[(]/g, '[')
            .replace(/[)]/g, ']');
        return JSON.parse(json);
    }

    export function toNode(expr: Expr): Node {
        return new ExprToNode().visit(expr);
    }
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
            if(/^\d+$/.test(head))
                return this.visitIdentifier(head);
            else 
                return this.visitLiteral(head);

        switch (head) {
            case 'index':
                checkArity(args, 2);
                const [ base, index ] = args;
                return this.visitIndex(base, index);
            case '+': case '-': case '*': case '/': case '||': case '&&': case '==': case '!=': case '<': case '<=': case '>=': case '>':
                    checkArity(args, 2);
                    const [bleft, bright] = args;
                    return this.visitBinaryOperation(head, bleft, bright);
            case '-': case '!': case '--': case '++':
                    checkArity(args, 1);
                    const [usub] = args;
                    return this.visitUnaryOperation(head, usub);
            case '=':
                    checkArity(args, 2);
                    const [lhs,rhs] = args;
                    return this.visitAssignment(lhs,rhs);
            default:
                return unimplemented(expr);
        }
    }

    visitIndex(base: Expr, index: Expr): T {
        return unimplemented([ 'index', base, index ]);
    }

    visitBinaryOperation(head: Boperators, bleft: Expr, bright: Expr): T {
        return unimplemented([ head, bleft, bright ]);
    }

    visitUnaryOperation(head: Uoperators, usub: Expr): T {
        return unimplemented([ head, usub]);
    }

    visitAssignment(lhs: Expr, rhs: Expr): T {
        return unimplemented([ '=', lhs, rhs ]);
    }

    visitIdentifier(name: string): T {
        return unimplemented([name]);
    }

    visitLiteral(value: string): T {
        return unimplemented([value]);
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

    visitBinaryOperation(boperator: Boperators, bleft: Expr, bright: Expr): BinaryOperation {
        const id = 0;
        const src = "";
        const nodeType = 'BinaryOperation';
        const operator = boperator;
        const leftExpression = this.visit(bleft);
        const rightExpression = this.visit(bright);
        return { id, src, nodeType, operator, leftExpression, rightExpression };
    }

    visitUnaryOperation(uoperator: Uoperators, usub: Expr): UnaryOperation {
        const id = 0;
        const src = "";
        const nodeType = 'UnaryOperation';
        const prefix = true;
        const operator = uoperator;
        const subExpression = this.visit(usub);
        return { id, src, nodeType, prefix, operator, subExpression};
    }

    visitAssignment(lhs: Expr, rhs: Expr): Assignment {
        const id = 0;
        const src = "";
        const nodeType = 'Assignment';
        const operator = '=';
        const leftHandSide = this.visit(lhs);
        const rightHandSide = this.visit(rhs);
        return { id, src, nodeType, operator, rightHandSide, leftHandSide };
    }

    visitIdentifier(name: string): Identifier {
        const id = 0;
        const src = '';
        const nodeType = 'Identifier';
        return { id, src, nodeType, name };
    }

    visitLiteral(value: string): Literal {
        const id = 0;
        const src = '';
        const nodeType = 'Literal';
        return { id, src, nodeType, value };
    }
}
