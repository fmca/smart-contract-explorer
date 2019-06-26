import * as Compile from '../frontend/compile';
import * as Chain from '../utils/chain';
import assert from 'assert';
import { InvocationGenerator } from '../explore/invocations';
import { ContractCreator } from '../explore/creator';
import { Address } from '../frontend/metadata';

const pragmas = `pragma solidity ^0.5.0;`;

describe('invocation generation', function() {
    let accounts: Address[];
    let generator: InvocationGenerator;

    this.beforeAll(async function() {
        const chain = await Chain.get();
        accounts = chain.accounts;

        const contract = `${pragmas} contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`;
        generator = await getGenerator(contract, accounts);
    });

    it (`includes only public members`, async function() {
        for await (const { method: { name } } of generator.invocations()) {
            assert.ok( name === 'get' || name === 'set' );
        }
    });

    it('generates mutators', async function() {
        for await (const invocation of generator.mutators()) {
            const { method, inputs } = invocation;
            const { name } = method;
            assert.equal(name, 'set');
            assert.equal(inputs.length, 1);
        }
    });

    it('generates observers', async function() {
        for await (const invocation of generator.observers()) {
            const { method, inputs } = invocation;
            const { name } = method;
            assert.equal(name, 'get');
            assert.equal(inputs.length, 0);
        }
    });

    it ('generates various types', async function() {
        const contract = `${pragmas} contract C {
            mapping (address => int) x;
            function get(address i) public view returns (int) { return x[i]; }
        }`;
        const generator = await getGenerator(contract, accounts);
        const invocations = [];
        for await (const invocation of generator.invocations())
            invocations.push(invocation);
        assert.ok(invocations.some(({ method: { name } }) => name === 'get'));
    });
});

async function getGenerator(contract: string, accounts: Address[]) {
    const sourceName = `c.sol`;
    const metadata = await Compile.fromString(sourceName, contract);
    const generator = new InvocationGenerator(metadata, accounts);
    return generator;
}
