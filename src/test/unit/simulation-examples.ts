import assert from 'assert';
import { Unit } from '../../frontend/unit';
import { storageAccessorsForPie, Path, getAccessor, getSumAccessor, PathElement } from '../../simulation/accessors';
import { ExpressionData } from '../../simulation/simulation-data';
import { elementary, mapping, TypeName, ElementaryTypeName } from '../../solidity';

const pragmas = `pragma solidity ^0.5.0;`;

const int = elementary('int');
const address = elementary('address');
const map = (keyType: TypeName, valueType: TypeName) => mapping(keyType, valueType);
const path = (typeName: ElementaryTypeName, ...elements: PathElement[]) => ({ elements, typeName });

describe('simulation examples', function() {

    it ('all fields listed', async function() {
        await testFields(
            { name: `S`, body: `int x;` },
            { name: `T`, body: `int y; int z;` },
            [
                getAccessor('S', 'x', int),
                getAccessor('T', 'y', int),
                getAccessor('T', 'z', int)
            ]
        );
    });

    it ('int mappings listed with accessors',  async function() {
        await testFields(
            { name: `S`, body: `mapping (int => int) x;` },
            { name: `T`, body: `int y;` },
            [
                getAccessor('S', 'x', map(int,int)),
                getAccessor('T', 'y', int),
                getSumAccessor('S', path(int, 'x', int))
            ]
        );
    });

    it ('address mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => int) x;` },
            { name: `T`, body: `int y;` },
            [
                getAccessor('S', 'x', map(address,int)),
                getAccessor('T', 'y', int),
                getSumAccessor('S', path(int, 'x', address))
            ]
        );
    });

    it ('nested mappings listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => mapping (int => int)) x;` },
            { name: `T`, body: `int y;` },
            [
                getAccessor('S', 'x', map(address,map(int,int))),
                getAccessor('T', 'y', int)
            ]
        );
    });

    it ('only mappings to int listed with accessors', async function() {
        await testFields(
            { name: `S`, body: `mapping (address => address) x;` },
            { name: `T`, body: `int y;` },
            [
                getAccessor('S', 'x', map(address,address)),
                getAccessor('T', 'y', int)
            ]
        );
    });

    it ('constants are not listed', async function() {
        await testFields(
            { name: `S`, body: `int x;` },
            { name: `T`, body: `int y; int constant Z = 0;` },
            [
                getAccessor('S', 'x', int),
                getAccessor('T', 'y', int)
            ]
        );
    });

});

type Contract = { name: string, body: string };

async function testFields(source: Contract, target: Contract, expected: ExpressionData[]) {
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
