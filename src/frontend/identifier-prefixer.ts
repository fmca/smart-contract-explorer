import { Node } from './ast/node';
import { NodeSubstituter } from './ast/substituter';
import { Identifier, Expression } from './ast/expression';

export function prefixIdentifiers(expr: Expression, name: string, ids: string[]): Node {
    return new IdentifierPrefixer(name, ids).visit(expr);
}

class IdentifierPrefixer extends NodeSubstituter {

    constructor (public name: string, public ids: string[]) {
        super();
    }

    visitIdentifier(id: Identifier) {
        return this.ids.includes(id.name)
            ? { ...id, name: `${this.name}.${id.name}` }
            : id;
    }
}

