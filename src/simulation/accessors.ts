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
};

export async function storageAccessorsForPie(unit: Unit): Promise<Iterable<ExpressionData>> {
    const metadata = await unit.getMetadata();
    return storageAccessors();

    function * storageAccessors() {
        for (const variable of metadata.getVariables()) {
            if (variable.constant)
                continue;

            const { name, typeName } = variable;
            yield getAccessor(metadata.name, name, typeName);
        }

        for (const path of sumExpressionPaths(metadata))
            yield getSumAccessor(metadata.name, path);
    }
}

export function * sumExpressionPaths(metadata: Metadata): Iterable<Path> {
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

            return;
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

export function getAccessor(prefix: string, name: string, typeName: Solidity.TypeName) {
    const pieType = type(typeName);
    return getAccessorFromPieType(prefix, name, pieType);
}

export function getAccessorFromPieType(prefix: string, name: string, pieType: string) {
    const id = [prefix, name].join('$');
    const evaluatorExpression = id;
    const verifierExpression = id;
    const expressionData = { id, pieType, evaluatorExpression, verifierExpression };
    return expressionData;
}

export function getSumAccessor(prefix: string, path: Path) {
    const { elements, typeName } = path;
    const strings = elements.map(elem => Solidity.isNode(elem) ? elem.name : elem);
    const id = ['sum', prefix, ...strings].join('$');
    const pieType = 'Sum';
    const evaluatorExpression = id;
    const access = (elem: string) => elem.match(/^(u?int\d*|address)$/) ? `[__verifier_idx_${elem}]` : `.${elem}`;
    const accessor = [prefix, '$', strings[0], ...strings.slice(1).map(access)].join('');
    const type = typeName.name;
    const verifierExpression = `__verifier_sum_${type}(${accessor})`;
    const expressionData = { id, pieType, evaluatorExpression, verifierExpression };
    return expressionData;
}
