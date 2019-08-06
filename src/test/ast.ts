import { toSExpr, toContract } from '../frontend/utils';
import { IndexAccess, Identifier, BinaryOperation } from '../frontend/ast/expression';
import { Assignment } from '../frontend/ast/statement';
import assert from 'assert';

describe('ast', function() {

const ASTbaseExpression: Identifier = {
    argumentTypes: null,
    id: 24,
    name: 'counters',
    nodeType: 'Identifier',
    overloadedDeclarations: [],
    referencedDeclaration: 5,
    src: '163:8:0',
    typeDescriptions:
    { typeIdentifier: 't_mapping$_t_int256_$_t_int256_$',
       typeString: 'mapping(int256 => int256)' }
} ;


const ASTindexExpression: Identifier = { argumentTypes: null,
    id: 25,
    name: 'i',
    nodeType: 'Identifier',
    overloadedDeclarations: [],
    referencedDeclaration: 7,
    src: '172:1:0',
    typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } };

const ASTleftHandSide: IndexAccess = { argumentTypes: null,
      baseExpression: ASTbaseExpression,
      id: 26,
      indexExpression: ASTindexExpression,
      isConstant: false,
      isLValue: true,
      isPure: false,
      lValueRequested: true,
      nodeType: 'IndexAccess',
      src: '163:11:0',
      typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } } ;


const leftExpression: IndexAccess =  { argumentTypes: null,
        baseExpression:
         { argumentTypes: null,
           id: 30,
           name: 'counters',
           nodeType: 'Identifier',
           overloadedDeclarations: [],
           referencedDeclaration: 5,
           src: '185:8:0',
           typeDescriptions:
            { typeIdentifier: 't_mapping$_t_int256_$_t_int256_$',
              typeString: 'mapping(int256 => int256)' } },
        id: 32,
        indexExpression:
         { argumentTypes: null,
           id: 31,
           name: 'i',
           nodeType: 'Identifier',
           overloadedDeclarations: [],
           referencedDeclaration: 7,
           src: '194:1:0',
           typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
        isConstant: false,
        isLValue: true,
        isPure: false,
        lValueRequested: false,
        nodeType: 'IndexAccess',
        src: '185:11:0',
        typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } };


const rightExpression: BinaryOperation = { argumentTypes: null,
        commonType: { typeIdentifier: 't_int256', typeString: 'int256' },
        id: 35,
        isConstant: false,
        isLValue: false,
        isPure: false,
        lValueRequested: false,
        leftExpression:
         { argumentTypes: null,
           hexValue: '32',
           id: 33,
           isConstant: false,
           isLValue: false,
           isPure: true,
           kind: 'number',
           lValueRequested: false,
           nodeType: 'Literal',
           src: '199:1:0',
           subdenomination: null,
           typeDescriptions:
            { typeIdentifier: 't_rational_2_by_1',
              typeString: 'int_const 2' },
           value: '2' },
        nodeType: 'BinaryOperation',
        operator: '*',
        rightExpression:
         { argumentTypes: null,
           id: 34,
           name: 'k',
           nodeType: 'Identifier',
           overloadedDeclarations: [],
           referencedDeclaration: 11,
           src: '203:1:0',
           typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
        src: '199:5:0',
        typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } };


const ASTtrueExpression: BinaryOperation =
      { argumentTypes: null,
        commonType: { typeIdentifier: 't_int256', typeString: 'int256' },
        id: 36,
        isConstant: false,
        isLValue: false,
        isPure: false,
        lValueRequested: false,
        leftExpression,
        nodeType: 'BinaryOperation',
        operator: '+',
        rightExpression,
        src: '185:19:0',
        typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } };

