import { Node } from './node';
import { NodeVisitor } from './visitor';
import { Identifier, Literal, IndexAccess, MemberAccess, BinaryOperation, UnaryOperation, Conditional } from './expression';
import { Assignment, Block, Return, ExpressionStatement, IfStatement } from './statement';

export class NodeSubstituter extends NodeVisitor<Node> {

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
