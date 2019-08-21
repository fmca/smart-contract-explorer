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
import * as Contracts from '../contracts/conversions';
import { fromFile } from '../frontend/compile';

const args = yargs.usage(`usage: $0 --source <filename> --target <filename>`)
    .strict()
    .check(({ _: { length }}) => length === 0)
    .option('verbose', {
        describe: 'output verbosity',
        type: 'boolean',
        default: false
    })
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

const { verbose } = args;

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
    await fs.writeFile(ps[`constants.txt`], '');

    console.log();
}

async function synthesizeSimulation() {
    console.log(`---`);
    console.log(`Synthesizing simulation relation`);
    console.log(`---`);

    const ligArgs: string[] = [];
    const paths = await getPaths();

    for (const file of files.filter(f => f.endsWith('.txt')))
        ligArgs.push(`--${path.basename(file, '.txt')}`, paths[file])

    const { success, output, errors } = await run(`lig-symbolic-infer`, ...ligArgs);
    console.log();

    if (!success)
        throw Error(`Unable to synthesize simulation relation: ${errors.join('\n')}`);

    const metadata = {
        examples: await fromFile(paths['SimulationExamples.sol']),
        source: await fromFile(args.source!),
        target: await fromFile(args.target!)
    };
    function findVariable(name: string) { return metadata.examples.findFunction(name); }

    const relation = output.map(expr => {
        const code = Contracts.fromUnparsedExpression(expr, { findVariable });
        return code
            .replace(/\bspec\$/, `${metadata.target.name}.`)
            .replace(/\bimpl\$/, `${metadata.source.name}.`);
    });

    console.log(`---`);
    console.log(`Computed simulation relation:`);
    console.log();

    for (const clause of relation)
        console.log(`  `, clause);

    console.log();
    console.log(`---`);
    console.log();

    return output;
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

    const { success, output: lines } = await run(`solc-verify.py`, path);
    console.log();

    if (!success)
        throw Error(`Unable to verify simulation relation: ${lines.join('\n')}`);

    console.log(`---`);
    console.log(`Verified simulation relation`);
    console.log(`---`);
}


async function run(command: string, ...args: readonly string[]) {
    const options = {};
    const childProcess = cp.spawn(command, args, options);
    const output: string[] = [];
    const errors: string[] = [];
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

    for await (const line of lines(stdout)) {
        output.push(line);

        if (verbose)
            console.log(line);
    }

    for await (const line of lines(stderr)) {
        errors.push(line);

        if (verbose)
            console.error(line);
    }

    return result.then(success => ({
        success,
        output,
        errors
    }));
}

main();
