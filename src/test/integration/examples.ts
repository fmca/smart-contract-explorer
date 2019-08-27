import fs from 'fs-extra';
import path from 'path';
import assert from 'assert';
import { generateExamples } from '../../simulation/examples';
import { SimulationCounterExample } from '../../simulation/counterexample';
import { Unit } from '../../frontend/unit';
import { ExpressionData, Feature } from '../../simulation/simulation-data';

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
            expressions: expectedExpressions,
            features: expectedFeatures
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
                    const { simulationData } = result;

                    if (expectedExpressions !== undefined)
                        compareExpressionLists(simulationData.expressions, expectedExpressions);

                    if (expectedFeatures !== undefined)
                        compareFeatureLists(simulationData.features, expectedFeatures);
                });
            }
        });
    }
});

function compareExpressionLists(actual: ExpressionData[], expected: ExpressionData[]) {
    const hasIds = expected.some(({ id }) => id !== undefined);
    const hasTypes = expected.some(({ pieType }) => pieType !== undefined);

    if (hasIds) {
        assert.deepEqual(
            new Set(actual.map(({ id }) => id)),
            new Set(expected.map(({ id }) => id))
        );

        const m1 = new Map(actual.map(e => [e.id, e]));
        const m2 = new Map(expected.map(e => [e.id, e]));

        for (const key of m1.keys())
            compareExpressions(m1.get(key)!, m2.get(key)!);

    } else if (hasTypes) {
        assert.deepEqual(
            new Set(actual.map(({ pieType }) => pieType)),
            new Set(expected.map(({ pieType }) => pieType))
        );
    }
}

function compareExpressions(actual: ExpressionData, expected: ExpressionData) {
    const { id, pieType } = expected;

    if (id !== undefined)
        assert.equal(actual.id, id);

    if (pieType !== undefined)
        assert.equal(actual.pieType, pieType);
}

function compareFeatureLists(actual: Feature[], expected: Feature[]) {
    assert.deepEqual(
        new Set(actual.map(({ name }) => name)),
        new Set(expected.map(({ name }) => name))
    );

    const m1 = new Map(actual.map(f => [f.name, f]));
    const m2 = new Map(expected.map(f => [f.name, f]));

    for (const key of m1.keys())
        compareFeatures(m1.get(key)!, m2.get(key)!);
}

function compareFeatures(actual: Feature, expected: Feature) {
    const { name, expression } = expected;

    if (name !== undefined)
        assert.equal(actual.name, name);

    if (expression !== undefined)
        assert.equal(actual.expression, expression);
}
