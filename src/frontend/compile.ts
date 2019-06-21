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
    return fromSolcInput(filename, input);
}

async function fromSolcInput(filename: string, input: Solc.Input): Promise<Metadata> {
    const output = Solc.compile(input);
    handleErrors(filename, output);
    const metadata = toMetadata(filename, output);
    return metadata;
}

function handleErrors(filename: string, output: Solc.Output): void {
    const { errors } = output;
    if (errors !== undefined) {
        const messages = [
            `could not compile contract ${filename}`,
            ...errors.map(({ formattedMessage: msg }: any) => msg)
        ]
        throw Error(messages.join('\n'));
    }
}

function toMetadata(filename: string, output: Solc.Output) {
    const { contracts, sources: {[filename]: nodes} } = output;
    const { ast: { nodes: [ , { nodes: members }] } } = nodes;
    const [ [name, contract], ...rest ] = Object.entries(contracts[filename]);

    if (rest.length > 0)
        throw Error('Expected single contract.');

    const { abi, userdoc: { methods: userdoc }, evm: { bytecode: { object: bytecode } } } = contract;
    debug(`abi: %O`, abi);

    const metadata = { abi, name, bytecode, userdoc, members };
    return metadata;
}
