import { Expr } from "./sexpr";
import { State } from "../explore/states";

type NodeType = 'SourceUnit'
    | 'PragmaDirective'
    | 'ImportDirective'
    | 'Contract'
    | 'ImportDirective'
    | 'ContractDefinition'
    | 'FunctionDefinition'
    | 'VariableDeclaration'
    | 'ParameterList'
    | 'Block'
    | 'ElementaryTypeName'
    | 'Mapping'
    | 'IfStatement'
    | 'ExpressionStatement'
    | 'Return'
    | 'Identifier'
    | 'Literal'
    | 'IndexAccess'
    | 'Assignment'
    | 'BinaryOperation'
    | 'UnaryOperation'
    | 'Conditional'
    | 'MemberAccess'

export interface Node {
    id: number;
    src: string;
    nodeType: NodeType;
    [_: string]: any;
}

export interface SourceUnit extends Node {
    nodeType: 'SourceUnit';
    nodes: SourceUnitElement[];
}

export type SourceUnitElement = PragmaDirective | ImportDirective | ContractDefinition;

export interface PragmaDirective extends Node {
    nodeType: 'PragmaDirective';
    literals: string[];
}

export interface ImportDirective extends Node {
    nodeType: 'ImportDirective';
    file: string;
    absolutePath: string;
    scope: number;
    sourceUnit: number;
    symbolAliases: any[];
    unitAlias: string;
}

export interface ContractDefinition extends Node {
    nodeType: 'ContractDefinition';
    baseContracts: any[];
    contractDependencies: any[];
    contractKind: ContractKind;
    documentation: null;
    fullyImplemented: boolean;
    linearizedBaseContracts: number[];
    name: string
    nodes: ContractMember[];
}

export type ContractKind = 'contract';

export interface ContractMember extends Node {

}

export interface FunctionDefinition extends ContractMember {
    nodeType: 'FunctionDefinition';

    kind: string;
    stateMutability: StateMutability;
    visibility: Visibility;

    name: string;
    body: Block;
    parameters: Parameters;
    returnParameters: ReturnParameters;
    documentation: string;
}

export interface Block extends Node {
    nodeType: 'Block';
    statements: Statement[];
}

export type StateMutability = 'payable' | 'nonpayable' | 'view';
export type Visibility = 'external' | 'public' | 'private' | 'internal';

export interface VariableDeclaration extends ContractMember {
    nodeType: 'VariableDeclaration';
    name: string;
    scope: number;
    constant: boolean;
    stateVariable: boolean;
    storageLocation: StorageLocation;
    typeDescriptions: TypeDescriptions;
    typeName: TypeName;
}


export type StorageLocation = 'default' | 'memory';

export interface TypeDescriptions {
    typeIdentifier: string;
    typeString: string;
}

export type TypeName = ElementaryTypeName | Mapping;

export interface TypeNameBase extends Node {
    typeDescriptions: TypeDescriptions;
}

export interface ElementaryTypeName extends TypeNameBase {
    nodeType: 'ElementaryTypeName';
    name: ElementaryType;
}

export type ElementaryType = 'uint256' | 'uint' | 'int' | 'string' | 'bytes' | 'address' | 'bool';

export interface Mapping extends TypeNameBase {
    nodeType: 'Mapping';
    keyType: TypeName;
    valueType: TypeName;
}

export interface ParameterList extends Node {
    nodeType: 'ParameterList';
}

export interface Parameters extends ParameterList {
    parameters: VariableDeclaration[];
}

export interface ReturnParameters extends ParameterList {
    parameters: VariableDeclaration[];
}

export interface Statement extends Node {

}

export interface IfStatement extends Statement {
    nodeType: 'IfStatement';
    condition: Expression;
    trueBody: Block;
    falseBody: Block | null;
}

export interface ExpressionStatement extends Statement {
    nodeType: 'ExpressionStatement';
    expression: Expression;
}

export interface Return extends Statement {
    nodeType: 'Return';
    expression: Expression;
}

export interface Expression extends Node {
    argumentTypes: null;
    typeDescriptions: TypeDescriptions;
}

export interface Identifier extends Expression {
    nodeType: 'Identifier';
    name: string;
    overloadedDeclarations: any[];
    referencedDeclaration: number;
}

