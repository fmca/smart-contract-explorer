
export interface Node {
    id: number;
    src: string;
    nodeType: string;
}

export interface SourceUnit extends Node {
    nodeType: 'SourceUnit';
    nodes: Node[];
}

export interface PragmaDirective extends Node {
    nodeType: 'PragmaDirective';
    literals: string[];
}

export interface ContractDefinition extends Node {
    nodeType: 'ContractDefinition';
    nodes: ContractMember[];
}

export interface ContractMember extends Node {

}

export interface FunctionDefinition extends ContractMember {
    nodeType: 'FunctionDefinition';
}

export interface VariableDeclaration extends ContractMember {
    nodeType: 'VariableDeclaration';
}

export interface Statement extends Node {

}

export interface Return extends Statement {
    nodeType: 'Return';
    expression: Expression;
}

export interface Expression extends Node {

}

export interface Identifier extends Expression {
    nodeType: 'Identifier';
    name: string;
}

export interface IndexAccess extends Expression {
    nodeType: 'IndexAccess';
    baseExpression: Expression;
    indexExpression: Expression;
}

export function toSExpr(node: Node): string {
    return new NodeToSExpr().visit(node);
}

export function toContract(node: Node): string {
    return new NodeToContract().visit(node);
}

function unimplemented(node: Node): string {
    throw Error(`unexpected ${node.nodeType} node`);
}

class NodeToString {

    fromIdentifier(node: Identifier): string {
        return unimplemented(node);
    };
    fromIndexAccess(node: IndexAccess): string {
        return unimplemented(node);
    }

    fromReturn(node: Return): string {
        return unimplemented(node);
    }

    visit(node: Node): string {
        const { nodeType } = node;
        switch (nodeType) {
            case 'Return':
                return this.fromReturn(node as Return);
            case 'Identifier':
                return this.fromIdentifier(node as Identifier);
            case 'IndexAccess':
                return this.fromIndexAccess(node as IndexAccess);
            default:
                throw Error(`unexpected node type: ${nodeType}`);
        }
    }
};

class NodeToSExpr extends NodeToString {

    fromIdentifier(node: Identifier) {
        return node.name;
    }

    fromIndexAccess(node: IndexAccess) {
        const base = this.visit(node.baseExpression);
        const index = this.visit(node.indexExpression);
        return `(index ${base} ${index})`;
    }
}

class NodeToContract extends NodeToString {

    fromIdentifier(node: Identifier) {
        return node.name;
    }

    fromIndexAccess(node: IndexAccess) {
        const base = this.visit(node.baseExpression);
        const index = this.visit(node.indexExpression);
        return `${base}[${index}]`;
    }
}
