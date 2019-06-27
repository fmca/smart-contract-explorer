#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import { Examples } from '../contracts/examples';
import fs from 'fs-extra';

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
        const { metadata, examples: { positive, negative } } = await Examples.generate({ paths });
        const { source: { path, content } } = metadata;

        await fs.writeFile(path, content);
        await fs.writeFile(`positive-examples.txt`, positive.map(JSON.stringify as any).join(`\n`));
        await fs.writeFile(`negative-examples.txt`, negative.map(JSON.stringify as any).join(`\n`));

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
