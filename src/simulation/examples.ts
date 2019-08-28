import { State } from '../model/state';
import { ExecutorFactory } from '../explore/execute';
import { LimiterFactory, StateCountLimiterFactory } from '../explore/limiter';
import { Explorer, Transition } from '../explore/explorer';
import { Metadata } from '../frontend/metadata';
import { Debugger } from '../utils/debug';
import * as Chain from '../utils/chain';
import { getProductSeedFeatures, } from './product';
import { SimulationExamplesContract } from '../contracts';
import { SimulationCounterExample } from './counterexample';
import { storageAccessorsForPie } from './accessors';
import { exemplify } from '../contracts/rewriting';
import { ValueGenerator } from '../model/values';
import { FunctionMapping } from './mapping';
import { InvocationGenerator } from '../model';
import { Unit } from '../frontend/unit';
import { SimulationData } from './simulation-data';
import path from 'path';

const debug = Debugger(__filename);

interface Parameters {
    source: Unit;
    target: Unit;
    output: Unit;
    states: number;
}

interface Result {
    simulationData: SimulationData;
    units: Unit[];
}

export interface AbstractExample {
    id: string;
}

export interface SimulationExample extends AbstractExample {
    source: State;
    target: State;
    kind: Kind;
};

type Kind = 'positive' | 'negative';

export async function generateExamples(parameters: Parameters): Promise<Result> {
    const { source: s, target: t, states, output } = parameters;

    const se = s.suffix('.exemplified').relocate(output.getDirname());
    const te = t.suffix('.exemplified').relocate(output.getDirname());
    const units = [se, te, output];

    await exemplify(s, se);
    await exemplify(t, te);

    const source = await se.getMetadata();
    const target = await te.getMetadata();

    const chain = new Chain.BlockchainInterface();
    const accounts = await chain.getAccounts();
    const values = new ValueGenerator(accounts);

    const generator = new ExampleGenerator(chain, states)
    const fullExamples = await generator.getExamples(source, target);

    const c = new SimulationExamplesContract(source, target, output, fullExamples, values);
    await output.setContent(c);

    const examplesContractPath = output.getBasename();
    const examples = {
        positive: fullExamples.positive.map(({ id }) => ({ id })),
        negative: fullExamples.negative.map(({ id }) => ({ id }))
    };
    const expressions = [
        ...await storageAccessorsForPie(se),
        ...await storageAccessorsForPie(te)
    ];
    const features = getProductSeedFeatures(source, target);
    const simulationData = { examplesContractPath, examples, expressions, features };
    return { units, simulationData };
}


export class ExampleGenerator {
    factory: ExecutorFactory;
    limiters: LimiterFactory;
    getId: IdGenerator;

    constructor(public chain: Chain.BlockchainInterface, states: number) {
        this.factory = new ExecutorFactory(chain);
        this.limiters = new StateCountLimiterFactory(states);
        this.getId = idGenerator();
    }

    async getExplorer() {
        const accounts = await this.chain.getAccounts();
        return new Explorer(this.factory, accounts);
    }

    async getExamples(source: Metadata, target: Metadata) {
        const positive: SimulationExample[] = [];
        const negative: SimulationExample[] = [];

        for await (const example of this.simulationExamples(source, target))
            (example.kind === 'positive' ? positive : negative).push(example);

        const examples = { positive, negative };
        return examples;
    }

