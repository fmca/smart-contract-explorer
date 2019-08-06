import fs from 'fs-extra';
import { Debugger } from '../utils/debug';
import * as Solc from './solc';
import { Metadata, SourceInfo } from './metadata';

const debug = Debugger(__filename);


export async function fromFile(path: string): Promise<Metadata> {
    const content = await fs.readFile(path, "utf8");
    return fromString({ path, content });
}

export function fromString(source: SourceInfo): Metadata {
    const { path, content } = source;
    const language = "Solidity";
    const sources = { [path]: { content } };
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
    const info = { path, content };
    const metadata = toMetadata(output, info);
    debug(`metadata: %O`, metadata);
    return metadata;
}

function handleErrors(output: Solc.Output): void {
    const { sources, errors } = output;
    debug(`errors: %O`, errors);

    if (errors === undefined)
        return;

    if (errors.some(({ severity }) => severity === 'error')) {
        const filenames = Object.keys(sources);
        const messages = [
            `could not compile contracts from ${filenames.join(', ')}`,
            ...errors.map(({ formattedMessage: msg }: any) => msg)
        ]
        throw Error(messages.join('\n'));
    }

    for (const { formattedMessage } of errors)
        console.error(formattedMessage);
}

function toMetadata(output: Solc.Output, source: SourceInfo): Metadata {
    const { contracts, sources } = output;
    debug(`contracts: %O`, contracts);
    debug(`sources: %O`, sources);

    const { path } = source;
    const { ast } = sources[path];
    const { nodes: [ , { nodes: members }] } = ast as any;
    const contractEntries = Object.entries(contracts[path]);

    if (contractEntries.length != 1)
        throw Error('expected single contract');

    const [ [name, contract] ] = contractEntries;

    const { abi, userdoc, evm: { bytecode: { object: bytecode } } } = contract;
    debug(`abi: %O`, abi);

    const metadata = { abi, name, source, bytecode, userdoc, ast, members };
    return metadata;
}
