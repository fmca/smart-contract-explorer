import * as Compile from '../../frontend/compile';
import { Metadata, ContractSpec } from '../../frontend/metadata';
import assert from 'assert';

const pragmas = `pragma solidity ^0.5.0;`;

describe('compile', function() {

    it('parses valid contract specs', async function(this) {
        await testInvariants(`x == y`);
        await testSimulations(`x == y`, `x.f == z`);
    });

    it('parses valid contract specs', async function(this) {
        const notices = `/** @notice invariant x \n * notice invariant y */`;
        const invariants = [`x notice`, 'y'];
        const simulations: string[] = [];
        const expected = { invariants, simulations };
        await testNotices(notices, expected);
    });

});

async function testInvariants(...invariants: string[]) {
    const simulations: string[] = [];
    const contractSpec = { invariants, simulations };
    await testContractSpec(contractSpec);
}

async function testSimulations(...simulations: string[]) {
    const invariants: string[] = [];
    const contractSpec = { invariants, simulations };
    await testContractSpec(contractSpec);
}

async function testContractSpec(expected: ContractSpec) {
    const actual = await getSpecFromSpec(expected);
    test(actual, expected);
}

async function testNotices(notices: string, expected: ContractSpec) {
    const actual = await getSpecFromNotices(notices);
    test(actual, expected);
}

async function testContent(content: string, expected: ContractSpec) {
    const actual = await getSpecFromContent(content);
    test(actual, expected);
}

function test(actual: ContractSpec, expected: ContractSpec) {
    assert.deepEqual(actual, expected);
}

async function getSpecFromSpec(contractSpec: ContractSpec) {
    const notices = specToNotices(contractSpec);
    return await getSpecFromNotices(notices);
}

async function getSpecFromNotices(notices: string) {
    const content = `${pragmas}\n${notices}\ncontract C { }`;
    return await getSpecFromContent(content);
}

async function getSpecFromContent(content: string) {
    const path = `C.sol`;
    const metadata = await Compile.fromString({ path, content });
    const contractSpec = Metadata.getContractSpec(metadata);
    return contractSpec;
}

function specToNotices(contractSpec: ContractSpec) {
    const { invariants, simulations } = contractSpec;
    const notices = [
        ...invariants.map(i => `/// @notice invariant ${i}`),
        ...simulations.map(s => `/// @notice simulation ${s}`)
    ].join('\n');
    return notices;
}
