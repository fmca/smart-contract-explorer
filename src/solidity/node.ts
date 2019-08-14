export type NodeType = 'SourceUnit'
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
    | 'ArrayTypeName'
    | 'UserDefinedTypeName'
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

export function node<T extends NodeType>(nodeType: T, id = -1, src = ''): Node & { nodeType: T } {
    return { nodeType, id, src } as Node & { nodeType: T };
}
