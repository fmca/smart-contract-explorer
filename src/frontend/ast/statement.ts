import { Node, node } from './node';
import { Expression } from './expression';

export interface Block extends Node {
    nodeType: 'Block';
    statements: Statement[];
}

export interface Statement extends Node {

}

export interface Assignment extends Statement {
    nodeType: 'Assignment';
    operator: '=';
    rightHandSide: Expression;
    leftHandSide: Expression;
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
    const n = node('Return');
    return { ...n, expression };
}
