import { Expr } from '../../sexpr/expression';
import * as Solidity from '../../solidity/conversions';
import assert from 'assert';

const node = { id: -1, src: '' };
const typeDescriptions = { typeIdentifier: '', typeString: '' };
const expression = { ...node, argumentTypes: null, typeDescriptions };
const operation = { ...expression, isConstant: false, isLValue: false, isPure: false };
const literal = { ...expression, nodeType: 'Literal', kind: 'number'};
const identifier = { ...expression, nodeType: 'Identifier', overloadedDeclarations: [], referencedDeclaration: 0 };
const unary = { ...operation, nodeType: 'UnaryOperation' };
const binary = { ...operation, nodeType: 'BinaryOperation' };

const test1_result = {
    ...binary,
    operator: '+',
    leftExpression: { ...identifier, name: 'a' },
    rightExpression: { ...identifier, name: 'b' } };

const test2_result = {
    ...binary,
    operator: '+',
    leftExpression:
     { ...unary,
       prefix: true,
       operator: '-',
       subExpression: { ...identifier, name: 'a' } },
    rightExpression: { ...identifier, name: 'b' } };

const test3_result = {
    ...binary,
    operator: '>=',
    leftExpression: { ...identifier, name: 'a' },
    rightExpression:
     { ...unary,
       prefix: true,
       operator: '-',
       subExpression: { ...identifier, name: 'b' } } };

const test4_result = {
    ...binary,
    operator: '>=',
    leftExpression: { ...literal, value: '1' },
    rightExpression: { ...literal, value: '0' } };

const test5_result = {
    ...binary,
    operator: '>=',
    leftExpression: { ...literal, value: '1' },
    rightExpression:
     { ...unary,
       prefix: true,
       operator: '-',
       subExpression: { ...literal, value: '267' } } };

const test6_result = {
    ...binary,
    operator: '&&',
    leftExpression: { ...identifier, name: 'a_a' },
    rightExpression: { ...identifier, name: 'b' } };

const test7_result = {
    ...binary,
    operator: '+',
    leftExpression:
     { ...binary,
       operator: '*',
       leftExpression: { ...identifier, name: 'a' },
       rightExpression:
        { ...unary,
          prefix: true,
          operator: '-',
          subExpression: { ...identifier, name: 'c' } } },
    rightExpression: { ...identifier, name: 'b' } };

const test8_result = {
    ...binary,
    operator: '&&',
    leftExpression: { ...identifier, name: 'a_a' },
    rightExpression:
     { ...binary,
       operator: '&&',
       leftExpression: { ...identifier, name: 'b_b' },
       rightExpression:
        { ...binary,
          operator: '&&',
          leftExpression: { ...identifier, name: 'c_c' },
          rightExpression:
           { ...binary,
             operator: '&&',
             leftExpression: { ...identifier, name: 'd_d' },
             rightExpression: { ...identifier, name: 'e_e' } } } } };

describe('sexpr', function() {

    it('parses simple sexpressions', async function() {
        const expr = Expr.parse("(+ a b)");
        assert.deepEqual(expr, ["+", "a", "b"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test1_result);
    });

    it('parses arithmetic sexpressions', async function() {
        const expr = Expr.parse("(+ -a b)");
        assert.deepEqual(expr, ["+", "-a", "b"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test2_result);
    });

    it('parses boolean sexpressions', async function() {
        const expr = Expr.parse("(>= a -b)");
        assert.deepEqual(expr, [">=", "a", "-b"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test3_result);
    });

    it('parses boolean sexpressions with values', async function() {
        const expr = Expr.parse("(>= 1 0)");
        assert.deepEqual(expr, [">=", "1", "0"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test4_result);
    });

    it('parses boolean sexpressions with values', async function() {
        const expr = Expr.parse("(>= 1 -267)");
        assert.deepEqual(expr, [">=", "1", "-267"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test5_result);
    });

    it('parses logical sexpressions', async function() {
        const expr = Expr.parse("(and a_a b)");
        assert.deepEqual(expr, ["and", "a_a", "b"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test6_result);
    });

    it('parses nested sexpressions', async function() {
        const expr = Expr.parse("(+ (* a -c) b)");
        assert.deepEqual(expr, ["+", ["*", "a", "-c"], "b"]);
        const node = Solidity.fromExpression(expr);
        assert.deepEqual(node, test7_result);
    });

    it('parses long logical sexpressions', async function() {
        const expr = Expr.parse("(and a_a b_b c_c d_d e_e)");
        assert.deepEqual(expr, ["and", "a_a", "b_b", "c_c", "d_d", "e_e"]);
        const node = Solidity.fromExpression(expr);
        //console.log(util.inspect(node, {showHidden: false, depth: null}));
        assert.deepEqual(node, test8_result);
    });

});
