import { NodeSubstituter, Expression, not, disjunction, implies, conjunction, isExpression, isBinary, isUnary, Block, Return, IfStatement, isReturn, isIfStatement } from '../solidity';

export function normalizedReturn(block: Block): Expression {
    const node = new ReturnNormalizer().visit(block);
    if (!isExpression(node))
        throw SyntaxError(`Unexpected node: ${node}`);
    return node;
}

class ReturnNormalizer extends NodeSubstituter {

    visitIfStatement(stmt: IfStatement) {
        if (stmt.falseBody !== null)
            throw SyntaxError(`Unexpected else branch: ${stmt.falseBody}`);

        const lhs = stmt.condition;
        const rhs = this.visit(stmt.trueBody);

        if (!isExpression(rhs))
            throw SyntaxError(`Unexpected right-hand side node: ${rhs.nodeType}`);

        return implies(lhs, rhs);
    }

    visitReturn(stmt: Return) {
        return stmt.expression;
    }

    visitBlock(block: Block) {
        const statements = [...block.statements];
        const last = statements.pop();

        if (last === undefined || !isReturn(last) || !statements.every(isIfStatement))
            throw SyntaxError(`Unexpected block: ${block}`);

        const lastExpr = this.visit(last);

        if (!isExpression(lastExpr))
            throw SyntaxError(`Unexpected node: ${lastExpr}`);

        if (statements.length === 0)
            return lastExpr;

        const nodes = statements.map(s => this.visit(s));

        if (!nodes.every(e => isExpression(e)))
            throw SyntaxError(`Unexpected nodes: ${nodes}`);

        const expressions = nodes as Expression[];
        const conditions = collectConditions(expressions);
        const excluded = not(disjunction(conditions));
        expressions.push(implies(excluded, lastExpr));
        const expression = conjunction(expressions);
        return expression;
    }
}

function collectConditions(exprs: Expression[]): Expression[] {
    return exprs.map(expr => {
        if (isBinary(expr)
                && expr.operator === '||'
                && isUnary(expr.leftExpression)
                && expr.leftExpression.operator == '!' ) {
            return expr.leftExpression.subExpression;
        } else {
            throw SyntaxError(`Unexpected expression: ${expr}`);
        }
    });
}
