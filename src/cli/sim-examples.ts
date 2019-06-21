#!/usr/bin/env node

require('source-map-support').install();

import { run } from '../examples';

if (process.argv.length != 4)
    throw Error(`Expected exactly two filename arguments`);

const [ sourceFilename, targetFilename ] = process.argv.slice(2);

run({ sourceFilename, targetFilename });
