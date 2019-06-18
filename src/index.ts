import { compile } from './frontend';

import { getBlockchainInterface } from './setup';
import { Debugger } from './debug';
import { Executer } from './explore/execute';
import { Explorer } from './explore/explorer';
import { Limiter } from './explore/limiter';
import { ContractCreator } from './explore/creator';

const debug = Debugger(__filename);

interface Parameters {
    filename: string;
}

export async function run(parameters: Parameters) {
    const { filename } = parameters;
    const metadata = await compile(filename);

    const { web3 } = await getBlockchainInterface();
    const [ account ] = await web3.eth.getAccounts();
    const creator = new ContractCreator(web3, metadata, account);
    const executer = new Executer(creator, account);
    const explorer = new Explorer(executer);
    const limiter = new Limiter(5);
    const { abi } = metadata;

    for await (const state of explorer.explore(abi, limiter)) {
        console.log(`state: ${state}`);
    }
}

// async function doSomething(harness: Harness, action: string, obs: string) {
//     const { accounts: [ , address], creator } = harness;

//     for (const _ of [[], []]) {
//         const instance = await creator.create(address);

//         const init = await instance.methods[obs].call();
//         debug(`init: %o`, init);

//         for (const _ of [[], [], []]) {

//             const tx = instance.methods[action];

//             const gas = await tx.estimateGas() + 1;
//             /* await */ tx.send({ from: address, gas });
//             /* await */ tx.send({ from: address, gas });
//             debug(`actions`);

//             // awaiting a dummy call seems to ensure that pending transactions
//             // have completed
//             await instance.methods[obs].call();

//             const result = await instance.methods[obs].call();
//             debug(`result: %o`, result);

//             const again = await instance.methods[obs].call();
//             debug(`again: %o`, again);
//         }
//     }
// }
