import fs from 'fs-extra';
import * as Compile from './frontend/compile';
import { getProductCode } from './contracts/product'
import { extendWithFeatures } from './contracts/extension';
import { Debugger } from './utils/debug';

const debug = Debugger(__filename);

export interface Parameters {
    specFile: string;
    implFile: string;
    productFile: string;
}

export async function run(parameters: Parameters) {
    const { specFile, implFile, productFile } = parameters;

    const specMetadata = await Compile.fromFile(specFile);
    const implMetadata = await Compile.fromFile(implFile);

    const productMetadata = getProductCode(specMetadata, implMetadata, productFile);
    debug(`product is: %O`, productMetadata);
    await fs.writeFile(productFile, productMetadata.source);

    const [newproductMetadata, _] = await extendWithFeatures(productMetadata,[`HelloAfrica.counter==HelloAmerica.counter`]);
    debug(`newproductMetadata is: %s`, newproductMetadata.source.content);
}

