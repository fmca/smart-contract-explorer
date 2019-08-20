#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';
import * as Examples from '../simulation/examples';
import * as Product from '../simulation/product';
import { SimulationCounterExample } from '../simulation/counterexample';
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
    .option('states', {
        describe: 'number of states to explore',
        type: 'number',
        default: 5
    })
    .option('relation', {
        describe: 'append to the simulation relation',
        type: 'string',
        requiresArg: true
    })
    .option('synthesize', {
        describe: 'attempt to synthesize the simulation relation',
        type: 'boolean',
        default: true
    })
    .option('verify', {
        describe: 'attempt to verify the simulation contract',
        type: 'boolean',
        default: true
    })
    .coerce(['source', 'target'], path.resolve)
    .help('help')
    .argv;

async function main() {
    try {
        const { version } = require(path.join(__dirname, '../../package.json'))
        const { relation, synthesize, verify } = args;

        console.log();
        console.log(`${args.$0} version ${version}`);
        console.log();

        if (relation === undefined)
            await generateExamples();

        if (relation === undefined && synthesize)
            await generateSimulation();

        if (verify)
            await checkSimulation();

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

async function generateExamples() {
    console.log(`---`);
    console.log(`Generating examples`);
    console.log(`---`);

    const { source, target, states } = args;
    const dir = path.resolve(args.output);

    const output = { name: 'SimulationExamples', path: path.join(dir, 'SimulationExamples.sol') };
    const paths = { source: source!, target: target! };
    const { contract, examples: { positive, negative }, fields, seedFeatures, exemplified } = await Examples.generateExamples({ paths, output, states });

    await fs.mkdirp(dir);
    for (const { path, content } of [contract, ...Object.values(exemplified)])
        await fs.writeFile(path, content);

    await fs.writeFile(path.join(dir, `positive-examples.txt`), positive.map(e => `${JSON.stringify(e)}\n`).join(''));
    await fs.writeFile(path.join(dir, `negative-examples.txt`), negative.map(e => `${JSON.stringify(e)}\n`).join(''));
    await fs.writeFile(path.join(dir, `fields.txt`), fields.join(`\n`) + '\n');
    await fs.writeFile(path.join(dir, `seed-features.txt`), seedFeatures.join(`\n`) + '\n');
}

async function generateSimulation() {
    console.log(`---`);
    console.log(`TODO generate simulation relation`);
    console.log(`---`);
}

async function checkSimulation() {
    console.log(`---`);
    console.log(`Checking simulation relation`);
    console.log(`---`);

    const { source, target } = args;
    const dir = path.resolve(args.output);
    const paths = { source: source!, target: target! };
    const output = { name: 'SimulationCheck', path: path.join(dir, 'SimulationCheck.sol') };
    const { contract, internalized } = await Product.getSimulationCheckContract({ paths, output });

    await fs.mkdirp(dir);
    for (const { path, content } of [contract, ...Object.values(internalized)])
        await fs.writeFile(path, content);

    {
        const command = `solc-verify.py`;
        const args = [output.path];
        const options = {};
        const { stdout, stderr } = await cp.spawn(command, args, options);

        for await (const line of lines(stdout))
            console.log(line);

        for await (const line of lines(stderr))
            console.error(line);
    }
}

main();
