import assert from 'assert';
import { Unit } from '../../frontend/unit';
import { storageAccessorsForPie, getAccessor, getSumAccessor, PathElement, Path } from '../../simulation/accessors';
import { ExpressionData } from '../../simulation/simulation-data';
import { elementary, mapping, TypeName, ElementaryTypeName } from '../../solidity';

const pragmas = `pragma solidity ^0.5.0;`;

const int = elementary('int');
const uint = elementary('uint');
const address = elementary('address');
const map = (keyType: TypeName, valueType: TypeName) => mapping(keyType, valueType);
const path = (typeName: ElementaryTypeName, ...elements: PathElement[]) => ({ elements, typeName });

describe('accessors', function() {

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

    it (`consistent translations`, function() {
        accessor('S', 'x', int).expect('S$x', 'Int', 'S$x', 'S$x');
        accessor('S', 'x', map(int,int)).expect('S$x', 'Map[Int,Int]', 'S$x', 'S$x');
        accessor('S', 'x', map(int,map(int,int))).expect('S$x', 'Map[Int,Map[Int,Int]]', 'S$x', 'S$x');

        sumAccessor('S', path(int, 'x', int)).expect('sum$S$x$int', 'Sum', 'sum$S$x$int', '__verifier_sum_int(S$x[__verifier_idx_int])');
        sumAccessor('S', path(uint, 'x', address)).expect('sum$S$x$address', 'Sum', 'sum$S$x$address', '__verifier_sum_uint(S$x[__verifier_idx_address])');
        sumAccessor('S', path(int, 'x', int, 'f')).expect('sum$S$x$int$f', 'Sum', 'sum$S$x$int$f', '__verifier_sum_int(S$x[__verifier_idx_int].f)');
        sumAccessor('S', path(int, 'x', int, 'f', 'g')).expect('sum$S$x$int$f$g', 'Sum', 'sum$S$x$int$f$g', '__verifier_sum_int(S$x[__verifier_idx_int].f.g)');
    });

});

type Contract = { name: string, body: string };

function accessor(prefix: string, name: string, typeName: TypeName) {
    return {
        expect: function (id: string, pieType: string, evaluatorExpression: string, verifierExpression: string) {
            const actual = getAccessor(prefix, name, typeName);
            const expected = { id, pieType, evaluatorExpression, verifierExpression };
            assert.deepEqual(actual, expected);
        }
    };
}

function sumAccessor(prefix: string, path: Path) {
    return {
        expect: function(id: string, pieType: string, evaluatorExpression: string, verifierExpression: string) {
            const actual = getSumAccessor(prefix, path);
            const expected = { id, pieType, evaluatorExpression, verifierExpression };
            assert.deepEqual(actual, expected);
        }
    }
}

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
