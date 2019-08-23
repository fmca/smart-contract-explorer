import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

import { Unit } from '../frontend/unit';
import * as Solidity from '../solidity';
import { type } from "../sexpr/pie";
import { TypeName } from '../solidity';

export async function storageAccessorsForPie(unit: Unit): Promise<Iterable<string>> {
    const metadata = await unit.getMetadata();
    return storageAccessors();

    function * storageAccessors() {
        for (const variable of metadata.getVariables()) {
            if (variable.constant)
                continue;

            const { name, typeName } = variable;
            const { typeDescriptions: { typeString } } = typeName;
            debug(`storageAccessorForPie for %o of type %O`, name, typeName);

            const prefix = `${metadata.getName()}$${name}`;

            yield `"${prefix}": ${type(typeName)}`;

            if (Solidity.isMapping(variable.typeName) &&
                !Solidity.isElementaryTypeName(variable.typeName.valueType)) {

                console.error(`Warning: did not sum accessor for mapping: ${variable.name}`);
                continue;
            }

            if (Solidity.isMapping(typeName)) {
                for (const path of storageAccessorPaths(prefix, variable.typeName)) {
                    debug(`path: %o`, path);
                    yield path;
                }
            }
        }
    }

    function * storageAccessorPaths(prefix: string, typeName: TypeName): Iterable<string> {
        const { typeDescriptions: { typeString } } = typeName;

        if (Solidity.isElementaryTypeName(typeName)) {
            if (Solidity.isIntegerType(typeName.name))
                yield `"__verifier_sum_${typeName.name}(${prefix})": Sum`;

            return;
        }

        if (Solidity.isUserDefinedTypeName(typeName)) {
            const { name } = typeName;

            const decl = metadata.findStruct(name);

            if (decl === undefined)
                throw Error(`Unknown struct name: ${name}`);

            for (const { name, typeName } of decl.members)
                for (const path of storageAccessorPaths(`${prefix}.${name}`, typeName))
                    yield path;

            return;
        }

        if (Solidity.isMapping(typeName)) {
            const { keyType, valueType } = typeName;

            if (!Solidity.isElementaryTypeName(keyType))
                throw Error(`Unexpected type name: ${keyType}`);

            for (const path of storageAccessorPaths(`${prefix}[__verifier_idx_${keyType.name}]`, valueType))
                yield path;

            return;
        }

        throw Error(`Unexpected type: ${typeString}`);
    }
}
