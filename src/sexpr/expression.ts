interface App extends Array<Expr> { }
export type Expr = App | string;
export type Boperators = '+' | '-' | '*' | '/' | '||' | '&&' | '==' | '!=' | '<' | '<=' | '>=' | '>';
export type Uoperators = '-' | '!' | '--' | '++';

export namespace Expr {
    export function isApp(expr: Expr): expr is App {
        return Array.isArray(expr);
    }

    export function parse(s: string): Expr {
        //const alphabet = /[\w\-+\|\/\*\!\=\<\>\&]/;
        // const alphabet = '[\w\-\+\/\*\!\=\<\>\_]+';
        const json = s
            .replace(/([\w\-\+\/\*\!\=\<\>\_.]+)/g, '"$1"')
            .replace(/(?<=[)"])(\s+)(?=[("])/g, ',$1')
            .replace(/[(]/g, '[')
            .replace(/[)]/g, ']');
        return JSON.parse(json);
    }

    export function equals(e1: Expr, e2: Expr) {
        return JSON.stringify(e1) === JSON.stringify(e2);
    }

    export function toString(expr: Expr): string {
        return JSON.stringify(expr)
            .replace(/\[/g, '(')
            .replace(/\]/g, ')')
            .replace(/"/g, '')
            .replace(/,/g, ' ');
    }
}
