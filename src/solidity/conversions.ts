import { Expr, Boperators, Uoperators } from '../sexpr/expression';
import { Visitor } from '../sexpr/visitor';
import { Node, Expression, IndexAccess, BinaryOperation, Conditional, UnaryOperation, Identifier, Literal } from '.';
import { binary, unary, index, isIdentifier, call, identifier, Operation, literal, conditional } from './expression';
import { isMapping } from './type';
import { ContractMember } from './declaration';

export interface Scope {
    findVariable(name: string): ContractMember | undefined;
}

export function fromUnparsedExpression(string: string, scope?: Scope): Node {
    const expression = Expr.parse(string);
    const node = fromExpression(expression, scope);
    return node;
}

export function fromExpression(expr: Expr, scope?: Scope): Node {
    const visitor = new ExprToNode(scope);
    const node = visitor.visit(expr);
    return node;
}

class ExprToNode extends Visitor<Expression> {

    constructor(public scope?: Scope) {
        super();
    }

    visitIndex(base: Expr, idx: Expr): IndexAccess {
        const baseExpression = this.visit(base);
        const indexExpression = this.visit(idx);
        return index(baseExpression, indexExpression);
    }

    visitBinaryOperation(operator: Boperators, lhs: Expr, rhs: Expr): Operation {
        const leftExpression = this.visit(lhs);
        const rightExpression = this.visit(rhs);
        const op = binary(operator, leftExpression, rightExpression);

        return this.isVerifierEquals(op)
            ? call(identifier(`__verifier_eq`), leftExpression, rightExpression)
            : op;
    }

    visitAndOperation(args: Expr): BinaryOperation {
        const [left, ...rest] = args;
        const operator = '&&';
        const leftExpression = this.visit(left);
        const rightExpression = (rest.length > 1)
            ? this.visitAndOperation(rest)
            : this.visit(rest[0]);
        return binary(operator, leftExpression, rightExpression);
    }

    visitIteOperation(itecond: Expr, itetrue: Expr, itefalse: Expr): Conditional {
        const condition = this.visit(itecond);
        const falseExpression = this.visit(itefalse);
        const trueExpression = this.visit(itetrue);
        return conditional(condition, trueExpression, falseExpression);
    }

    visitUnaryOperation(operator: Uoperators, usub: Expr): UnaryOperation {
        const prefix = true;
        const subExpression = this.visit(usub);
        return unary(operator, subExpression, prefix);
    }

    visitIdentifier(name: string): Identifier {
        return identifier(name);
    }

    visitLiteral(value: string): Literal {
        const kind = 'number';
        return literal(value, kind);
    }

    isVerifierEquals(op: BinaryOperation) {
        const { operator, leftExpression } = op;

        if (this.scope === undefined || operator !== '==' || !isIdentifier(leftExpression))
            return false;

        const variable = this.scope.findVariable(leftExpression.name);

        if (variable === undefined)
            return false;

        if (ContractMember.isVariableDeclaration(variable) && isMapping(variable.typeName))
            return true;

        if (ContractMember.isFunctionDefinition(variable) && variable.name.includes('$'))
            return true;

        return false;
    }
}
