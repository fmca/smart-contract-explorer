#!/usr/bin/env node

require('source-map-support').install();

import { run } from './index';

const [ filename, ...rest ] = process.argv.slice(2);

if (filename === undefined || rest.length > 0)
    throw Error(`Expected exactly one filename argument`);

run({ filename });
