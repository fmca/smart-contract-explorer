#!/usr/bin/env node

require('source-map-support').install();

import { Examples } from '../contracts/examples';

async function main() {

    if (process.argv.length != 4)
        throw Error(`Expected exactly two filename arguments`);

    const [ sourceFilename, targetFilename ] = process.argv.slice(2);

    try {
        const { metadata, examples: { positive, negative } } = await Examples.generate({ sourceFilename, targetFilename });
        const { source: { content } } = metadata;
        console.log(content);

        for (const example of positive)
            console.log(JSON.stringify(example));
        for (const example of negative)
            console.log(JSON.stringify(example));

    } catch (e) {
        console.error(e);

    } finally {
        process.exit();
    }
}

main();
