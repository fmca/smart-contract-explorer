import { Node, NodeVisitor, Identifier, Literal, IndexAccess, MemberAccess, BinaryOperation, UnaryOperation, Conditional, Assignment, FunctionCall } from '../solidity';
import * as Solidity from '../solidity/conversions';
import { Expr } from '../sexpr/expression';
import { Unit } from '../frontend/unit';

export function fromUnparsedExpression(string: string, scope?: Solidity.Scope): string {
    const expression = Expr.parse(string);
    return fromExpression(expression, scope);
}

export function fromExpression(expr: Expr, scope?: Solidity.Scope): string {
    const node = Solidity.fromExpression(expr, scope);
    const contract = fromNode(node);
    return contract;
}

export function fromNode(node: Node): string {
    const visitor = new NodeToContract();
    const contract = visitor.visit(node);
    return contract;
}

export async function parseSimulation(source: Unit, target: Unit, examples: Unit, lines: string[]) {

    const metadata = {
        source: await source.getMetadata(),
        target: await target.getMetadata(),
        examples: await examples.getMetadata()
    };

    function findVariable(name: string) { return metadata.examples.findFunction(name); }

    const simulation = lines.map(expr => {
        const code = fromUnparsedExpression(expr, { findVariable });
        return code
            .replace(/\bimpl\$/, `${metadata.source.getName()}.`)
            .replace(/\bspec\$/, `${metadata.target.getName()}.`);
    });

    return simulation;
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

    visitFunctionCall(node: FunctionCall) {
        const expression = this.visit(node.expression);
        const args = node.arguments.map(n => this.visit(n));
        return `${expression}(${args.join(', ')})`;
    }
}
