import { Method } from './metadata';
import { SourceUnit } from './ast';
import fs from 'fs-extra';
import { Debugger } from './../utils/debug';

const debug = Debugger(__filename);

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
        [sourcePath: string]: {
            ast: SourceUnit
        }
    };
    contracts: {
        [sourcePath: string]: {
            [contractName: string]: {
                name: string;
                abi: Method[];
                userdoc: {
                    methods: { [_: string]: { notice: string } };
                }
                evm: {
                    bytecode: {
                        object: string;
                    }
                }
            }
        }
    };
    errors?: { formattedMessage: string }[];
};

export function compile(input: Input): Output {
    const json = JSON.stringify(input);
    const [ sourceName ] = Object.keys(input.sources);
    const { sources: { [sourceName]: { content }} } = input;
    const output = JSON.parse(solc.compile(json, findImports));
    debug(output);
    return output;
}


function findImports (path: string) {
    debug(`file name is: %s`, path);
    return  {contents: fs.readFileSync(path, "utf8")};
}
