import fs from 'fs-extra';
import cp from 'child_process';
import path from 'path';
import assert from 'assert';
import { getSimulationCheckContract } from '../../simulation/product';

const resources = path.resolve(__dirname, '..', '..', '..', 'resources');
const contracts = path.join(resources, 'contracts');
const tests = path.resolve(resources, 'verifier-tests');

describe('verifier integration', function() {
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
            const result = path.join(contracts, `SimulationCheck-${name}.sol`);
            const output = { name: 'SimulationCheck', path: result };
            const paths = {
                source: path.join(contracts, source),
                target: path.join(contracts, target)
            };
            const { contract, internalized } = await getSimulationCheckContract({ paths, output });

            // await fs.mkdirp(dir);
            for (const { path, content } of [contract, ...Object.values(internalized)])
                await fs.writeFile(path, content);

            const command = `solc-verify.py`;
            const args = [output.path];
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