    async * simulationExamples(source: Metadata, target: Metadata): AsyncIterable<SimulationExample> {
        const explorer = await this.getExplorer();
        const context = new Context(this.getId);
        const { limiters } = this;
        const workList: SimulationExample[] = [];
        const mapping = FunctionMapping.getMapping(source, target);
        const si = new InvocationGenerator({ getFunctions: () => mapping.sources() }, explorer.accounts);
        const ti = new InvocationGenerator({ getFunctions: () => mapping.targets() }, explorer.accounts);
        const sourceParams = { metadata: source, limiters, invocationGenerator: si };
        const targetParams = { metadata: target, limiters, invocationGenerator: ti };

        debug(`exploring source states`);

        for await (const transition of explorer.transitions(sourceParams)) {
            context.addSource(transition);
        }

        debug(`exploring target states`);

        for await (const transition of explorer.transitions(targetParams)) {
            const { post: t } = transition;
            context.addTarget(transition);

            for (const s of context.getSourceTraceEquivalent(t)) {
                const kind = 'positive';
                const id = this.getId(kind);
                yield { id, source: s, target: t, kind };
            }

            for (const s of context.getSourceObservationDistinct(t)) {
                const kind = 'negative';
                const id = this.getId(kind);
                workList.push({ id, source: s, target: t, kind });
            }
        }

        while (workList.length > 0) {
            const example = workList.shift()!;

            const { source, target } = example;

            if (source.trace.equals(target.trace))
                throw new SimulationCounterExample(source, target);

            yield example;

            for (const pred of context.getNewJointPredecessors(example)) {
                debug(`predecessor: %s * %s`, pred.source, pred.target);
                debug(`from: %s * %s`, example.source, example.target);
                workList.push(pred);
            }
        }
    }
}

class Context {
    traces: Map<string, Set<State>>;
    predecessorStates: Map<State, Map<string, Set<State>>>;
    exploredPairs: Map<State, Set<State>>;

    constructor(public getId: IdGenerator) {
        this.traces = new Map<string, Set<State>>();
        this.predecessorStates = new Map<State, Map<string, Set<State>>>();
        this.exploredPairs = new Map<State, Set<State>>();
    }

    addSource(transition: Transition): void {
        const { post } = transition;
        this.addSourceState(post);
        this.addTransition(transition);
    }

    addSourceState(state: State): void {
        const traceString = state.trace.toString();
        if (!this.traces.has(traceString))
            this.traces.set(traceString, new Set<State>());
        this.traces.get(traceString)!.add(state);
    }

    addTarget(transition: Transition): void {
        this.addTransition(transition);
    }

    addTransition(transition: Transition): void {
        const { pre, post, operation } = transition;

        if (pre === undefined || operation === undefined)
            return;

        const op = operation.toString();

        if (this.predecessorStates.get(post) === undefined)
            this.predecessorStates.set(post, new Map<string,Set<State>>());

        if (this.predecessorStates.get(post)!.get(op) === undefined)
            this.predecessorStates.get(post)!.set(op, new Set<State>());

        this.predecessorStates.get(post)!.get(op)!.add(pre);
    }

    getSourceTraceEquivalent(state: State): Iterable<State> {
        const traceString = state.trace.toString();
        return this.traces.get(traceString) || [];
    }

    * getSourceObservationDistinct(state: State): Iterable<State> {
        debug(`target observation: %s`, state.observation);
        for (const states of this.traces.values()) {
            for (const s of states) {
                if (!s.obsEquals(state)) {
                    debug(`distinct observation: %s`, s.observation);
                    yield s;
                } else {
                    debug(`matching observation: %s`, s.observation);
                }
            }
        }
    }

    getPredecessorOperations(state: State): Iterable<string> {
        const map = this.predecessorStates.get(state);
        return map === undefined ? [] : map.keys();
    }

    getPredecessorStates(state: State, operation: string): Iterable<State> {
        const map = this.predecessorStates.get(state);
        return map === undefined ? [] : map.get(operation) || [];
    }

    * getNewJointPredecessors(example: SimulationExample): Iterable<SimulationExample> {
        const { source: s, target: t, kind } = example;

        for (const op of this.getPredecessorOperations(s)) {
            for (const sp of this.getPredecessorStates(s, op)) {
                for (const tp of this.getPredecessorStates(t, op)) {

                    if (!this.exploredPairs.has(sp))
                        this.exploredPairs.set(sp, new Set<State>());

                    if (this.exploredPairs.get(sp)!.has(tp))
                        continue;

                    const id = this.getId(kind);
                    yield { id, source: sp, target: tp, kind };
                    this.exploredPairs.get(sp)!.add(tp);
                }
            }
        }
    }

}

type IdGenerator = (_: Kind) => string;

function idGenerator(): IdGenerator {
    const counts = { positive: 0, negative: 0 };

    return function(kind: Kind) {
        const id = `${kind}Example${counts[kind]++}`;
        return id;
    }
}
