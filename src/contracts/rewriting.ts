import fs from 'fs-extra';
import path from 'path';
import { SourceInfo } from '../frontend/metadata';
import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

export async function internalize(sourcePath: string, targetDir: string): Promise<SourceInfo> {
    const dirname = path.dirname(sourcePath);
    const transform = internalizeTransform(dirname);
    return rewrite(sourcePath, targetDir, 'internalized', transform);
}

export async function exemplify(sourcePath: string, targetDir: string): Promise<SourceInfo> {
    const dirname = path.dirname(sourcePath);
    const transform = exemplifyTransform(dirname);
    return rewrite(sourcePath, targetDir, 'exemplified', transform);
}

async function rewrite(sourcePath: string, targetDir: string, suffix: string,
        rewrite: (content: string) => string): Promise<SourceInfo> {

    const basename = path.basename(sourcePath, '.sol');
    const targetPath = path.join(targetDir, `${basename}.${suffix}.sol`);
    const buffer = await fs.readFile(sourcePath);
    const original = buffer.toString();
    const content = rewrite(original);
    return { path: targetPath, content };
}

function internalizeTransform(dirname: string) {
    return function (content: string) {
        content = internalizePublicAndExternal(content);
        content = moveImports(dirname, content);
        // content = qualifyStructs(content);
        return content;
    }
}

function exemplifyTransform(dirname: string) {
    return function (content: string) {
        content = publicizeInternalAndExternal(content);
        content = moveImports(dirname, content);
        return content;
    }
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
        .replace(/\bexternal\b/g, 'public')
        .replace(/\binternal\b/g, 'public');
}

function qualifyStructs(content: string) {
    const name = getContractName(content);
    const matches = content.match(/(?<=\bstruct\b\s+)([^\s{])+(?=[\s{])/g);
    const structs = matches === null ? [] : [...matches];
    const regexp = new RegExp(`\\b(${structs.join('|')})\\b`, 'g');
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
