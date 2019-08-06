import { Node } from './ast/node';
import { NodeVisitor } from './ast/visitor';
import { Identifier, Literal, IndexAccess, MemberAccess, BinaryOperation, UnaryOperation, Conditional, Expression, not, disjunction, implies, conjunction, isExpression, isBinary, isUnary } from './ast/expression';
import { Assignment, Block, Return, ExpressionStatement, IfStatement, isReturn, isIfStatement } from './ast/statement';

export function toSExpr(node: Node): string {
    return new NodeToSExpr().visit(node);
}

export function toContract(node: Node): string {
    return new NodeToContract().visit(node);
}

export function prefixIdentifiers(expr: Expression, name: string, ids: string[]): Node {
    return new IdentifierPrefixer(name, ids).visit(expr);
}

class NodeToSExpr extends NodeVisitor<string> {

    visitIdentifier(node: Identifier) {
        return node.name;
    }

    visitLiteral(node: Literal) {
        return node.value;
    }

    visitIndexAccess(node: IndexAccess) {
        const base = this.visit(node.baseExpression);
        const index = this.visit(node.indexExpression);
        return `(index ${base} ${index})`;
    }

    visitMemberAccess(node: MemberAccess) {
        const exper = this.visit(node.expression);
        return `${exper}.${node.memberName}`;
    }

    visitAssignment(node: Assignment) {
        const right = this.visit(node.rightHandSide);
        const left = this.visit(node.leftHandSide);
        return `(= ${left} ${right})`;
    }

    visitBinaryOperation(node: BinaryOperation) {
        const right = this.visit(node.rightExpression);
        const left = this.visit(node.leftExpression);
        switch (node.operator) {
            case '+': case '-': case '*': case '/': case '<': case '<=': case '>=': case '>':
                return `(${node.operator} ${left} ${right})`;
            case '==':
                return `(= ${left} ${right})`;
            case '||':
                return `(or ${left} ${right})`;
            case '&&':
                return `(and ${left} ${right})`;
            default:
                throw Error(`unexpected node operator: ${node.operator}`);
        }
    }

    visitUnaryOperation(node: UnaryOperation) {
        const sub = this.visit(node.subExpression);
        switch (node.operator) {
                case '!':
                    return `(not ${sub})`;
                case '-':
                    return `(-${sub})`;
                default:
                    throw Error(`unexpected node operator: ${node.operator}`);
        }
    }

    visitConditional(node: Conditional) {
        const condition = this.visit(node.condition);
        const trueE = this.visit(node.trueExpression);
        const falseE = this.visit(node.falseExpression);

        return `(ite ${condition} ${trueE} ${falseE})`;
    }
}

class NodeToContract extends NodeVisitor<string> {

    visitIdentifier(node: Identifier) {
        return node.name;
    }

    visitLiteral(node: Literal) {
        return node.value;
    }

    visitIndexAccess(node: IndexAccess) {
        const base = this.visit(node.baseExpression);
        const index = this.visit(node.indexExpression);
        return `${base}[${index}]`;
    }

    visitMemberAccess(node: MemberAccess) {
        const exper = this.visit(node.expression);
        return `${exper}.${node.memberName}`;
    }

    visitAssignment(node: Assignment) {
        const rightHandSide = this.visit(node.rightHandSide);
        const leftHandSide = this.visit(node.leftHandSide);
        return `${leftHandSide} = ${rightHandSide}`;
    }

    visitBinaryOperation(node: BinaryOperation) {
        const right = this.visit(node.rightExpression);
        const left = this.visit(node.leftExpression);
        return `${left} ${node.operator} ${right}`;
    }

    visitUnaryOperation(node: UnaryOperation) {
        const sub = this.visit(node.subExpression);
        if(node.prefix)
            return `${node.operator}(${sub})`;
        else
            return `${sub}${node.operator}`;
    }

    visitConditional(node: Conditional) {
        const condition = this.visit(node.condition);
        const trueE = this.visit(node.trueExpression);
        const falseE = this.visit(node.falseExpression);

        return `${condition}? ${trueE}: ${falseE}`;
    }
}

