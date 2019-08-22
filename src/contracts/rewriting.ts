import { Debugger } from '../utils/debug';
import { Unit } from '../frontend/unit';
const debug = Debugger(__filename);

export async function annotate(unit: Unit, clauses: string[], annotated: Unit) {
    const specification = clauses.map(c => `/// @notice simulation ${c}`).join('\n');

    function rewrite(content: string) {
        return content
            .replace(/^(?=\bcontract\b)/m, `${specification}\n`);
    }
    await unit.rewriteInto(rewrite, annotated);
}

export async function internalize(source: Unit, target: Unit) {
    const transform = internalizeTransform(target.getDirname());
    await source.rewriteInto(transform, target);
}

export async function exemplify(source: Unit, target: Unit) {
    const transform = exemplifyTransform(target.getDirname());
    await source.rewriteInto(transform, target);
}

function internalizeTransform(dirname: string) {
    return function (content: string) {
        content = internalizePublicAndExternal(content);
        content = moveImports(dirname, content);
        content = qualifyStructs(content);
        return content;
    }
}

function exemplifyTransform(dirname: string) {
    return function (content: string) {
        content = publicizeInternalAndExternal(content);
        content = addLengthAccessors(content);
        content = moveImports(dirname, content);
        return content;
    }
}

function addLengthAccessors(content: string) {
    return content
        .replace(/(?<=^(\s*)\S+\[\] public (\S+);)/m, `\n$1function $2$$length() public view returns (uint) { return $2.length; }`);
}

function moveImports(dirname: string, content: string) {
    return content
        .replace(/(?<=\bimport\b\s*("|'))[.][/]([^"']+)(?=("|'))/g, `${dirname}/$2`);
}

function internalizePublicAndExternal(content: string) {
    return content
        .replace(/\bpublic*\s*payable\b/g, 'internal')
        .replace(/\bexternal*\s*payable\b/g, 'internal')
        .replace(/\bpublic\b/g, 'internal')
        .replace(/\bexternal\b/g, 'internal');
}

function publicizeInternalAndExternal(content: string) {
    return content
        .replace(/\bmapping\b\s*\((.*)\)\s*([^;()\s]*)\s*;/g, 'mapping ($1) public $2;')
        .replace(/\bexternal\b/g, 'public')
        .replace(/\binternal\b/g, 'public');
}

function qualifyStructs(content: string) {
    const name = getContractName(content);
    const structs = content.match(/(?<=\bstruct\b\s+)([^\s{])+(?=[\s{])/g);

    if (structs === null)
        return content;

    const regexp = new RegExp(`\\b(${structs.join('|')})\\b`, 'g');

    debug(`replacing structs: %o`, structs);
    const replaced = content.replace(regexp, `${name}$$$1`);
    return replaced;
}

function getContractName(content: string) {
    const match = content.match(/\bcontract\b\s+([^\s{}]+).*[{]/);
    if (match === null)
        throw Error(`Cannot determine contract name`);

    const [ , name ] = match;
    debug(`contract name: %s`, name);
    return name;
}
