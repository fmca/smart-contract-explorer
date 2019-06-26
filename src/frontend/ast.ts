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

export interface Literal extends Expression {
    nodeType: 'Literal';
    value : string;
}

export interface IndexAccess extends Expression {
    nodeType: 'IndexAccess';
    baseExpression: Expression;
    indexExpression: Expression;
}

export interface Assignment extends Expression {
    nodeType: 'Assignment';
    operator: '=';
    rightHandSide: Expression;
    leftHandSide: Expression;
}

export interface BinaryOperation extends Expression {
    nodeType: 'BinaryOperation';
    operator: '+' | '-' | '*' | '/' | '||' | '&&' | '==' | '!=' | '<' | '<=' | '>=' | '>' ;
    leftExpression: Expression;
    rightExpression: Expression;
}

export interface UnaryOperation extends Expression {
    nodeType: 'UnaryOperation';
    prefix : boolean;
    operator: '-' | '!' | '--' | '++' ;
    subExpression: Expression;
}

export interface Conditional extends Expression {
    nodeType: 'Conditional';
    condition: Expression;
    falseExpression: Expression;
    trueExpression: Expression;
}

export function toSExpr(node: Node): string {
    return new NodeToSExpr().visit(node);
}

export function toContract(node: Node): string {
    return new NodeToContract().visit(node);
}

function unimplemented<T>(node: Node): T {
    throw Error(`unexpected ${node.nodeType} node`);
}

class NodeVisitor<T> {

    visitIdentifier(node: Identifier): T {
        return unimplemented(node);
    }

    visitLiteral(node: Literal): T {
        return unimplemented(node);
    }

    visitIndexAccess(node: IndexAccess): T {
        return unimplemented(node);
    }

    visitReturn(node: Return): T {
        return unimplemented(node);
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
            default:
                throw Error(`unexpected node type: ${nodeType}`);
        }
    }
};

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
            return `${node.operator}${sub}`;
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
