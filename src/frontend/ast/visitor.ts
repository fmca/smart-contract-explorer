import { Node } from './node';
import { Block, IfStatement, Return, ExpressionStatement, Assignment } from './statement';
import { Identifier, Literal, IndexAccess, MemberAccess, BinaryOperation, UnaryOperation, Conditional } from './expression';

export class NodeVisitor<T> {

    visitBlock(node: Block): T {
        return unimplemented(node);
    }

    visitIdentifier(node: Identifier): T {
        return unimplemented(node);
    }

    visitLiteral(node: Literal): T {
        return unimplemented(node);
    }

    visitIndexAccess(node: IndexAccess): T {
        return unimplemented(node);
    }

    visitMemberAccess(node: MemberAccess): T {
        return unimplemented(node);
    }

    visitIfStatement(node: IfStatement): T {
        return unimplemented(node);
    }

    visitReturn(node: Return): T {
        return unimplemented(node);
    }

    visitExpressionStatement(node: ExpressionStatement): T {
        return unimplemented(node)
    }

    visitAssignment(node: Assignment): T {
        return unimplemented(node);
    }

    visitBinaryOperation(node: BinaryOperation): T {
        return unimplemented(node);
    }

    visitUnaryOperation(node: UnaryOperation): T {
        return unimplemented(node);
    }

    visitConditional(node: Conditional): T {
        return unimplemented(node);
    }

    visit(node: Node): T {
        // throw Error(`expression is : %${JSON.stringify(node)}`);
        const { nodeType } = node;
        switch (nodeType) {
            case 'Return':
                return this.visitReturn(node as Return);
            case 'IfStatement':
                return this.visitIfStatement(node as IfStatement);
            case 'Block':
                return this.visitBlock(node as Block);
            case 'Identifier':
                return this.visitIdentifier(node as Identifier);
            case 'IndexAccess':
                return this.visitIndexAccess(node as IndexAccess);
            case 'Assignment':
                return this.visitAssignment(node as Assignment);
            case 'BinaryOperation':
                return this.visitBinaryOperation(node as BinaryOperation);
            case 'UnaryOperation':
                return this.visitUnaryOperation(node as UnaryOperation);
            case 'Conditional':
                return this.visitConditional(node as Conditional);
            case 'Literal':
                return this.visitLiteral(node as Literal);
            case 'MemberAccess':
                return this.visitMemberAccess(node as MemberAccess);
            default:
                throw Error(`unexpected node type: ${nodeType}`);
        }
    }
};

function unimplemented<T>(node: Node): T {
    throw Error(`unexpected ${node.nodeType} node`);
}
