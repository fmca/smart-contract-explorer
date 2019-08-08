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

export type IntegerType = 'uint256' | 'uint' | 'int';

export type ElementaryType = IntegerType | 'string' | 'bytes' | 'address' | 'bool' | 'bytes4';

export interface Mapping extends TypeNameBase {
    nodeType: 'Mapping';
    keyType: TypeName;
    valueType: TypeName;
}

export function isElementaryTypeName(node: TypeName): node is ElementaryTypeName {
    return node.nodeType === 'ElementaryTypeName';
}

export function isIntegerType(name: ElementaryType): name is IntegerType {
    return ['uint256', 'uint', 'int'].includes(name);
}

export function isMapping(node: TypeName): node is Mapping {
    return node.nodeType == 'Mapping';
}

export function getKeyTypesAndValueType(mapping: Mapping) {
    let { keyType, valueType } = mapping;
    const keyTypes = [keyType];

    while (isMapping(valueType)) {
        keyType = valueType.keyType;
        valueType = valueType.valueType;
        keyTypes.push(keyType);
    }

    return { keyTypes, valueType };
}

