import { Method } from './metadata';
import { SourceUnit } from '../solidity';
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

export interface Notice {
    notice: string;
}

export interface UserDoc extends Notice {
    methods: { [_:string]: Notice }
}

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
                userdoc: UserDoc;
                evm: {
                    bytecode: {
                        object: string;
                    }
                }
            }
        }
    };
    errors?: Error[];
};

export interface Error {
    component: string;
    formattedMessage: string;
    message: string;
    type: ErrorType;
    severity: Severity;
    sourceLocation: SourceLocation;
}

export type ErrorType = 'Warning' | 'Error';
export type Severity = 'warning' | 'error';
export interface SourceLocation {
    file: string;
    start: number;
    end: number;
}

export function compile(input: Input): Output {
    debug(`compile(%O)`, input);
    const json = JSON.stringify(input);
    const [ sourceName ] = Object.keys(input.sources);
    const { sources: { [sourceName]: { content }} } = input;
    const output = JSON.parse(solc.compile(json, findImports));
    debug(output);
    return output;
}


function findImports (path: string) {
    debug(`findImports(%s)`, path);
    return { contents: fs.readFileSync(path, "utf8") };
}
