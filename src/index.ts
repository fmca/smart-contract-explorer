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
    await doSomething(harness, 'increment', 'getCount');
}

async function doSomething(harness: Harness, action: string, obs: string) {
    const { accounts: [ , address], creator } = harness;

    for (const _ of [[], []]) {
        const instance = await creator.create(address);

        const init = await instance.methods[obs].call();
        debug(`init: %o`, init);

        for (const _ of [[], [], []]) {

            const tx = instance.methods[action];

            const gas = await tx.estimateGas() + 1;
            await tx.send({ from: address, gas });

            const result = await instance.methods[obs].call();
            debug(`result: %o`, result);

            const again = await instance.methods[obs].call();
            debug(`again: %o`, again);
        }
    }
}
