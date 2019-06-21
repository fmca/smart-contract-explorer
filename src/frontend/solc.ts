import { Method } from './metadata';

const solc = require('solc');

export interface Input {
    language: string;
    sources: {
        [name: string]: {
            content: string;
        }
    };
    settings: {
        outputSelection: {
            [_: string]: {
                [_: string]: string[]
            }
        }
    }
};

export interface Output {
    sources: {
        [name: string]: {
            ast: {
                nodes: { nodes: object }[]
            }
        }
    };
    contracts: {
        [name: string]: {
            name: string;
            abi: Method[];
            userdoc: {
                methods: object;
            }
            evm: {
                bytecode: {
                    object: string;
                }
            }
        }[]
    };
    errors?: { formattedMessage: string }[];
};

export function compile(input: Input): Output {
    const json = JSON.stringify(input);
    const output = JSON.parse(solc.compile(json));
    return output;
}
