import { State } from './states';
import { Executer } from './execute';
import { StateLimiterFactory } from './limiter';
import { Explorer } from './explorer';
import { Metadata } from '../frontend';
import { Debugger } from '../debug';

const debug = Debugger(__filename);

interface Parameters {
    source: Metadata;
    target: Metadata;
    address: string;
    limiters: StateLimiterFactory;
};

type Kind = 'positive' | 'negative';

type SimulationExample = {
    source: State;
    target: State;
    kind: Kind;
};

export class Examples {
    explorer: Explorer;

    constructor(public executer: Executer) {
        this.explorer = new Explorer(executer);
    }

    async * simulationExamples(params: Parameters): AsyncIterable<SimulationExample> {
        const { source, target, address, limiters } = params;
        const context = new Context();

        debug(`exploring source states`);

        for await (const state of this.explorer.forward({ metadata: source, address, limiters })) {
            context.add(state);
        }

        const workList: SimulationExample[] = [];

        debug(`exploring target states`);

        for await (const t of this.explorer.forward({ metadata: target, address, limiters })) {
            for (const s of context.getTraceEquivalent(t))
                yield { source: s, target: t, kind: 'positive' }

            for (const s of context.getObservationDistinct(t))
                workList.push({ source: s, target: t, kind: 'negative' });
        }

        debug(`generated positive examples`);

        while (workList.length > 0) {
            const example = workList.shift()!;
            yield example;
        }

        debug(`TODO: consider predecessors`);
    }
}

class Context {
    traceMap: Map<string, Set<State>>;
    observationMap: Map<string, Set<State>>;

    constructor() {
        this.traceMap = new Map<string, Set<State>>();
        this.observationMap = new Map<string, Set<State>>();
    }

    add(state: State): void {
        const traceString = state.trace.toString();
        if (!this.traceMap.has(traceString))
            this.traceMap.set(traceString, new Set<State>());
        this.traceMap.get(traceString)!.add(state);

        const observationString = state.observation.toString();
        if (!this.observationMap.has(observationString))
            this.observationMap.set(observationString, new Set<State>());
        this.observationMap.get(observationString)!.add(state);
    }

    getTraceEquivalent(state: State): Iterable<State> {
        const traceString = state.trace.toString();
        return this.traceMap.get(traceString) || [];
    }

    * getObservationDistinct(state: State): Iterable<State> {
        const observationString = state.observation.toString();
        for (const [obs, states] of this.observationMap.entries()) {
            if (obs === observationString)
                continue;
            for (const state of states)
                yield state;
        }
    }

}
