#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import fs from 'fs-extra';
import cp from 'child_process';
import { getSimulationCheckContract } from '../contracts/product';
import { lines } from '../utils/lines';

const args = yargs.usage(`usage: $0 --source <filename> --target <filename>`)
    .strict()
    .check(({ _: { length }}) => length === 0)
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
    .help('help')
    .argv;

async function main() {

    try {
        const { source, target, check } = args;
        const paths = { source, target };
        const { metadata } = await getSimulationCheckContract({ paths });
        const { source: { path, content } } = metadata;

        await fs.writeFile(path, content);

        if (check) {
            const command = `solc-verify.py`;
            const args = [path];
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
