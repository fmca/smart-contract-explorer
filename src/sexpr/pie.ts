import { TypeName, ElementaryType, ContractMember, isElementaryTypeName, isMapping, isArrayTypeName, isUserDefinedTypeName } from "../solidity";
import { Metadata } from "../frontend/metadata";

const { isVariableDeclaration } = ContractMember;

export function fieldNames(metadata: Metadata): string[] {
    return metadata.getMembers().filter(isVariableDeclaration)
        .filter(f => f.stateVariable)
        .map(({ name }) => name);
}

export function type(typeName: TypeName): string {
    const { typeDescriptions: { typeString } } = typeName;

    if (isElementaryTypeName(typeName))
        return primitiveType(typeName.name);

    if (isArrayTypeName(typeName))
        return `Array[${type(typeName.baseType)}]`;

    if (isMapping(typeName))
        return `Map[${type(typeName.keyType)},${type(typeName.valueType)}]`;

    if (isUserDefinedTypeName(typeName))
        return typeName.name;

    throw Error(`Unexpected type name: ${typeString}`)
}

function primitiveType(name: ElementaryType) {

    if (name.match(/^u?int\d*$/))
        return `Int`;

    if (name.match(/^bytes\d*$/))
        return `Int`;

    if (name === 'bool')
        return `Int`;

    if (name === 'string')
        return `String`;

    if (name === 'address')
        return `Address`;

    throw new Error(`unexpected type: ${name}`);
}
