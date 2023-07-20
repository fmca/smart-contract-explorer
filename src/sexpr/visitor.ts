import { Expr, Boperators, Uoperators } from './expression';

export class Visitor<T> {
    visit(expr: Expr): T {

        if (Array.isArray(expr))
        {
            const [hExpr, ...args] = expr;

            if (Array.isArray(hExpr))
                throw Error(`expected string head identifier`);

            const head = hExpr;

            switch (head) {
                case 'getattr':
                    checkArity(args, 2)
                    const [obj, attr] = args;
                    return this.visitMember(obj, attr);
                case 'index':
                    checkArity(args, 2);
                    const [ base, index ] = args;
                    return this.visitIndex(base, index);
                case '+': case '-': case '*': case '/': case '<': case '<=': case '>=': case '>':
                        checkArity(args, 2);
                        const [bleft, bright] = args;
                        return this.visitBinaryOperation(head, bleft, bright);
                case '=':
                        checkArity(args, 2);
                        const [eleft, eright] = args;
                        return this.visitBinaryOperation('==', eleft, eright);
                case 'or':
                        checkArity(args, 2);
                        const [orleft, orright] = args;
                        return this.visitBinaryOperation('||', orleft, orright);
                case 'not':
                        checkArity(args, 1);
                        const [usub] = args;
                        return this.visitUnaryOperation('!', usub);
                case 'and':
                        if (args.length < 2)
                            throw Error(`expected arity should be => 2, got ${args.length}`);
                        return this.visitAndOperation(args);
                case 'ite':
                        checkArity(args, 3);
                        const [itecond, itetrue, itefalse] = args;
                        return this.visitIteOperation(itecond, itetrue, itefalse);
                default:
                    return unimplemented(expr);
            }

        }

        else
        {
            if (typeof(expr) == 'boolean') {
                return this.visitLiteral((expr as boolean).toString());
            }
            else if (expr.charAt(0) === '-')
            {
                const usub = expr.substr(1);;
                return this.visitUnaryOperation('-', usub);
            }
            else
            {   if(/^\d+$/.test(expr))
                    return this.visitLiteral(expr);
                else
                    return this.visitIdentifier(expr);
            }

        }
    }

    visitIndex(base: Expr, index: Expr): T {
        return unimplemented([ 'index', base, index ]);
    }

    visitMember(obj: Expr, attr: Expr):T {
        return unimplemented([ 'member', obj, attr ]);
    }

    visitBinaryOperation(head: Boperators, bleft: Expr, bright: Expr): T {
        return unimplemented([ head, bleft, bright ]);
    }

    visitAndOperation(args: Expr[]): T {
        return unimplemented(args);
    }

    visitIteOperation(itecond: Expr, itetrue: Expr, itefalse: Expr): T {
        return unimplemented([itecond, itetrue, itefalse ]);
    }

    visitUnaryOperation(head: Uoperators, usub: Expr): T {
        return unimplemented([ head, usub]);
    }

    visitIdentifier(name: string): T {
        return unimplemented([name]);
    }

    visitLiteral(value: string): T {
        return unimplemented([value]);
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
