#!/usr/bin/env node

require('source-map-support').install();

import { Evaluator } from '../contracts/evaluate';

async function main() {
    if (process.argv.length != 2)
        throw Error(`Expected zero arguments`);

    try {
        await Evaluator.listen();

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
