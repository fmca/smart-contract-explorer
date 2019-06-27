#!/usr/bin/env node

require('source-map-support').install();

import yargs from 'yargs';
import { Evaluator } from '../contracts/evaluate';

yargs.usage(`usage: $0`)
    .strict()
    .check(argv => argv._.length === 0)
    .help('help')
    .argv;

async function main() {

    try {
        await Evaluator.listen();

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
