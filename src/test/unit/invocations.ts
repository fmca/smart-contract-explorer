import * as Compile from '../../frontend/compile';
import * as Chain from '../../utils/chain';
import assert from 'assert';
import { InvocationGenerator } from '../../model';
import { Address, Metadata } from '../../frontend/metadata';

const pragmas = `pragma solidity ^0.5.0;`;

describe('invocation generation', function() {
    let context: Context;

    this.beforeAll(async function() {
        const accounts = await new Chain.BlockchainInterface().getAccounts();
        context = getContext(accounts);
    });

    it (`includes only public members`, async function() {
        const contract = `${pragmas} contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`;
        const generator = await context.generator(contract);
        for await (const { method: { name } } of generator.invocations()) {
            assert.ok( name === 'get' || name === 'set' , `unexpected method: ${name}`);
        }
    });

    it('generates mutators', async function() {
        const contract = `${pragmas} contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`;
        const generator = await context.generator(contract);
        for await (const invocation of generator.mutators()) {
            const { method, inputs } = invocation;
            const { name } = method;
            assert.equal(name, 'set');
            assert.equal(inputs.length, 1);
        }
    });

    it('generates observers', async function() {
        const contract = `${pragmas} contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`;
        const generator = await context.generator(contract);
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
        const generator = await context.generator(contract);
        const invocations = [...await generator.invocations()];
        assert.ok(invocations.some(({ method: { name } }) => name === 'get'));
    });

    it (`generates arrays`, async function() {
        const contract = `${pragmas} contract C {
            function get(uint[] memory ary) public pure { }
        }`;
        const generator = await context.generator(contract);
        const invocations = [...await generator.invocations()];
        assert.ok(invocations.some(({ method: { name } }) => name === 'get'));

    });
});

interface Context {
    generator: (content: string) => Promise<InvocationGenerator>
}

function getContext(accounts: Address[]): Context {

    async function generator(content: string) {
        const path = `c.sol`;
        const metadata = await Compile.fromString({ path, content });
        const generator = new InvocationGenerator([...Metadata.getFunctions(metadata)], accounts);
        return generator;
    }

    return { generator };
}
