import { Node, NodeSubstituter, Identifier, Expression  } from '../solidity';

export function prefixIdentifiers(expr: Expression, name: string, ids: string[]): Node {
    return new IdentifierPrefixer(name, ids).visit(expr);
}

class IdentifierPrefixer extends NodeSubstituter {

    constructor (public name: string, public ids: string[]) {
        super();
    }

    visitIdentifier(id: Identifier) {
        return this.ids.includes(id.name)
            ? { ...id, name: `${this.name}$${id.name}` }
            : id;
    }
}

