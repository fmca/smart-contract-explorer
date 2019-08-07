import { Expr } from '../sexpr/expression';
import { toNode } from '../frontend/expr-to-node';
import assert from 'assert';

const util = require('util');

const pragmas = `pragma solidity ^0.5.0;`;

const test1_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '+',
    leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'a' },
    rightExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'b' } };

const test2_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '+',
    leftExpression:
     { id: 0,
       src: '',
       nodeType: 'UnaryOperation',
       prefix: true,
       operator: '-',
       subExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'a' } },
    rightExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'b' } };

const test3_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '>=',
    leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'a' },
    rightExpression:
     { id: 0,
       src: '',
       nodeType: 'UnaryOperation',
       prefix: true,
       operator: '-',
       subExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'b' } } };

const test4_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '>=',
    leftExpression: { id: 0, src: '', nodeType: 'Literal', value: '1' },
    rightExpression: { id: 0, src: '', nodeType: 'Literal', value: '0' } };

const test5_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '>=',
    leftExpression: { id: 0, src: '', nodeType: 'Literal', value: '1' },
    rightExpression:
     { id: 0,
       src: '',
       nodeType: 'UnaryOperation',
       prefix: true,
       operator: '-',
       subExpression: { id: 0, src: '', nodeType: 'Literal', value: '267' } } };

const test6_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '&&',
    leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'a_a' },
    rightExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'b' } };

const test7_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '+',
    leftExpression:
     { id: 0,
       src: '',
       nodeType: 'BinaryOperation',
       operator: '*',
       leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'a' },
       rightExpression:
        { id: 0,
          src: '',
          nodeType: 'UnaryOperation',
          prefix: true,
          operator: '-',
          subExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'c' } } },
    rightExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'b' } };

const test8_result = { id: 0,
    src: '',
    nodeType: 'BinaryOperation',
    operator: '&&',
    leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'a_a' },
    rightExpression:
     { id: 0,
       src: '',
       nodeType: 'BinaryOperation',
       operator: '&&',
       leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'b_b' },
       rightExpression:
        { id: 0,
          src: '',
          nodeType: 'BinaryOperation',
          operator: '&&',
          leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'c_c' },
          rightExpression:
           { id: 0,
             src: '',
             nodeType: 'BinaryOperation',
             operator: '&&',
             leftExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'd_d' },
             rightExpression: { id: 0, src: '', nodeType: 'Identifier', name: 'e_e' } } } } };

describe('sexpr', function() {

    it('parses simple sexpressions', async function() {
        const expr = Expr.parse("(+ a b)");
        assert.deepEqual(expr, ["+", "a", "b"]);
        const node = toNode(expr);
        assert.deepEqual(node, test1_result);
    });

    it('parses arithmetic sexpressions', async function() {
        const expr = Expr.parse("(+ -a b)");
        assert.deepEqual(expr, ["+", "-a", "b"]);
        const node = toNode(expr);
        assert.deepEqual(node, test2_result);
    });

    it('parses boolean sexpressions', async function() {
        const expr = Expr.parse("(>= a -b)");
        assert.deepEqual(expr, [">=", "a", "-b"]);
        const node = toNode(expr);
        assert.deepEqual(node, test3_result);
    });

    it('parses boolean sexpressions with values', async function() {
        const expr = Expr.parse("(>= 1 0)");
        assert.deepEqual(expr, [">=", "1", "0"]);
        const node = toNode(expr);
        assert.deepEqual(node, test4_result);
    });

    it('parses boolean sexpressions with values', async function() {
        const expr = Expr.parse("(>= 1 -267)");
        assert.deepEqual(expr, [">=", "1", "-267"]);
        const node = toNode(expr);
        assert.deepEqual(node, test5_result);
    });

    it('parses logical sexpressions', async function() {
        const expr = Expr.parse("(and a_a b)");
        assert.deepEqual(expr, ["and", "a_a", "b"]);
        const node = toNode(expr);
        assert.deepEqual(node, test6_result);
    });

    it('parses nested sexpressions', async function() {
        const expr = Expr.parse("(+ (* a -c) b)");
        assert.deepEqual(expr, ["+", ["*", "a", "-c"], "b"]);
        const node = toNode(expr);
        assert.deepEqual(node, test7_result);
    });

    it('parses long logical sexpressions', async function() {
        const expr = Expr.parse("(and a_a b_b c_c d_d e_e)");
        assert.deepEqual(expr, ["and", "a_a", "b_b", "c_c", "d_d", "e_e"]);
        const node = toNode(expr);
        //console.log(util.inspect(node, {showHidden: false, depth: null}));
        assert.deepEqual(node, test8_result);
    });

});
