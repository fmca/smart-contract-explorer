import fs from 'fs-extra';
import { Debugger } from '../utils/debug';
import * as Solc from './solc';
import { Metadata, SourceInfo } from './metadata';
import { SourceUnit } from './ast';

const debug = Debugger(__filename);


export async function fromFile(filename: string): Promise<Metadata> {
    const code = await fs.readFile(filename, "utf8");
    return fromString(filename, code);
}

export function fromString(sourceName: string, source: string): Metadata {
    const language = "Solidity";
    const sources = { [sourceName]: { content: source } };
    const settings = { outputSelection: { '*': { '*': [ '*' ], '': ['ast'] } } };
    const input = { language, sources, settings };
    return fromSolcInput(input);
}

 function fromSolcInput(input: Solc.Input): Metadata {
    const [ path ] = Object.keys(input.sources);
    const { sources: { [path]: { content }} } = input;
    const output = Solc.compile(input);
    handleErrors(output);
    debug(`output: %O`, output);
    const metadata = toMetadata(output, {path, content});
    debug(`metadata: %O`, metadata);
    return metadata;
}

function handleErrors(output: Solc.Output): void {
    const { sources, errors } = output;

    if (errors !== undefined) {
        const filenames = Object.keys(sources);
        const messages = [
            `could not compile contracts from ${filenames.join(', ')}`,
            ...errors.map(({ formattedMessage: msg }: any) => msg)
        ]
        throw Error(messages.join('\n'));
    }
}

function toMetadata(output: Solc.Output, source: SourceInfo): Metadata {
    const { contracts, sources } = output;
    debug(`ts: %O`, contracts);
    
    const { path } = source;
    const { ast } = sources[path];
    const { nodes: [ , { nodes: members }] } = ast as any;
    const contractEntries = Object.entries(contracts[path]);

    if (contractEntries.length != 1)
        throw Error('expected single contract');

    const [ [name, contract] ] = contractEntries;

    const { abi, userdoc: { methods: userdoc }, evm: { bytecode: { object: bytecode } } } = contract;
    debug(`abi: %O`, abi);

    const metadata = { abi, name, source: source, bytecode, userdoc, ast, members };
    return metadata;
}
