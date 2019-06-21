import fs from 'fs-extra';
import { Debugger } from '../utils/debug';
import * as Solc from './solc';
import { Metadata } from './metadata';

const debug = Debugger(__filename);

export async function fromFile(filename: string): Promise<Metadata> {
    const content = await fs.readFile(filename, "utf8");
    return fromString(filename, content);
}

export async function fromString(filename: string, content: string): Promise<Metadata> {
    const language = "Solidity";
    const sources = { [filename]: { content } };
    const settings = { outputSelection: { '*': { '*': [ '*' ], '': ['ast'] } } };
    const input = { language, sources, settings };
    return fromSolcInput(input);
}

async function fromSolcInput(input: Solc.Input): Promise<Metadata> {
    const output = Solc.compile(input);
    handleErrors(output);
    const metadata = toMetadata(output);
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

function toMetadata(output: Solc.Output) {
    const { contracts, sources} = output;
    const sourceEntries = Object.entries(sources);

    if (sourceEntries.length != 1)
        throw Error(`expected single source`);

    const [ [sourceName, nodes] ] = sourceEntries;
    const { ast: { nodes: [ , { nodes: members }] } } = nodes;
    const contractEntries = Object.entries(contracts[sourceName]);

    if (contractEntries.length != 1)
        throw Error('expected single contract');

    const [ [name, contract] ] = contractEntries;

    const { abi, userdoc: { methods: userdoc }, evm: { bytecode: { object: bytecode } } } = contract;
    debug(`abi: %O`, abi);

    const metadata = { abi, name, bytecode, userdoc, members };
    return metadata;
}
