#!/usr/bin/env node

require('source-map-support').install();

import { Examples } from '../contracts/examples';

async function main() {

    if (process.argv.length != 4)
        throw Error(`Expected exactly two filename arguments`);

    const [ sourceFilename, targetFilename ] = process.argv.slice(2);

    try {
        const { metadata } = await Examples.generate({ sourceFilename, targetFilename });
        const { source: { content } } = metadata;
        console.log(content);

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
