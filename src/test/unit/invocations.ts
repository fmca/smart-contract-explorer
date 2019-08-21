import * as Compile from '../../frontend/compile';
import * as Chain from '../../utils/chain';
import assert from 'assert';
import { InvocationGenerator, Invocation, Kind, Values, Value } from '../../model';
import { Address } from '../../frontend/metadata';

const pragmas = `pragma solidity ^0.5.0;`;

describe('invocation generation', function() {
    let tester: InvocationsTester;

    this.beforeAll(async function() {
        tester = new InvocationsTester();
        await tester.getAccounts();
    });

    it (`generates the right types`, async function() {
        const tester = new InvocationsTester();
        const result = await tester.getResult(`contract C {
            function f1(int x) public pure {}
            function f2(uint x) public pure {}
            function f3(bool x) private pure {}
            function f4(address x) public pure {}
        }`);
        result.expectSome(_ => true);
        result.expectEvery(({ method: { name }, inputs: [v] }) => {
            return Value.isElementaryValue(v) && (
                name === 'f1' && v.type === 'int' && typeof(v.value) === 'number'
                || name === 'f2' && v.type === 'uint' && typeof(v.value) === 'number' && v.value >= 0
                || name === 'f3' && v.type === 'bool' && typeof(v.value) === 'boolean'
                || name === 'f4' && v.type === 'address' && typeof(v.value) === 'string'
            );
        });
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

    it('generates constructors', async function() {
        const result = await tester.getResult(`contract C { }`, 'constructor');
        result.expectSome(_ => true);
        result.expectEvery(({ method: { name }, inputs }) => name === '' && inputs.length === 0);
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

    async getResult(content: string, kind?: Kind) {
        const generator = await this.getGenerator(content);
        const invocations = generator.getInvocations(kind);
        return new TestResult([...invocations]);
    }
}

class TestResult {
    constructor(public invocations: Invocation[]) {}

    forEach(f: (_: Invocation) => void) {
        this.invocations.forEach(f);
    }

    expectSome(f: (_: Invocation) => boolean) {
        assert.ok(this.invocations.some(f));
    }

    expectEvery(f: (_: Invocation) => boolean) {
        assert.ok(this.invocations.every(f));
    }
}
