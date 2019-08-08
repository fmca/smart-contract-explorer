import assert from 'assert';
import { SimulationExamplesContract } from '../contracts';
import * as Compile from '../frontend/compile';
import { ValueGenerator } from '../model';
import { SimulationExample } from '../simulation/examples';

const pragmas = `pragma solidity ^0.5.0;`;


describe('simulation examples', function() {

    it ('all fields listed', async function() {
        await testFields(
            { name: `S`, body: `int x;` },
            { name: `T`, body: `int y; int z;` },
            [`S$x: Int`, `T$y: Int`, `T$z: Int`]
        );
    });

    it ('int mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (int => int) x;` },
            { name: `T`, body: `int y;` },
            [`S$x: Map[Int,Int]`, `S$x[__verifier_idx_int]: Int`, `T$y: Int`]
        );
    });

    it ('address mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => int) x;` },
            { name: `T`, body: `int y;` },
            [`S$x: Map[Address,Int]`, `S$x[__verifier_idx_address]: Int`, `T$y: Int`]
        );
    });

    it ('nested mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => mapping (int => int)) x;` },
            { name: `T`, body: `int y;` },
            [`S$x: Map[Address,Map[Int,Int]]`, `S$x[__verifier_idx_address][__verifier_idx_int]: Int`, `T$y: Int`]
        );
    });

    it ('only mappings to int listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => address) x;` },
            { name: `T`, body: `int y;` },
            [`S$x: Map[Address,Address]`, `T$y: Int`]
        );
    });

    it ('constants are not listed', async function() {
        await testFields(
            { name: `S`, body: `int x;` },
            { name: `T`, body: `int y; int constant Z = 0;` },
            [`S$x: Int`, `T$y: Int`]
        );
    });

});

type Contract = { name: string, body: string };

async function testFields(source: Contract, target: Contract, expected: string[]) {
    const contract = await getExamplesContract(source, target);
    const actual = contract.storageAccessorsForPie();
    assert.deepEqual(new Set(actual), new Set(expected));
}

async function getExamplesContract(source: Contract, target: Contract) {
    const s = await getContract(source);
    const t = await getContract(target);
    const info = { name: '', path: '' };
    const values = new ValueGenerator([]);
    async function* gen(): AsyncIterable<SimulationExample> {}
    const contract = new SimulationExamplesContract(s, t, info, gen, values);
    return contract;
}

async function getContract(example: Contract) {
    const { name, body } = example;
    const path = `${name}.sol`;
    const content = `${pragmas} contract ${name} { ${body} }`;
    const metadata = await Compile.fromString({ path, content });
    return metadata;
}