const ASTfalseExpression: BinaryOperation =
        { argumentTypes: null,
          commonType: { typeIdentifier: 't_int256', typeString: 'int256' },
          id: 41,
          isConstant: false,
          isLValue: false,
          isPure: false,
          lValueRequested: false,
          leftExpression:
           { argumentTypes: null,
             baseExpression:
              { argumentTypes: null,
                id: 37,
                name: 'counters',
                nodeType: 'Identifier',
                overloadedDeclarations: [],
                referencedDeclaration: 5,
                src: '207:8:0',
                typeDescriptions:
                 { typeIdentifier: 't_mapping$_t_int256_$_t_int256_$',
                   typeString: 'mapping(int256 => int256)' } },
             id: 39,
             indexExpression:
              { argumentTypes: null,
                id: 38,
                name: 'i',
                nodeType: 'Identifier',
                overloadedDeclarations: [],
                referencedDeclaration: 7,
                src: '216:1:0',
                typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
                isConstant: false,
                isLValue: true,
                isPure: false,
                lValueRequested: false,
                nodeType: 'IndexAccess',
                src: '207:11:0',
                typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
             nodeType: 'BinaryOperation',
             operator: '+',
             rightExpression:
              { argumentTypes: null,
                id: 40,
                name: 'k',
                nodeType: 'Identifier',
                overloadedDeclarations: [],
                referencedDeclaration: 11,
                src: '221:1:0',
                typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
             src: '207:15:0',
             typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } };


const ASTcondition: BinaryOperation =
          { argumentTypes: null,
            commonType: { typeIdentifier: 't_int256', typeString: 'int256' },
            id: 29,
            isConstant: false,
            isLValue: false,
            isPure: false,
            lValueRequested: false,
            leftExpression:
             { argumentTypes: null,
               id: 27,
               name: 'k',
               nodeType: 'Identifier',
               overloadedDeclarations: [],
               referencedDeclaration: 11,
               src: '177:1:0',
               typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
            nodeType: 'BinaryOperation',
            operator: '==',
            rightExpression:
             { argumentTypes: null,
               hexValue: '31',
               id: 28,
               isConstant: false,
               isLValue: false,
               isPure: true,
               kind: 'number',
               lValueRequested: false,
               nodeType: 'Literal',
               src: '182:1:0',
               subdenomination: null,
               typeDescriptions:
                { typeIdentifier: 't_rational_1_by_1',
                  typeString: 'int_const 1' },
               value: '1' },
            src: '177:6:0',
            typeDescriptions: { typeIdentifier: 't_bool', typeString: 'bool' } };


    const ast: Assignment = { argumentTypes: null,
                            id: 43,
                            isConstant: false,
                            isLValue: false,
                            isPure: false,
                            lValueRequested: false,
                            leftHandSide: ASTleftHandSide,
                            nodeType: 'Assignment',
                            operator: '=',
                            rightHandSide:
                             { argumentTypes: null,
                              condition: ASTcondition,
                              falseExpression: ASTfalseExpression,
                               id: 42,
                               isConstant: false,
                               isLValue: false,
                               isPure: false,
                               lValueRequested: false,
                               nodeType: 'Conditional',
                               src: '177:45:0',
                              trueExpression: ASTtrueExpression,
                            typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' } },
                            src: '163:59:0',
                            typeDescriptions: { typeIdentifier: 't_int256', typeString: 'int256' }} ;



    it('generate s-expression from ast of lhs', async function() {
        const expr = toSExpr(ASTleftHandSide);
        console.log(`expression is : %s`, expr);
        assert.deepEqual(expr, `(index counters i)`);
    });

    it('generate s-expression from ast condition', async function() {
        const expr = toSExpr(ASTcondition);
        assert.deepEqual(expr, `(= k 1)`);
    });

    it('generate s-expression from ast of false', async function() {
      const expr = toSExpr(ASTfalseExpression);
      assert.deepEqual(expr, `(+ (index counters i) k)`);
    });

    it('generate s-expression from ast true', async function() {
      const expr = toSExpr(ASTtrueExpression);
      assert.deepEqual(expr, `(+ (index counters i) (* 2 k))`);
    });

    it('generate s-expression from ast', async function() {
      const expr = toSExpr(ast);
      assert.deepEqual(expr, `(= (index counters i) (ite (= k 1) (+ (index counters i) (* 2 k)) (+ (index counters i) k)))`);
    });

    it('generate solidity expression from ast', async function() {
        const expr = toContract(ast);
        assert.deepEqual(expr, `counters[i] = k == 1? counters[i] + 2 * k: counters[i] + k`);
    });

});
