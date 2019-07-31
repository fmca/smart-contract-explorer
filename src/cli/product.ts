#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';
import { getSimulationCheckContract } from '../contracts/product';
import { lines } from '../utils/lines';

const args = yargs.usage(`usage: $0 --source <filename> --target <filename>`)
    .strict()
    .check(({ _: { length }}) => length === 0)
    .option('output', {
        describe: 'output directory',
        type: 'string',
        requriesArg: true,
        default: '.'
    })
    .option('source', {
        demandOption: true,
        describe: 'source smart contract',
        type: 'string',
        requiresArg: true
    })
    .option('target', {
        demandOption: true,
        describe: 'target smart contract',
        type: 'string',
        requiresArg: true
    })
    .option('check', {
        describe: 'attempt to verify the simulation contract',
        type: 'boolean'
    })
    .coerce(['source', 'target'], path.resolve)
    .help('help')
    .argv;

async function main() {

    try {
        const { source, target, check } = args;
        const dir = path.resolve(args.output);
        const paths = { source: source!, target: target! };
        const output = { name: 'SimulationCheck', path: path.join(dir, 'SimulationCheck.sol') };
        const { contract, internalized } = await getSimulationCheckContract({ paths, output });

        await fs.mkdirp(dir);
        for (const { path, content } of [contract, ...Object.values(internalized)])
            await fs.writeFile(path, content);

        if (check) {
            const command = `solc-verify.py`;
            const args = [output.path];
            const options = {};
            const { stdout, stderr } = await cp.spawn(command, args, options);

            for await (const line of lines(stdout))
                console.log(line);

            for await (const line of lines(stderr))
                console.error(line);
        }


    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
