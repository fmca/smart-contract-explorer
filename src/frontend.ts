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
    debug(`abi: %O`, abi);

    return { abi, bytecode };
}

export interface Metadata2 {
    abi: AbiItem[];
    name: string;
    userdoc: object;
    ast_field_nodes: object;
}

export async function compile2(filename: string[]): Promise<Metadata2[]> {
    const language = "Solidity";
    var val : Metadata2[] = [];

    
    for (let element in filename)
    {

        const content = await fs.readFile(filename[element], "utf8");
        const sources = { [filename[element]]: { content } };
        const settings = { outputSelection: { '*': { '*': [ '*' ], '': ['ast'] } } };
        const input = JSON.stringify({ language, sources, settings });

        debug(`compiling contract: %s`, filename[element]);
        const output = JSON.parse(solc.compile(input));
        
      

        const {errors, contracts, sources: sources_ast }= output;
        const {ast : {nodes}} = sources_ast[filename[element]];
        const {nodes: ast_field_nodes} = nodes[1];

        if (errors !== undefined) {
            const messages = [
                `could not compile contract ${filename[element]}`,
                ...errors.map(({ formattedMessage: msg }: any) => msg)
            ]
            throw Error(messages.join('\n'));
        }
        
        const [ [name, contract], ...rest ] = Object.entries(contracts[filename[element]]);

        if (rest.length > 0)
            throw Error('Expected single contract.');

        const { abi, userdoc: {methods: userdoc}, evm: {assembly, bytecode: { object: bytecode } } } = contract as any;
        //debug(`abi: %O`, abi);
        //debug(`userdoc, %O` , userdoc);
        //const userdoc = JSON.stringify(Doc);
        val.push({abi, name, userdoc, ast_field_nodes});
    };
   
    return val;
}

