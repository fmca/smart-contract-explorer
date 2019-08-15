import * as Chain from '../../utils/chain';
import assert from 'assert';

describe('chain', function() {

    it('deterministic chain creation', async function() {
        const a1 = await new Chain.BlockchainInterface().getAccounts();
        const a2 = await new Chain.BlockchainInterface().getAccounts();
        assert.deepEqual(a1, a2, 'accounts are identical');

        const [a3] = await new Chain.BlockchainInterface({ mnemonic: 'a' }).getAccounts();
        const [a4] = await new Chain.BlockchainInterface({ mnemonic: 'b' }).getAccounts();
        assert.notEqual(a3, a4, 'accounts are distinct');
    });

});
