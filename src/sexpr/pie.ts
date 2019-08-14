import { TypeName, ElementaryType, ContractMember, isElementaryTypeName, isMapping, isArrayTypeName, isUserDefinedTypeName } from "../solidity";
import { Metadata } from "../frontend/metadata";
import { isArray } from "util";

const { isVariableDeclaration } = ContractMember;

export function fieldNames({ members }: Metadata): string[] {
    return members.filter(isVariableDeclaration)
        .filter(f => f.stateVariable)
        .map(({ name }) => name);
}

export function type(typeName: TypeName): string {
    const { typeDescriptions: { typeString } } = typeName;

    if (isElementaryTypeName(typeName))
        return primitiveType(typeName.name);

    if (isArrayTypeName(typeName))
        return `${type(typeName.baseType)}[]`;

    if (isMapping(typeName))
        return `Map[${type(typeName.keyType)},${type(typeName.valueType)}]`;

    if (isUserDefinedTypeName(typeName))
        return typeName.name;

    throw Error(`Unexpected type name: ${typeString}`)
}

function primitiveType(name: ElementaryType) {
    switch (name) {

        case 'bool':
            return 'Bool';

        case 'bytes4':
            return 'Int';

        case 'int':
            return 'Int';

        case 'uint':
            return 'Int';

        case 'uint256':
            return 'Int';

        case 'string':
            return 'String';

        // TODO should address be int?
        case 'address':
            return 'Address';

        default:
            throw new Error(`unexpected type: ${name}`);
    }
}
