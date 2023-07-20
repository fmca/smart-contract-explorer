import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

interface App extends Array<Expr> { }
export type Expr = App | string;
export type Boperators = '+' | '-' | '*' | '/' | '||' | '&&' | '==' | '!=' | '<' | '<=' | '>=' | '>';
export type Uoperators = '-' | '!' | '--' | '++';

export namespace Expr {
    export function isApp(expr: Expr): expr is App {
        return Array.isArray(expr);
    }

    export function parse(string: string): Expr {
        debug(`original:        %o`, string);

        console.log("original", string);

        string = quoteUnquotedIdentifiers(string);
        debug(`quoted:          %o`, string);

        console.log("quoted", string);

        string = separateTermsByCommas(string);
        debug(`comma-separated: %o`, string);

        console.log("comma", string);
        const json = replaceUnquotedParenthesesByBrackets(string);

        console.log(json)
        
        debug(`parenthesized:   %o`, json);

        return JSON.parse(json);
    }

    function quoteUnquotedIdentifiers(string: string) {
        return string.replace(/(?<=[ (])([\w\-\+\/\*\!\=\<\>\_.$]+)(?=[ )])/g, '"$1"');
    }

    function separateTermsByCommas(string: string) {
        return string.replace(/(?<=[)"])(\s+)(?=[("])/g, ',$1');
    }

    function replaceUnquotedParenthesesByBrackets(string: string) {
        let quoted = false;
        let symbols = [''];

        for (const symbol of string) {

            if (symbol === '"')
                quoted = !quoted;

            if (quoted)
                symbols.push(symbol);

            else if (symbol === '(')
                symbols.push('[');

            else if (symbol === ')')
                symbols.push(']');

            else
                symbols.push(symbol);
        }

        return symbols.join('');
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
