import assert from 'assert';
import { publicizeInternalAndExternal } from '../../contracts/rewriting';

const pragmas = `pragma solidity ^0.5.0;`;

describe('rewriting', function() {

    it('publicize', function() {
        publicize(`int internal x;`).expect(`int public x;`);
        publicize(`int external x;`).expect(`int public x;`);
        publicize(`int x;`).expect(`int public x;`);
        publicize(`int x; int y;`).expect(`int public x; int public y;`);
        publicize(`mapping (int => int) x;`).expect(`mapping (int => int) public x;`);
    });

});

function publicize(content: string) {
    return {
        expect: function(expected: string) {
            const actual = publicizeInternalAndExternal(content);
            assert.equal(actual, expected);
        }
    };
}
