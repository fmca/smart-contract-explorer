import fs from 'fs-extra';
import cp from 'child_process';
import path from 'path';
import assert from 'assert';
import { getSimulationCheckContract } from '../contracts/product';

const resources = path.resolve(__dirname, '..', '..', 'resources');
const tests = path.resolve(resources, 'verifier-tests');

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
            valid = true
        } = test;

        it (description, async function() {
            const result = path.join(resources, `SimulationCheck-${name}.sol`);
            const output = { name: 'SimulationCheck', path: result };
            const paths = {
                source: path.join(resources, source),
                target: path.join(resources, target)
            };
            const { metadata } = await getSimulationCheckContract({ paths, output });
            const { source: { path: p, content } } = metadata;

            await fs.writeFile(p, content);

            const command = `solc-verify.py`;
            const args = [p];
            const options = {};
            const success = await new Promise<boolean>((resolve, reject) => {
                try {
                    cp.spawn(command, args, options).on('exit', code => resolve(!code));
                } catch (e) {
                    reject(e);
                }
            });
            assert.equal(success, valid);
        });
    }
});
