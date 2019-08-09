import * as Compile from '../../frontend/compile';
import assert from 'assert';

const pragmas = `pragma solidity ^0.5.0;`;

describe('compile', function() {

    it('compiles an empty contract', async function() {
        const path = `c.sol`;
        const content = `${pragmas} contract C { }`;
        const { abi, members, userdoc } = await Compile.fromString({ path, content });
        assert.equal(abi.length, 0);
        assert.equal(Object.entries(members).length, 0);
        assert.equal(Object.entries(userdoc.methods).length, 0);
    });

    it (`compiles a simple contract`, async function() {
        const path = `c.sol`;
        const content = `${pragmas} contract C { int x; function get() public view returns (int) { return x; } }`;
        const { abi } = await Compile.fromString({ path, content });
        assert.equal(abi.length, 1);
        const [ { name, type } ] = abi;
        assert.equal(name, 'get');
        assert.equal(type, 'function');
    });
});
