import fs from 'fs-extra';
import cp from 'child_process';
import path from 'path';
import assert from 'assert';
import { getSimulationCheckContract } from '../../simulation/product';
import { Unit } from '../../frontend/unit';

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
            source: s,
            target: t,
            valid = true
        } = test;

        it (description, async function() {
            const source = new Unit(path.join(contracts, s));
            const target = new Unit(path.join(contracts, t));
            const output = new Unit(path.join(contracts, `SimulationCheck-${name}.sol`));
            const parameters = { source, target, output };
            const { units } = await getSimulationCheckContract(parameters);

            for (const unit of units)
                await unit.writeContent();

            const command = `solc-verify.py`;
            const args = [output.getPath()];
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
