#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import fs from 'fs-extra';
import { getSimulationCheckContract } from '../contracts/product';

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
    .help('help')
    .argv;

async function main() {

    try {
        const { source, target } = args;
        const paths = { source, target };
        const { metadata } = await getSimulationCheckContract({ paths });
        const { source: { path, content } } = metadata;

        await fs.writeFile(path, content);

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
