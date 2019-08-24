import assert from 'assert';
import { SimulationExamplesContract } from '../../contracts';
import * as Compile from '../../frontend/compile';
import { ValueGenerator } from '../../model';
import { SimulationExample } from '../../simulation/examples';
import { Unit } from '../../frontend/unit';
import { storageAccessorsForPie } from '../../simulation/accessors';

const pragmas = `pragma solidity ^0.5.0;`;


describe('simulation examples', function() {

    it ('all fields listed', async function() {
        await testFields(
            { name: `S`, body: `int x;` },
            { name: `T`, body: `int y; int z;` },
            [`"S$x": Int`, `"T$y": Int`, `"T$z": Int`]
        );
    });

    it ('int mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (int => int) x;` },
            { name: `T`, body: `int y;` },
            [`"S$x": Map[Int,Int]`, `"__verifier_sum_int(S$x[__verifier_idx_int])": Sum`, `"T$y": Int`]
        );
    });

    it ('address mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => int) x;` },
            { name: `T`, body: `int y;` },
            [`"S$x": Map[Address,Int]`, `"__verifier_sum_int(S$x[__verifier_idx_address])": Sum`, `"T$y": Int`]
        );
    });

    it ('nested mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => mapping (int => int)) x;` },
            { name: `T`, body: `int y;` },
            [`"S$x": Map[Address,Map[Int,Int]]`, `"T$y": Int`]
        );
    });

    it ('only mappings to int listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => address) x;` },
            { name: `T`, body: `int y;` },
            [`"S$x": Map[Address,Address]`, `"T$y": Int`]
        );
    });

    it ('constants are not listed', async function() {
        await testFields(
            { name: `S`, body: `int x;` },
            { name: `T`, body: `int y; int constant Z = 0;` },
            [`"S$x": Int`, `"T$y": Int`]
        );
    });

});

type Contract = { name: string, body: string };

async function testFields(source: Contract, target: Contract, expected: string[]) {
    const actual = [
        ...await storageAccessorsForPie(getUnit(source)),
        ...await storageAccessorsForPie(getUnit(target))
    ];
    assert.deepEqual(new Set(actual), new Set(expected));
}

function getUnit(example: Contract) {
    const { name, body } = example;
    const path = `${name}.sol`;
    const content = `${pragmas} contract ${name} { ${body} }`;
    const unit = new Unit(path, content);
    return unit;
}
