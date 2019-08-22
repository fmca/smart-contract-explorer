import fs from 'fs-extra';
import path from 'path';
import assert from 'assert';
import { generateExamples } from '../../simulation/examples';
import { SimulationCounterExample } from '../../simulation/counterexample';
import { Unit } from '../../frontend/unit';

const resources = path.resolve(__dirname, '..', '..', '..', 'resources');
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
            source: s,
            target: t,
            states = 5,
            failure: expectFailure = false,
            fields: expectedFields,
            seedFeatures: expectedSeedFeatures
        } = test;

        it (description, async function() {
            const source = new Unit(path.join(contracts, s));
            const target = new Unit(path.join(contracts, t));
            const output = new Unit(path.join(contracts, `SimulationExamples-${name}.sol`));

            const parameters = { source, target, output, states };

            if (expectFailure) {
                await assert.rejects(async () => await generateExamples(parameters), SimulationCounterExample);

            } else {
                await assert.doesNotReject(async () => {
                    const result = await generateExamples(parameters);
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
