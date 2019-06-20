import { compile } from './frontend';

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

    const source = await compile(sourceFilename);
    const target = await compile(targetFilename);

    const creator = new ContractCreator(chain);
    const executer = new Executer(creator);
    const examples = new Examples(executer);
    const limiters = new StateCountLimiterFactory(5);

    for await (const { source: s, target: t } of examples.simulationExamples({ source, target, address, limiters })) {
        console.log(`source: ${s}`);
        console.log(`target: ${t}`);
    }
}

async function getExecuter(filename: string, chain: BlockchainInterface, account: string) {
    const metadata = await compile(filename);
    const creator = new ContractCreator(chain);
    const executer = new Executer(creator);
    return executer;
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
