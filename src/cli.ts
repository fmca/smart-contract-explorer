#!/usr/bin/env node

import { run } from './index';

const [ filename, ...rest ] = process.argv.slice(2);

if (filename === undefined || rest.length > 0)
    throw Error(`Expected exactly one filename argument`);

const host = "http://localhost:8545";

run({ filename, host });
