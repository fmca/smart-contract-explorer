#!/usr/bin/env node

require('source-map-support').install();

import { listen } from '../evaluate';


async function main() {
    if (process.argv.length != 2)
        throw Error(`Expected exactly two filename arguments`);

    const [ contractFile ] = process.argv.slice(2);

    try {
        await listen({ contractFile });

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
