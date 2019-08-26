#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import * as Examples from '../simulation/examples';
import * as Product from '../simulation/product';
import { SimulationCounterExample } from '../simulation/counterexample';
import * as Contracts from '../contracts/conversions';
import { Unit } from '../frontend/unit';
import { Run } from '../utils/run';
import { annotate } from '../contracts/rewriting';

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
    'simulation-data.json',
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

    const { states } = args;
    const paths = await getPaths();
    const source = new Unit(args.source!);
    const target = new Unit(args.target!);
    const output = new Unit(paths['SimulationExamples.sol']);
    const parameters = { source, target, output, states };
    const { units, fields, seedFeatures, simulationData } = await Examples.generateExamples(parameters);

    // TODO streamline this
    const positive = simulationData.examples
        .filter(({ positive }) => positive)
        .map(({ id }) => ({ exampleId: id, dataPath: paths[`simulation-data.json`] }));

    const negative = simulationData.examples
        .filter(({ positive }) => !positive)
        .map(({ id }) => ({ exampleId: id, dataPath: paths[`simulation-data.json`] }));

    for (const unit of units)
        await unit.writeContent();

    await fs.writeFile(paths[`simulation-data.json`], JSON.stringify(simulationData, null, 4));
    await fs.writeFile(paths[`positive-examples.txt`], positive.map(e => `${JSON.stringify(e)}\n`).join(''));
    await fs.writeFile(paths[`negative-examples.txt`], negative.map(e => `${JSON.stringify(e)}\n`).join(''));
    await fs.writeFile(paths[`seed-features.txt`], seedFeatures.join(`\n`) + '\n');
    await fs.writeFile(paths[`fields.txt`], fields.join(`\n`) + '\n');
    await fs.writeFile(paths[`constants.txt`], '');

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

    if (!success)
        throw Error(`Unable to synthesize simulation relation: ${errors.join('\n')}`);

    const source = new Unit(args.source!);
    const target = new Unit(args.target!);
    const examples = new Unit(paths['SimulationExamples.sol']);
    const clauses = await Contracts.parseSimulation(source, target, examples, output);

    console.log(`Computed simulation relation:`);
    console.log();

    for (const clause of clauses)
        console.log(`  `, clause);
    console.log();

    const annotated = source.suffix('.annotated');
    await annotate(source, clauses, annotated);
    await annotated.writeContent();
    console.log(`Annotated source contract: ${annotated.getPath()}`);
    console.log();

    return annotated;
}

async function verifySimulation() {
    console.log(`---`);
    console.log(`Checking simulation relation`);
    console.log(`---`);

    const paths = await getPaths();
    const source = args.synthesize
        ? new Unit(args.source!).suffix('.annotated')
        : new Unit(args.source!);
    const target = new Unit(args.target!);
    const output = new Unit(paths['SimulationCheck.sol']);
    const parameters = { source, target, output };
    const { units } = await Product.getSimulationCheckContract(parameters);

    for (const unit of units)
        await unit.writeContent();

    const { success, output: lines } = await run(`solc-verify.py`, output.getPath());

    if (!success)
        throw Error(`Unable to verify simulation relation: ${lines.join('\n')}`);

    console.log(`Simulation relation verified`);
}

const run = Run(console, args.verbose);
main();
