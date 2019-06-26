#!/usr/bin/env node

import { run, Product } from '../product';

const [ specFile, implFile, productFile, ...rest ] = process.argv.slice(2);

if (specFile === undefined || implFile === undefined || productFile === undefined || rest.length > 0)
    throw Error(`Expected exactly three filename arguments`);

var product = new Product();

run({ specFile, implFile, productFile}, product);

