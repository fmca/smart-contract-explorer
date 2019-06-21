import * as Compile from './frontend/compile';

import { getBlockchainInterface, BlockchainInterface } from './setup';
import { Debugger } from './debug';
import { Executer } from './explore/execute';
import { Examples } from './explore/examples';
import { StateCountLimiterFactory } from './explore/limiter';
import { ContractCreator } from './explore/creator';

const debug = Debugger(__filename);

interface Parameters {
    sourceFilename: string;
    targetFilename: string;
}

export async function run(parameters: Parameters) {
    const { sourceFilename, targetFilename } = parameters;
    const chain = await getBlockchainInterface();
    const [ address ] = await chain.web3.eth.getAccounts();

    const source = await Compile.fromFile(sourceFilename);
    const target = await Compile.fromFile(targetFilename);

    const creator = new ContractCreator(chain);
    const executer = new Executer(creator);
    const examples = new Examples(executer);
    const limiters = new StateCountLimiterFactory(5);

    for await (const example of examples.simulationExamples({ source, target, address, limiters })) {
        const { source, target, kind } = example;
        console.log(`${kind} example:`);
        console.log(`---`);
        console.log(source.toString());
        console.log(target.toString());
        console.log(`---`);
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
