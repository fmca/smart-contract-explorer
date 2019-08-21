import { NodeType, Node, node } from './node';
import { TypeDescriptions } from './type';

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
    kind: 'number' | 'bool';
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

export interface BinaryOperation extends Operation {
    nodeType: 'BinaryOperation';
    operator: BinaryOperator;
    leftExpression: Expression;
    rightExpression: Expression;
}

export interface FunctionCall extends Operation {
    nodeType: 'FunctionCall';
    expression: Expression;
    arguments: Expression[];
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

export function isExpression(e: Node): e is Expression {
    return e.argumentTypes !== undefined;
}

export function isIdentifier(e: Expression): e is Identifier {
    return e.nodeType === 'Identifier';
}

export function isUnary(e: Expression): e is UnaryOperation {
    return e.nodeType === 'UnaryOperation';
}

export function isBinary(e: Expression): e is BinaryOperation {
    return e.nodeType === 'BinaryOperation';
}

export function get<T extends NodeType>(nodeType: T, argumentTypes = null, typeDescriptions: TypeDescriptions = { typeIdentifier: '', typeString: '' }): Expression & { nodeType: T } {
    const n = node(nodeType);
    return { ...n, argumentTypes, typeDescriptions };
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

export function identifier(name: string): Identifier {
    const node = get('Identifier');
    const overloadedDeclarations: any[] = [];
    const referencedDeclaration = 0;
    return { ...node, name, overloadedDeclarations, referencedDeclaration };
}

export function literal(value: string, kind: 'number' | 'bool'): Literal {
    const node = get('Literal');
    return { ...node, value, kind };
}

export function call(expression: Expression, ...args: Expression[]): FunctionCall {
    const node = op('FunctionCall');
    return { ...node, expression, arguments: args };
}

export function index(baseExpression: Expression, indexExpression: Expression, lValueRequested = false): IndexAccess {
    const node = op('IndexAccess');
    return { ...node, baseExpression, indexExpression, lValueRequested };
}

export function conditional(condition: Expression, trueExpression: Expression, falseExpression: Expression): Conditional {
    const node = get('Conditional');
    return { ...node, condition, trueExpression, falseExpression };
}
