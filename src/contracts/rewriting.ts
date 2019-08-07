import fs from 'fs-extra';
import path from 'path';
import { SourceInfo } from '../frontend/metadata';

type Replacement = [RegExp, string];

export async function internalize(sourcePath: string, targetDir: string): Promise<SourceInfo> {
    const dirname = path.dirname(sourcePath);
    return replaceWithSuffix(sourcePath, targetDir, 'internalized',
        [/\bpublic*\s*payable\b/g, 'internal' ],
        [/\bexternal*\s*payable\b/g, 'internal' ],
        [/\bpublic\b/g, 'internal' ],
        [/\bexternal\b/g, 'internal' ],
        [/(?<=\bimport\b\s*("|'))[.][/]([^"']+)(?=("|'))/g, `${dirname}/$2`]);
}

export async function exemplify(sourcePath: string, targetDir: string): Promise<SourceInfo> {
    const dirname = path.dirname(sourcePath);
    return replaceWithSuffix(sourcePath, targetDir, 'exemplified',
        [/\bexternal\b/g, 'public'],
        [/\binternal\b/g, 'public'],
        [/(?<=\bimport\b\s*("|'))[.][/]([^"']+)(?=("|'))/g, `${dirname}/$2`]);
}

async function replaceWithSuffix(sourcePath: string, targetDir: string, suffix: string, ...replacements: Replacement[]) {
    const basename = path.basename(sourcePath, '.sol');
    const targetPath = path.join(targetDir, `${basename}.${suffix}.sol`);
    return replace(sourcePath, targetPath, ...replacements);
}

async function replace(sourcePath: string, targetPath: string, ...replacements: Replacement[]) {
    return rewrite(sourcePath, targetPath, (content) => {
        for (const [ expression, replacement ] of replacements)
            content = content.replace(expression, replacement);
        return content;
    });
}

async function rewrite(sourcePath: string, targetPath: string,
        rewrite: (content: string) => string): Promise<SourceInfo> {

    const buffer = await fs.readFile(sourcePath);
    const original = buffer.toString();
    const content = rewrite(original);
    return { path: targetPath, content };
}
