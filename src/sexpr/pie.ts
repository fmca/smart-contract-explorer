import { TypeName, ElementaryType, ContractMember } from "../solidity";
import { Metadata } from "../frontend/metadata";

const { isVariableDeclaration } = ContractMember;

export function fieldNames({ members }: Metadata): string[] {
    return members.filter(isVariableDeclaration)
        .filter(f => f.stateVariable)
        .map(({ name }) => name);
}

export function type(typeName: TypeName): string {
    switch (typeName.nodeType) {
        case 'ElementaryTypeName':
            return primitiveType(typeName.name);
        case 'Mapping':
            return `Map[${type(typeName.keyType)},${type(typeName.valueType)}]`;
    }
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
