import * as Compile from '../../frontend/compile';
import { getProductSeedFeatures } from '../../simulation/product'
import assert from 'assert';
import { Feature } from '../../simulation/simulation-data';

const pragmas = `pragma solidity ^0.5.0;`;

describe('seed features', function() {

    it('simple functions', function() {
        test(`contract S {

            int x;
            function f() public view returns (int) { return x; }

        }`).with(`contract T {

            int y;
            function f() public view returns (int) { return y; }

        }`).expect('(= S$x T$y)', 'f');
    });

    it('multiple functions', function() {
        test(`contract S {

            int x;
            int y;
            function f() public view returns (int) { return x; }
            function g() public view returns (int) { return y; }

        }`).with(`contract T {

            int x;
            int y;
            function f() public view returns (int) { return x; }
            function g() public view returns (int) { return y; }

        }`).expect('(= S$x T$x)', 'f', '(= S$y T$y)', 'g');
    });

    it('features with conditionals', function() {
        test(`contract S {

            int x;
            function f() public view returns (int) { return x; }

        }`).with(`contract T {

            int x;
            int y;
            int z;
            function f() public view returns (int) {
                if (x == y)
                    return 1;
                return z;
            }

        }`).expect('(= S$x (and (or (not (= T$x T$y)) 1) (or (not (not (= T$x T$y))) T$z)))', 'f');
    });

});

function test(content: string) {
    content = [pragmas, content].join('');
    const md1 = Compile.fromString({ content, path: '' });
    return {
        with: function(content: string) {
            content = [pragmas, content].join('');
            const md2 = Compile.fromString({ content, path: ''});
            return {
                expect: function(...args: string[]) {
                    const expected: Feature[] = [];
                    while (args.length > 0) {
                        const expression = args.shift()!;
                        const name = args.shift()!;
                        expected.push({ expression, name });
                    }

                    const actual = getProductSeedFeatures(md1, md2);
                    assert.deepEqual(actual, expected);
                }
            }
        }
    }
}
