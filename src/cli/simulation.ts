#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import cp, { ChildProcess } from 'child_process';
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
        default: '.sc-simulation.ignore'
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
    .option('examples', {
        describe: 'generate examples for synthesis',
        type: 'boolean',
        default: true
    })
    .option('synthesize', {
        describe: 'synthesize the simulation relation',
        type: 'boolean',
        default: true
    })
    .option('verify', {
        describe: 'verify the simulation contract',
        type: 'boolean',
        default: true
    })
    .coerce(['source', 'target'], path.resolve)
    .help('help')
    .argv;

async function main() {
    try {
        const { version } = require(path.join(__dirname, '../../package.json'))
        const { examples, synthesize, verify } = args;

        console.log();
        console.log(`${args.$0} version ${version}`);
        console.log();

        if (examples)
            await generateExamples();

        if (synthesize)
            await synthesizeSimulation();

        if (verify)
            await verifySimulation();

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

const files = <const>[
    'positive-examples.txt',
    'negative-examples.txt',
    'seed-features.txt',
    'fields.txt',
    'constants.txt',
    'SimulationExamples.sol',
    'SimulationCheck.sol'
];

type Paths = {
    [path in (typeof files)[number]]: string;
}

async function getPaths(): Promise<Paths> {
    const dir = path.resolve(args.output);
    await fs.mkdirp(dir);
    const ary = files.map(file => [file, path.join(dir, file)]);
    return Object.fromEntries(ary) as Paths;
}

async function generateExamples() {
    console.log(`---`);
    console.log(`Generating examples`);
    console.log(`---`);

    const { source, target, states } = args;
    const { 'SimulationExamples.sol': path, ...ps } = await getPaths();
    const output = { name: 'SimulationExamples', path };

    const paths = { source: source!, target: target! };
    const { contract, examples: { positive, negative }, fields, seedFeatures, exemplified } = await Examples.generateExamples({ paths, output, states });

    for (const { path, content } of [contract, ...Object.values(exemplified)])
        await fs.writeFile(path, content);

    await fs.writeFile(ps[`positive-examples.txt`], positive.map(e => `${JSON.stringify(e)}\n`).join(''));
    await fs.writeFile(ps[`negative-examples.txt`], negative.map(e => `${JSON.stringify(e)}\n`).join(''));
    await fs.writeFile(ps[`seed-features.txt`], seedFeatures.join(`\n`) + '\n');
    await fs.writeFile(ps[`fields.txt`], fields.join(`\n`) + '\n');
    await fs.writeFile(ps[`constants.txt`], '\n');

    console.log();
}

async function synthesizeSimulation() {
    console.log(`---`);
    console.log(`Synthesizing simulation relation`);
    console.log(`---`);

    const paths = await getPaths();
    const result = await pie(paths);
    console.log();

    if (!result)
        throw Error(`Unable to synthesize simulation relation`);
}

async function verifySimulation() {
    console.log(`---`);
    console.log(`Checking simulation relation`);
    console.log(`---`);

    const { source, target } = args;
    const paths = { source: source!, target: target! };
    const { 'SimulationCheck.sol': path } = await getPaths();
    const output = { name: 'SimulationCheck', path };
    const { contract, internalized } = await Product.getSimulationCheckContract({ paths, output });

    for (const { path, content } of [contract, ...Object.values(internalized)])
        await fs.writeFile(path, content);

    const result = await solcVerify(path);
    console.log();

    if (!result)
        throw Error(`Unable to verify simulation relation`);
}

async function pie(paths: Paths) {
    const command = `lig-symbolic-infer`;
    const args: string[] = [];

    for (const file of files.filter(f => f.endsWith('.txt')))
        args.push(`--${path.basename(file, '.txt')}`, paths[file])

    const options = {};
    const childProcess = cp.spawn(command, args, options);
    const result = await processOutput(childProcess);
    return result;
}

async function solcVerify(path: string) {
    const command = `solc-verify.py`;
    const args = [path];
    const options = {};
    const childProcess = cp.spawn(command, args, options);
    const result = await processOutput(childProcess);
    return result;
}

async function processOutput(childProcess: ChildProcess) {
    const { stdout, stderr } = childProcess;

    const result = new Promise<boolean>((resolve, reject) => {
        childProcess.on('exit', (code, signal) => {
            if (signal !== null)
                reject(signal);

            else if (code !== null)
                resolve(code === 0);

            else
                throw Error(`Unexpected null signal and return code.`);
        });
    });

    for await (const line of lines(stdout))
        console.log(line);

    for await (const line of lines(stderr))
        console.error(line);

    return result;
}

main();
