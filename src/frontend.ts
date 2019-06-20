import fs from 'fs-extra';
import { ABIDefinition } from 'web3/eth/abi';
import { Debugger } from './debug';

const debug = Debugger(__filename);
const solc = require('solc');

export type Method = ABIDefinition;

export namespace Method {
    export function equals(m1: Method, m2: Method): boolean {
        return JSON.stringify(m1) === JSON.stringify(m2);
    }
}

export interface Metadata {
    name: string;
    abi: Method[];
    bytecode: string;
    userdoc: object;
    members: object;
}

export async function compile(filename: string): Promise<Metadata> {
    const language = "Solidity";
    const content = await fs.readFile(filename, "utf8");
    const sources = { [filename]: { content } };
    const settings = { outputSelection: { '*': { '*': [ '*' ], '': ['ast'] } } };
    const input = JSON.stringify({ language, sources, settings });

    debug(`compiling contract: %s`, filename);
    const { errors, contracts, sources: {[filename]: nodes} } = JSON.parse(solc.compile(input));
    const { ast: { nodes: [ , { nodes: members }] } } = nodes;

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

    const { abi, userdoc: { methods: userdoc }, evm: { bytecode: { object: bytecode } } } = contract as any;
    debug(`abi: %O`, abi);

    return { abi, name, bytecode, userdoc, members };
}