class NodeSubstituter extends NodeVisitor<Node> {

    visitBlock(block: Block): Node {
        const statements = block.statements.map(s => this.visit(s));
        return { ...block, statements };
    }

    visitReturn(stmt: Return): Node {
        const expression = this.visit(stmt.expression);
        return { ...stmt, expression };
    }

    visitExpressionStatement(stmt: ExpressionStatement) {
        const expression = this.visit(stmt.expression);
        return { ...stmt, expression };
    }

    visitAssignment(stmt: Assignment) {
        const leftHandSide = this.visit(stmt.leftHandSide);
        const rightHandSide = this.visit(stmt.rightHandSide);
        return { ...stmt, leftHandSide, rightHandSide };
    }

    visitIfStatement(stmt: IfStatement): Node {
        const trueBody = this.visit(stmt.trueBody)
        const falseBody = stmt.falseBody === null ? null : this.visit(stmt.falseBody);
        return { ...stmt, trueBody, falseBody }
    }

    visitIdentifier(node: Identifier) {
        return node;
    }

    visitLiteral(node: Literal) {
        return node;
    }

    visitIndexAccess(node: IndexAccess) {
        const baseExpression = this.visit(node.baseExpression);
        const indexExpression = this.visit(node.indexExpression);
        return { ...node, baseExpression, indexExpression };
    }

    visitMemberAccess(node: MemberAccess) {
        const exper = this.visit(node.expression);
        return { ...node, exper};
    }

    visitBinaryOperation(node: BinaryOperation) {
        const rightExpression = this.visit(node.rightExpression);
        const leftExpression = this.visit(node.leftExpression);
        return { ...node, leftExpression, rightExpression };
    }

    visitUnaryOperation(node: UnaryOperation) {
        const subExpression = this.visit(node.subExpression);
        return { ...node, subExpression };
    }

    visitConditional(node: Conditional) {
        const condition = this.visit(node.condition);
        const trueExpression = this.visit(node.trueExpression);
        const falseExpression = this.visit(node.falseExpression);
        return { ...node, condition, trueExpression, falseExpression };
    }
}

class IdentifierPrefixer extends NodeSubstituter {

    constructor (public name: string, public ids: string[]) {
        super();
    }

    visitIdentifier(id: Identifier) {
        return this.ids.includes(id.name)
            ? { ...id, name: `${this.name}.${id.name}` }
            : id;
    }
}

class ReturnNormalizer extends NodeSubstituter {

    visitIfStatement(stmt: IfStatement) {
        if (stmt.falseBody !== null)
            throw Error(`Unexpected else branch: ${stmt.falseBody}`);

        const lhs = stmt.condition;
        const rhs = this.visit(stmt.trueBody);

        if (!isExpression(rhs))
            throw Error(`Unexpected right-hand side node: ${rhs.nodeType}`);

        return implies(lhs, rhs);
    }

    visitReturn(stmt: Return) {
        return stmt.expression;
    }

    visitBlock(block: Block) {
        const statements = [...block.statements];
        const last = statements.pop();

        if (last === undefined || !isReturn(last) || !statements.every(isIfStatement))
            throw Error(`Unexpected block: ${block}`);

        const lastExpr = this.visit(last);

        if (!isExpression(lastExpr))
            throw Error(`Unexpected node: ${lastExpr}`);

        if (statements.length === 0)
            return lastExpr;

        const nodes = statements.map(s => this.visit(s));

        if (!nodes.every(e => isExpression(e)))
            throw Error(`Unexpected nodes: ${nodes}`);

        const expressions = nodes as Expression[];
        const conditions = collectConditions(expressions);
        console.log(`conditions: %O`, conditions);

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
            throw Error(`Unexpected expression: ${expr}`);
        }
    });
}

export function normalizedReturn(block: Block): Expression {
    const node = new ReturnNormalizer().visit(block);
    if (!isExpression(node))
        throw Error(`Unexpected node: ${node}`);
    return node;
}
