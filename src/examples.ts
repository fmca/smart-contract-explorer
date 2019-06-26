import * as Compile from './frontend/compile';
import * as Chain from './utils/chain';
import { Examples } from './explore/examples';
import { StateCountLimiterFactory } from './explore/limiter';

interface Parameters {
    sourceFilename: string;
    targetFilename: string;
}

export async function run(parameters: Parameters) {
    const { sourceFilename, targetFilename } = parameters;
    const chain = await Chain.get();
    const source = await Compile.fromFile(sourceFilename);
    const target = await Compile.fromFile(targetFilename);

    const examples = new Examples(chain);
    const limiters = new StateCountLimiterFactory(5);

    for await (const example of examples.simulationExamples({ source, target, limiters })) {
        const { source, target, kind } = example;
        console.log(`${kind} example:`);
        console.log(`---`);
        console.log(source.toString());
        console.log(target.toString());
        console.log(`---`);
    }
}
