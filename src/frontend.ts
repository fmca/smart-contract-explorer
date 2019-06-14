import fs from 'fs-extra';
import { AbiItem } from 'web3-utils';
import { Debugger } from './debug';

const debug = Debugger(__filename);
const solc = require('solc');

export interface Metadata {
    abi: AbiItem[];
    bytecode: string;
}

export async function compile(filename: string): Promise<Metadata> {
    const language = "Solidity";
    const content = await fs.readFile(filename, "utf8");
    const sources = { [filename]: { content } };
    const settings = { outputSelection: { '*': { '*': [ '*' ] } } };
    const input = JSON.stringify({ language, sources, settings });

    debug(`compiling contract: %s`, filename);
    const { errors, contracts } = JSON.parse(solc.compile(input));

    if (errors !== undefined) {
        const messages = [
            `could not compile contract ${filename}`,
            ...errors.map(({ formattedMessage: msg }: any) => msg)
        ]
        throw Error(messages.join('\n'));
    }

    const [ [name, contract], ...rest ] = Object.entries(contracts[filename]);

    if (rest.length > 0)
        throw Error('Expected single contract.');

    const { abi, evm: { bytecode: { object: bytecode } } } = contract as any;
    return { abi, bytecode };
}
