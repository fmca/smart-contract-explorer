import { Expr, Boperators, Uoperators } from '../sexpr/expression';
import { Visitor } from '../sexpr/visitor';
import { Node, Expression, IndexAccess, BinaryOperation, Conditional, UnaryOperation, Identifier, Literal } from '../solidity';

export function toNode(expr: Expr): Node {
    return new ExprToNode().visit(expr);
}

class ExprToNode extends Visitor<Expression> {

    visitIndex(base: Expr, index: Expr): IndexAccess {
        const id = 0;
        const src = "";
        const nodeType = 'IndexAccess';
        const baseExpression = this.visit(base);
        const indexExpression = this.visit(index);
        const expression = { id, src, nodeType, baseExpression, indexExpression };
        return expression as IndexAccess;
    }

    visitBinaryOperation(boperator: Boperators, bleft: Expr, bright: Expr): BinaryOperation {
        const id = 0;
        const src = "";
        const nodeType = 'BinaryOperation';
        const operator = boperator;
        const leftExpression = this.visit(bleft);
        const rightExpression = this.visit(bright);
        const expression = { id, src, nodeType, operator, leftExpression, rightExpression };
        return expression as BinaryOperation;
    }

    visitAndOperation(args: Expr): BinaryOperation {
        const [lExpr, ...rargs] = args;
        const id = 0;
        const src = "";
        const nodeType = 'BinaryOperation';
        const operator = '&&';
        var rightExpression;
        if (rargs.length > 1)
            rightExpression = this.visitAndOperation(rargs);
        else
            rightExpression = this.visit(rargs[0]);

        const leftExpression = this.visit(lExpr);
        const expression = { id, src, nodeType, operator, leftExpression, rightExpression };
        return expression as BinaryOperation;
    }

    visitIteOperation(itecond: Expr, itetrue: Expr, itefalse: Expr): Conditional {
        const id = 0;
        const src = "";
        const nodeType = 'Conditional';
        const condition = this.visit(itecond);
        const falseExpression = this.visit(itefalse);
        const trueExpression = this.visit(itetrue);
        const expression = { id, src, nodeType, condition, falseExpression, trueExpression };
        return expression as Conditional;
    }

    visitUnaryOperation(uoperator: Uoperators, usub: Expr): UnaryOperation {
        const id = 0;
        const src = "";
        const nodeType = 'UnaryOperation';
        const prefix = true;
        const operator = uoperator;
        const subExpression = this.visit(usub);
        const expression = { id, src, nodeType, prefix, operator, subExpression};
        return expression as UnaryOperation;
    }

    visitIdentifier(name: string): Identifier {
        const id = 0;
        const src = '';
        const nodeType = 'Identifier';
        const expression = { id, src, nodeType, name };
        return expression as Identifier;
    }

    visitLiteral(value: string): Literal {
        const id = 0;
        const src = '';
        const nodeType = 'Literal';
        const expression = { id, src, nodeType, value };
        return expression as Literal;
    }
}
