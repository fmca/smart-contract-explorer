import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import { Unit } from '../frontend/unit';
import * as Solidity from '../solidity';
import { type } from "../sexpr/pie";
import { ExpressionData } from './simulation-data';
import { Metadata } from '../frontend/metadata';

export type PathElement = Solidity.ElementaryTypeName | string;
export type Path = {
    elements: PathElement[];
    typeName: Solidity.ElementaryTypeName;
}

export async function storageAccessorsForPie(unit: Unit): Promise<Iterable<ExpressionData>> {
    const metadata = await unit.getMetadata();
    const paths = await sumExpressionPaths(unit);
    return storageAccessors();

    function * storageAccessors() {
        for (const variable of metadata.getVariables()) {
            if (variable.constant)
                continue;

            const { name, typeName } = variable;
            const { typeDescriptions: { typeString } } = typeName;
            debug(`storageAccessorForPie for %o of type %O`, name, typeName);

            const prefix = `${metadata.getName()}$${name}`;

            yield {
                id: prefix,
                pieType: type(typeName),
                evaluatorExpression: prefix,
                verifierExpression: prefix
            };
        }

        for (const { elements, typeName } of paths) {
            const path = elements.map(elem => typeof(elem) === 'string' ? elem : elem.name);
            const id = ['sum', metadata.name, ...path].join('$');
            const pieType = 'Sum';
            const evaluatorExpression = id;
            const accessor = [metadata.name, '$', ...path].map(p => p.replace(/^(u?int\d*|address)$/, '[__verifier_idx_$1]')).join('');
            const type = typeName.name;
            const verifierExpression = `__verifier_sum_${type}(${accessor})`;
            yield { id, pieType, evaluatorExpression, verifierExpression };
        }
    }
}

export async function sumExpressionPaths(unit: Unit): Promise<Iterable<Path>> {
    const metadata = await unit.getMetadata();
    return sumExpressionPathsOfMetadata(metadata);
}

export function * sumExpressionPathsOfMetadata(metadata: Metadata): Iterable<Path> {
    for (const variable of metadata.getVariables()) {
        const { name, typeName } = variable;
        if (Solidity.isMapping(typeName)) {
            if (Solidity.isMapping(typeName.valueType)) {
                continue;
            }

            for (const path of paths([name], typeName))
                yield path;
        }
    }

    function * paths(elements: PathElement[], typeName: Solidity.TypeName): Iterable<Path> {
        const { typeDescriptions: { typeString } } = typeName;

        if (Solidity.isElementaryTypeName(typeName)) {
            if (Solidity.isIntegerType(typeName.name))
                yield { elements, typeName };

            return;
        }

        if (Solidity.isUserDefinedTypeName(typeName)) {
            const { name } = typeName;
            const decl = metadata.findStruct(name);
            if (decl === undefined)
                throw Error(`Unknown struct name: ${name}`);

            for (const { name, typeName } of decl.members)
                for (const path of paths([...elements, name], typeName))
                    yield path;
        }

        if (Solidity.isMapping(typeName)) {
            const { keyType, valueType } = typeName;

            if (!Solidity.isElementaryTypeName(keyType))
                throw Error(`Unexpected type name: ${keyType}`);

            for (const path of paths([...elements, keyType], valueType))
                yield path;

            return;
        }

        throw Error(`Unexpected type: ${typeString}`);
    }
}
