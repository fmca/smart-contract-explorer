import { compile } from './frontend';
import { Harness, setup } from './setup';
import { Debugger } from './debug';

const debug = Debugger(__filename);

interface Parameters {
    filename: string;
}

export async function run(parameters: Parameters) {
    const { filename } = parameters;
    const metadata = await compile(filename);
    const harness = await setup(metadata);
    await doSomething(harness, 'displayMessage');
}

async function doSomething(harness: Harness, action: string) {
    const { accounts: [ , address], creator } = harness;
    const instance = await creator.create(address);
    const result = await instance.methods[action].call();
    debug(`result: %o`, result);
}
