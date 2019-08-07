import fs from 'fs-extra';
import * as Compile from './../frontend/compile';
import { getProductSeedFeatures } from '../explore/product'
import assert from 'assert';


const specFile = 'resources/contracts/HelloAfrica.sol';
const implFile = 'resources/contracts/HelloAmerica.sol'

const expected_result = [ [ '(= HelloAfrica.counter HelloAmerica.counter)', 'get' ] ];
describe('product', function() {

    it('generate seed features', async function() {
        const specMetadata = await Compile.fromFile(specFile);
        const implMetadata = await Compile.fromFile(implFile);
        const result = getProductSeedFeatures(specMetadata,implMetadata);
        assert.deepEqual(result, expected_result);
    });

});
