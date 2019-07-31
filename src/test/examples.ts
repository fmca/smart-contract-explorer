import fs from 'fs-extra';
import path from 'path';
import assert, { fail } from 'assert';
import { Examples } from '../contracts/examples';
import { SimulationCounterExample } from '../explore/counterexample';

const resources = path.resolve(__dirname, '..', '..', 'resources');
const contracts = path.join(resources, 'contracts');
const tests = path.resolve(resources, 'example-tests');

describe('explorer integration', function() {
    this.timeout(5000);

    for (const filename of fs.readdirSync(tests)) {
        const name = path.basename(filename, '.json');
        const file = path.join(tests, filename);
        const test = fs.readJSONSync(file);
        const {
            description,
            source,
            target,
            states = 5,
            failure: expectFailure = false,
            fields: expectedFields,
            seedFeatures: expectedSeedFeatures
        } = test;

        it (description, async function() {
            const result = path.join(contracts, `SimulationExamples-${name}.sol`);

            const output = { name: 'SimulationExamples', path: result };
            const paths = {
                source: path.join(contracts, source),
                target: path.join(contracts, target)
            };

            if (expectFailure) {
                await assert.rejects(async () => await Examples.generate({ paths, output, states }), SimulationCounterExample);

            } else {
                await assert.doesNotReject(async () => {
                    const result = await Examples.generate({ paths, output, states });
                    const { examples: { positive, negative }, fields, seedFeatures } = result;

                    if (expectedFields !== undefined)
                        assert.deepEqual(new Set(fields), new Set(expectedFields));

                    if (expectedSeedFeatures !== undefined)
                        assert.deepEqual(new Set(seedFeatures), new Set(expectedSeedFeatures));
                });
            }
        });
    }
});
