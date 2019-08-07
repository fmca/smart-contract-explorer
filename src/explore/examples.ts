import path from 'path';
import { State } from './states';
import { ExecutorFactory } from './execute';
import { LimiterFactory, StateCountLimiterFactory } from './limiter';
import { Explorer, Transition } from './explorer';
import { Metadata, SourceInfo } from '../frontend/metadata';
import * as Compile from '../frontend/compile';
import { Debugger } from '../utils/debug';
import * as Chain from '../utils/chain';
import { getProductSeedFeatures, } from './product';
import { SimulationExamplesContract, ContractInfo, ExampleGenerator } from '../contracts';
import * as Pie from '../sexpr/pie';
import { SimulationCounterExample } from './counterexample';
import { exemplify } from '../contracts/rewriting';
import { ValueGenerator } from './values';
import { FunctionMapping } from './mapping';
import { InvocationGenerator } from './invocations';

const debug = Debugger(__filename);

interface Parameters {
    paths: {
        source: string;
        target: string;
    },
    states: number;
    output: ContractInfo
}

interface Result {
    contract: SourceInfo;
    examples: AbstractExamples;
    fields: string[];
    seedFeatures: string[];
    exemplified: {
        source: SourceInfo,
        target: SourceInfo
    }
}

type Kind = 'positive' | 'negative';

export type AbstractExample = {
    id: {
        contract: string;
        method: string;
    }
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

export class Examples {
    explorer: Explorer;
    limiters: LimiterFactory;

    constructor(chain: Chain.BlockchainInterface, states: number) {
        const { accounts } = chain;
        const factory = new ExecutorFactory(chain);
        this.explorer = new Explorer(factory, accounts);
        this.limiters = new StateCountLimiterFactory(states);
    }

    async * simulationExamples(source: Metadata, target: Metadata): AsyncIterable<SimulationExample> {
        const context = new Context();
        const { limiters } = this;
        const workList: SimulationExample[] = [];
        const mapping = FunctionMapping.getMapping(source, target);
        const si = new InvocationGenerator([...mapping.sources()], this.explorer.accounts);
        const ti = new InvocationGenerator([...mapping.targets()], this.explorer.accounts);
        const sourceParams = { metadata: source, limiters, invocationGenerator: si };
        const targetParams = { metadata: target, limiters, invocationGenerator: ti };

        debug(`exploring source states`);

        for await (const transition of this.explorer.transitions(sourceParams)) {
            context.addSource(transition);
        }

        debug(`exploring target states`);

        for await (const transition of this.explorer.transitions(targetParams)) {
            const { post: t } = transition;
            context.addTarget(transition);

            for (const s of context.getSourceTraceEquivalent(t))
                yield { source: s, target: t, kind: 'positive' };

            for (const s of context.getSourceObservationDistinct(t))
                workList.push({ source: s, target: t, kind: 'negative' });
        }

        debug(`generated positive examples`);

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

        debug(`generated negative examples`);
    }

    static async generate(parameters: Parameters): Promise<Result> {
        const { paths, states, output: info } = parameters;
        const dir = path.dirname(info.path);
        const se = await exemplify(paths.source, dir);
        const te = await exemplify(paths.target, dir);
        const exemplified = {
            source: se,
            target: te
        };
        const s = { ...await Compile.fromFile(paths.source), source: se };
        const t = { ...await Compile.fromFile(paths.target), source: te };

        const chain = await Chain.get();
        const { accounts } = chain;
        const exampleGen = Examples.getExamples(chain, states);
        const values = new ValueGenerator(accounts);
        const contract = new SimulationExamplesContract(s, t, info, exampleGen, values);
        const examples = await contract.getAbstractExamples();

        const fields = [
            ...Pie.fieldDecls(s).map(f => `${s.name}.${f}`),
            ...Pie.fieldDecls(t).map(f => `${t.name}.${f}`)
        ];
        const seedFeatures = getProductSeedFeatures(s, t).map(([f,_]) => f);
        return { contract: await contract.getSourceInfo(), exemplified, examples, fields, seedFeatures };
    }

    static getExamples(chain: Chain.BlockchainInterface, states: number): ExampleGenerator {
        return async function*(source: Metadata, target: Metadata): AsyncIterable<SimulationExample> {
            const examples = new Examples(chain, states);
            for await (const example of examples.simulationExamples(source, target))
                yield example;
        };
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
