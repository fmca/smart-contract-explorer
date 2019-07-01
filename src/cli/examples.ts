#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import path from 'path';
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
    .coerce(['source', 'target'], path.resolve)
    .help('help')
    .argv;

async function main() {

    try {
        const { source, target } = args;

        const output = { name: 'SimulationExamples', path: path.resolve('SimulationExamples.sol') };
        const paths = { source: source!, target: target! };
        const { metadata, examples: { positive, negative }, fields, seedFeatures } = await Examples.generate({ paths, output });
        const { source: { path: p, content } } = metadata;

        await fs.writeFile(p, content);
        await fs.writeFile(`positive-examples.txt`, positive.map(JSON.stringify as any).join(`\n`));
        await fs.writeFile(`negative-examples.txt`, negative.map(JSON.stringify as any).join(`\n`));
        await fs.writeFile(`fields.txt`, fields.join(`\n`));
        await fs.writeFile(`seed-features.txt`, seedFeatures.join(`\n`));

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
