import { parse } from '../frontend/sexpr';
import assert from 'assert';

const pragmas = `pragma solidity ^0.5.0;`;

describe('sexpr', function() {

    it('parses simple sexpressions', async function() {
        const expr = parse("(add a b)");
        assert.deepEqual(expr, ["add", "a", "b"]);
    });

    it('parses nested sexpressions', async function() {
        const expr = parse("(add (mult (a (minus c))) b)");
        assert.deepEqual(expr, ["add", ["mult", ["a", ["minus", "c"]]], "b"]);
    });

});
