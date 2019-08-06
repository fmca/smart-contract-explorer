#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import path from 'path';
import { Examples } from '../contracts/examples';
import fs from 'fs-extra';
import { SimulationCounterExample } from '../explore/counterexample';

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
    .option('states', {
        describe: 'number of states to explore',
        type: 'number',
        default: 5
    })
    .coerce(['source', 'target'], path.resolve)
    .help('help')
    .argv;

async function main() {

    try {
        const { source, target, states } = args;
        const dir = path.resolve(args.output);

        const output = { name: 'SimulationExamples', path: path.join(dir, 'SimulationExamples.sol') };
        const paths = { source: source!, target: target! };
        const { contract, examples: { positive, negative }, fields, seedFeatures, exemplified } = await Examples.generate({ paths, output, states });

        await fs.mkdirp(dir);
        for (const { path, content } of [contract, ...Object.values(exemplified)])
            await fs.writeFile(path, content);

        await fs.writeFile(path.join(dir, `positive-examples.txt`), positive.map(e => `${JSON.stringify(e)}\n`).join(''));
        await fs.writeFile(path.join(dir, `negative-examples.txt`), negative.map(e => `${JSON.stringify(e)}\n`).join(''));
        await fs.writeFile(path.join(dir, `fields.txt`), fields.join(`\n`) + '\n');
        await fs.writeFile(path.join(dir, `seed-features.txt`), seedFeatures.join(`\n`) + '\n');

    } catch (e) {
        if (e instanceof SimulationCounterExample) {
            const { source, target } = e;
            console.log();
            console.log(`Found a simulation counterexample; the source state`);
            console.log();
            console.log(`  ${source}`);
            console.log();
            console.log(`is not simulated by target state`);
            console.log();
            console.log(`  ${target}`);
            console.log();

        } else {
            console.error(e);
        }

    } finally {
        process.exit();
    }
}

main();
