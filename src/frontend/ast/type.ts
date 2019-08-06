import { Node } from './node';

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

export function isElementaryTypeName(node: TypeName): node is ElementaryTypeName {
    return node.nodeType === 'ElementaryTypeName';
}
