import * as Chain from '../utils/chain';
import assert from 'assert';

describe('chain', function() {

    it('deterministic chain creation', async function() {
        const { accounts: a1 } = await Chain.get();
        const { accounts: a2 } = await Chain.get();
        assert.deepEqual(a1, a2, 'accounts are identical');

        const { accounts: [a3] } = await Chain.get({ mnemonic: 'a' });
        const { accounts: [a4] } = await Chain.get({ mnemonic: 'b' });
        assert.notEqual(a3, a4, 'accounts are distinct');
    });

});
