#!/usr/bin/env node

import { run } from './product';

const [ spec, impl, simContract, ...rest ] = process.argv.slice(2);

if (spec === undefined || impl === undefined || simContract === undefined || rest.length > 0)
    throw Error(`Expected exactly three filename arguments`);

run({ contracts: { spec, impl, simContract} });
