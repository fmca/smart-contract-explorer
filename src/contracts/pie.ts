import { VariableDeclaration, TypeName, ElementaryType, isVariableDeclaration } from "../frontend/ast";
import { Metadata } from "../frontend/metadata";

export function fields({ members }: Metadata): string[] {
    return members.filter(isVariableDeclaration)
        .filter(f => f.stateVariable)
        .map(field);
}

export function field({ name, typeName }: VariableDeclaration): string {
    return `${name}: ${type(typeName)}`;
}

export function type(typeName: TypeName): string {
    switch (typeName.nodeType) {
        case 'ElementaryTypeName':
            return primitiveType(typeName.name);
        case 'Mapping':
            return `Map ${type(typeName.keyType)} ${type(typeName.valueType)}`;
    }
}

function primitiveType(name: ElementaryType) {
    switch (name) {

        case 'bool':
            return 'Bool';

        case 'int':
            return 'Int';

        case 'string':
            return 'String';

        // TODO should address be int?
        case 'address':
            return 'Int';

        default:
            throw new Error(`unexpected type: ${name}`);
    }
}