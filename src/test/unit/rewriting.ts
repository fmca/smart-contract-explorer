import assert from 'assert';
import { publicizeInternalAndExternal } from '../../contracts/rewriting';
import { Unit } from '../../frontend/unit';

const pragmas = `pragma solidity ^0.5.0;`;

describe('rewriting', function() {

    it('publicize', async function() {
        await publicize(`int internal x;`).expect(`int public x;`);
        await publicize(`int x;`).expect(`int public x;`);
        await publicize(`int x; int y;`).expect(`int public x; int public y;`);
        await publicize(`mapping (int => int) x;`).expect(`mapping (int => int) public x;`);
        await publicize(`struct S { int x; }`).expect(`struct S { int x; }`);
    });

});

function publicize(content: string) {
    content = `${pragmas} contract A { ${content} }`;
    return {
        expect: async function(expected: string) {
            expected = `${pragmas} contract A { ${expected} }`;
            const unit = new Unit('', content);
            const metadata = await unit.getMetadata();
            const actual = publicizeInternalAndExternal(metadata, content);
            assert.equal(actual, expected);
        }
    };
}
