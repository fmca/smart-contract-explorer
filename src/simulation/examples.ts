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

type Kind = 'positive' | 'negative';

export type AbstractExample = {
    id: string;
}

export type AbstractExamples = {
    positive: AbstractExample[];
    negative: AbstractExample[];
}

export type SimulationExample = {
    source: State;
    target: State;
    kind: Kind;
};

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

    const generator = new ExampleGenerator(chain, states)
    const fn = () => generator.simulationExamples(source, target);

    const values = new ValueGenerator(accounts);

    const c = new SimulationExamplesContract(source, target, output, fn, values);
    await output.setContent(c);

    const examplesContractPath = output.getPath();
    const examples = await c.getAbstractExamples();
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

    constructor(public chain: Chain.BlockchainInterface, states: number) {
        this.factory = new ExecutorFactory(chain);
        this.limiters = new StateCountLimiterFactory(states);
    }

    async getExplorer() {
        const accounts = await this.chain.getAccounts();
        return new Explorer(this.factory, accounts);
    }

    async * simulationExamples(source: Metadata, target: Metadata): AsyncIterable<SimulationExample> {
        const explorer = await this.getExplorer();
        const context = new Context();
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
        const counts = { positive: 0, negative: 0 };

        for await (const transition of explorer.transitions(targetParams)) {
            const { post: t } = transition;
            context.addTarget(transition);

            for (const s of context.getSourceTraceEquivalent(t)) {
                counts.positive++;
                yield { source: s, target: t, kind: 'positive' };
            }

            for (const s of context.getSourceObservationDistinct(t))
                workList.push({ source: s, target: t, kind: 'negative' });
        }

        debug(`generated ${counts.positive} positive examples`);

        while (workList.length > 0) {
            const example = workList.shift()!;

            const { source, target } = example;

            if (source.trace.equals(target.trace))
                throw new SimulationCounterExample(source, target);

            counts.negative++;
            yield example;

            for (const pred of context.getNewJointPredecessors(example)) {
                debug(`predecessor: %s * %s`, pred.source, pred.target);
                debug(`from: %s * %s`, example.source, example.target);
                workList.push(pred);
            }
        }

        debug(`generated ${counts.negative} negative examples`);
    }
}

class Context {
    traces: Map<string, Set<State>>;
    predecessorStates: Map<State, Map<string, Set<State>>>;
    exploredPairs: Map<State, Set<State>>;

    constructor() {
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

                    yield { source: sp, target: tp, kind };
                    this.exploredPairs.get(sp)!.add(tp);
                }
            }
        }
    }

}
