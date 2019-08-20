import * as Compile from '../../frontend/compile';
import * as Chain from '../../utils/chain';
import assert from 'assert';
import { InvocationGenerator, Invocation } from '../../model';
import { Address } from '../../frontend/metadata';

const pragmas = `pragma solidity ^0.5.0;`;

describe('invocation generation', function() {
    let tester: InvocationsTester;

    this.beforeAll(async function() {
        tester = new InvocationsTester();
        await tester.getAccounts();
    });

    it (`includes only public members`, async function() {
        const tester = new InvocationsTester();
        const result = await tester.getResult(`contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`);
        result.expectEvery(({ method: { name } }) => name === 'get' || name === 'set');
    });

    it('generates mutators', async function() {
        const result = await tester.getResult(`contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`, 'mutator');
        result.expectEvery(({ method: { name }, inputs }) => name === 'set' && inputs.length === 1);
    });

    it('generates observers', async function() {
        const result = await tester.getResult(`contract C {
            int x;
            function set(int i) public { x = i; }
            function get() public view returns (int) { return getP(); }
            function getP() private view returns (int) { return x; }
        }`, 'observer');
        result.expectEvery(({ method: { name }, inputs }) => name === 'get' && inputs.length === 0);
    });

    it ('generates various types', async function() {
        const result = await tester.getResult(`contract C {
            mapping (address => int) x;
            function get(address i) public view returns (int) { return x[i]; }
        }`);
        result.expectSome(({ method: { name } }) => name === 'get');
    });

    it (`generates arrays`, async function() {
        const result = await tester.getResult(`contract C {
            function get(uint[] memory ary) public pure { }
        }`);
        result.expectSome(({ method: { name } }) => name === 'get');
    });

    it (`generates payments`, async () => {
        const result = await tester.getResult(`contract C {
            function f() public payable { }
        }`);
        result.expectSome(({ method: { name }, value }) => name === 'f' && value !== undefined);
        result.expectSome(({ method: { name }, value }) => name === 'f' && value !== 0);
    });
});

class InvocationsTester {
    accounts?: Address[];

    constructor() {}

    async getAccounts() {
        if (this.accounts === undefined)
            this.accounts = await new Chain.BlockchainInterface().getAccounts();
        return this.accounts;
    }

    async getMetadata(content: string) {
        const path = `a.sol`;
        content = `${pragmas} ${content}`;
        const metadata = await Compile.fromString({ content, path });
        return metadata;
    }

    async getGenerator(content: string) {
        const metadata = await this.getMetadata(content);
        const accounts = await this.getAccounts();
        const generator = new InvocationGenerator(metadata, accounts);
        return generator;
    }

    async getResult(content: string, kind?: 'mutator' | 'observer') {
        const generator = await this.getGenerator(content);
        const invocations = kind === undefined
            ? generator.invocations()
            : kind === 'mutator'
            ? generator.mutators()
            : generator.observers();
        return new TestResult([...invocations]);
    }
}

class TestResult {
    constructor(public invocations: Invocation[]) {}
    expectSome(f: (_: Invocation) => boolean) {
        assert.ok(this.invocations.some(f));
    }
    expectEvery(f: (_: Invocation) => boolean) {
        assert.ok(this.invocations.every(f));
    }
}