export interface Literal extends Expression {
    nodeType: 'Literal';
    value : string;
}

export interface Operation extends Expression {
    isConstant: boolean;
    isLValue: boolean;
    isPure: boolean;
}

export interface IndexAccess extends Operation {
    nodeType: 'IndexAccess';
    baseExpression: Expression;
    indexExpression: Expression;
    lValueRequested: boolean;
}

export interface MemberAccess extends Operation {
    nodeType: 'MemberAccess';
    expression: Expression;
    memberName: string;
}

export interface Assignment extends Statement {
    nodeType: 'Assignment';
    operator: '=';
    rightHandSide: Expression;
    leftHandSide: Expression;
}

export interface BinaryOperation extends Operation {
    nodeType: 'BinaryOperation';
    operator: BinaryOperator;
    leftExpression: Expression;
    rightExpression: Expression;
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '||' | '&&' | '==' | '!=' | '<' | '<=' | '>=' | '>';

export interface UnaryOperation extends Operation {
    nodeType: 'UnaryOperation';
    prefix : boolean;
    operator: UnaryOperator;
    subExpression: Expression;
}

export type UnaryOperator = '-' | '!' | '--' | '++';

export interface Conditional extends Expression {
    nodeType: 'Conditional';
    condition: Expression;
    falseExpression: Expression;
    trueExpression: Expression;
}

export namespace SourceUnitElement {
    export function isContractDefinition(node: SourceUnitElement): node is ContractDefinition {
        return node.nodeType === 'ContractDefinition';
    }
}

export namespace ContractDefinition {
    export function * variables(contract: ContractDefinition): Iterable<VariableDeclaration> {
        for (const member of members(contract))
            if (ContractMember.isVariableDeclaration(member))
                yield member;
    }

    export function * functions(contract: ContractDefinition): Iterable<FunctionDefinition> {
        for (const member of members(contract))
            if (ContractMember.isFunctionDefinition(member))
                yield member;
    }

    export function * members(contract: ContractDefinition): Iterable<ContractMember> {
        for (const member of contract.nodes)
            yield member;
    }
}

export namespace ContractMember {
    export function isVariableDeclaration(node: ContractMember): node is VariableDeclaration {
        return node.nodeType === 'VariableDeclaration';
    }
    export function isFunctionDefinition(node: ContractMember): node is FunctionDefinition {
        return node.nodeType === 'FunctionDefinition';
    }
}

export namespace TypeName {
    export function isElementaryTypeName(node: TypeName): node is ElementaryTypeName {
        return node.nodeType === 'ElementaryTypeName';
    }
}

export namespace VariableDeclaration {
    export function isPayable(decl: VariableDeclaration) {
        return decl.typeDescriptions.typeString.split(' ').includes('payable');
    }
};

export namespace FunctionDefinition {
    export function isConstructor(method: FunctionDefinition) {
        return method.name === '';
    }

    export function visibility(method: FunctionDefinition) {
        return method.visibility;
    }

    export function mutability(method: FunctionDefinition) {
        return method.stateMutability;
    }

    export function * parameters(method: FunctionDefinition) {
        const { parameters: { parameters } } = method;
        for (const parameter of parameters)
            yield parameter;
    }

    export function * returns(method: FunctionDefinition) {
        const { returnParameters: { parameters } } = method;
        for (const parameter of parameters)
            yield parameter;
    }
};

export namespace Statement {

    export function isAssignment(s: Statement): s is Assignment {
        return s.nodeType === 'Assignment';
    }

    export function isIfStatement(s: Statement): s is IfStatement {
        return s.nodeType === 'IfStatement';
    }

    export function isExpressionStatement(s: Statement): s is ExpressionStatement {
        return s.nodeType === 'ExpressionStatement';
    }

    export function isReturn(s: Statement): s is Return {
        return s.nodeType === 'Return';
    }

    export function return_(expression: Expression): Return {
        const node = Node.get('Return');
        return { ...node, expression };
    }
}

export namespace Expression {
    export function prefixIdentifiers(expr: Expression, name: string, ids: string[]): Node {
        return new IdentifierPrefixer(name, ids).visit(expr);
    }

