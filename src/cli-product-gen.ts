#!/usr/bin/env node

import { run } from './product';

const [ spec, impl, ...rest ] = process.argv.slice(2);

if (spec === undefined || impl === undefined || rest.length > 0)
    throw Error(`Expected exactly two filename arguments`);

run({ contracts: { spec, impl } });
