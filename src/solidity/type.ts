import { Node, node } from './node';

export interface TypeDescriptions {
    typeIdentifier: string;
    typeString: string;
}

export type TypeName = ElementaryTypeName | ArrayTypeName | Mapping | UserDefinedTypeName;

export interface TypeNameBase extends Node {
    typeDescriptions: TypeDescriptions;
}

export interface ElementaryTypeName extends TypeNameBase {
    nodeType: 'ElementaryTypeName';
    name: ElementaryType;
}

export interface ArrayTypeName extends TypeNameBase {
    nodeType: 'ArrayTypeName';
    baseType: TypeName;
    length: number | null;
}

export interface UserDefinedTypeName extends TypeNameBase {
    nodeType: 'UserDefinedTypeName';
    name: string;
}

export type IntegerType = 'int256' | 'uint256' | 'uint' | 'int';

export type ElementaryType = IntegerType | 'string' | 'bytes' | 'address' | 'bool' | 'bytes4' | 'bytes8' | 'bytes16' | 'bytes24' | 'bytes32';

export interface Mapping extends TypeNameBase {
    nodeType: 'Mapping';
    keyType: TypeName;
    valueType: TypeName;
}

export function isElementaryTypeName(node: TypeName): node is ElementaryTypeName {
    return node.nodeType === 'ElementaryTypeName';
}

export function isArrayTypeName(node: TypeName): node is ArrayTypeName {
    return node.nodeType === 'ArrayTypeName';
}

export function isUserDefinedTypeName(node: TypeName): node is UserDefinedTypeName {
    return node.nodeType === 'UserDefinedTypeName';
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

export function descriptions(typeIdentifier: string, typeString: string) {
    return { typeIdentifier, typeString };
}

export function elementary(name: ElementaryType, typeDescriptions?: TypeDescriptions): ElementaryTypeName {

    if (typeDescriptions === undefined) {
        const typeIdentifier = `t_${name}`;
        const typeString = name;
        typeDescriptions = { typeIdentifier, typeString };
    }

    return { ...node('ElementaryTypeName'), name, typeDescriptions };
}

export function mapping(keyType: TypeName, valueType: TypeName, typeDescriptions?: TypeDescriptions): Mapping {

    if (typeDescriptions === undefined) {
        const { typeDescriptions: { typeIdentifier: k1, typeString: k2 } } = keyType;
        const { typeDescriptions: { typeIdentifier: v1, typeString: v2 } } = valueType;
        const typeIdentifier = `t_mapping$_t_${k1}_$_t_${v1}_$`;
        const typeString = `mapping(${k2} => ${v2})`;
        typeDescriptions = { typeIdentifier, typeString };
    }

    return { ...node('Mapping'), keyType, valueType, typeDescriptions };
}