    export function isUnary(e: Expression): e is UnaryOperation {
        return e.nodeType === 'UnaryOperation';
    }

    export function isBinary(e: Expression): e is BinaryOperation {
        return e.nodeType === 'BinaryOperation';
    }

    export function get<T extends NodeType>(nodeType: T, argumentTypes = null, typeDescriptions: TypeDescriptions = { typeIdentifier: '', typeString: '' }): Expression & { nodeType: T } {
        const node = Node.get(nodeType);
        return { ...node, argumentTypes, typeDescriptions };
    }

    export function op<T extends NodeType>(nodeType: T, isConstant = false, isLValue = false, isPure = false) {
        const expr = get(nodeType);
        return { ...expr, isConstant, isLValue, isPure };
    }

    export function unary(operator: UnaryOperator, subExpression: Expression, prefix = true): UnaryOperation {
        const node = op('UnaryOperation');
        return { ...node, operator, prefix, subExpression };
    }

    export function binary(operator: BinaryOperator, leftExpression: Expression, rightExpression: Expression): BinaryOperation {
        const node = op('BinaryOperation');
        return { ...node, operator, leftExpression, rightExpression };
    }

    export const not = (e: Expression) => unary('!', e);
    export const and = (e1: Expression, e2: Expression) => binary('&&', e1, e2);
    export const or = (e1: Expression, e2: Expression) => binary('||', e1, e2);
    export const implies = (e1: Expression, e2: Expression) => or(not(e1), e2);

    export function conjunction([expr, ...exprs]: Expression[]): Expression {
        return exprs.reduce(and, expr);
    }

    export function disjunction([expr, ...exprs]: Expression[]): Expression {
        return exprs.reduce(or, expr);
    }

}

export namespace Node {

    export function isExpression(e: Node): e is Expression {
        return e.argumentTypes !== undefined;
    }

    export function toSExpr(node: Node): string {
        return new NodeToSExpr().visit(node);
    }

    export function toContract(node: Node): string {
        return new NodeToContract().visit(node);
    }

    export function get<T extends NodeType>(nodeType: T, id = -1, src = ''): Node & { nodeType: T } {
        return { nodeType, id, src } as Node & { nodeType: T };
    }
}

function unimplemented<T>(node: Node): T {
    throw Error(`unexpected ${node.nodeType} node`);
}

class NodeVisitor<T> {

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

        if (!Node.isExpression(rhs))
            throw Error(`Unexpected right-hand side node: ${rhs.nodeType}`);

        return Expression.implies(lhs, rhs);
    }

    visitReturn(stmt: Return) {
        return stmt.expression;
    }

    visitBlock(block: Block) {
        const statements = [...block.statements];
        const last = statements.pop();

        if (last === undefined || !Statement.isReturn(last) || !statements.every(Statement.isIfStatement))
            throw Error(`Unexpected block: ${block}`);

        const lastExpr = this.visit(last);

        if (!Node.isExpression(lastExpr))
            throw Error(`Unexpected node: ${lastExpr}`);

        if (statements.length === 0)
            return lastExpr;

        const nodes = statements.map(s => this.visit(s));

        if (!nodes.every(e => Node.isExpression(e)))
            throw Error(`Unexpected nodes: ${nodes}`);

        const expressions = nodes as Expression[];
        const conditions = collectConditions(expressions);
        console.log(`conditions: %O`, conditions);

        const excluded = Expression.not(Expression.disjunction(conditions));
        expressions.push(Expression.implies(excluded, lastExpr));
        const expression = Expression.conjunction(expressions);
        return expression;
    }
}

function collectConditions(exprs: Expression[]): Expression[] {
    return exprs.map(expr => {
        if (Expression.isBinary(expr)
                && expr.operator === '||'
                && Expression.isUnary(expr.leftExpression)
                && expr.leftExpression.operator == '!' ) {
            return expr.leftExpression.subExpression;
        } else {
            throw Error(`Unexpected expression: ${expr}`);
        }
    });
}

export function normalizedReturn(block: Block): Expression {
    const node = new ReturnNormalizer().visit(block);
    if (!Node.isExpression(node))
        throw Error(`Unexpected node: ${node}`);
    return node;
}
