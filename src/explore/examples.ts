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

type SimulationExample = {
    source: State,
    target: State
};

export class Examples {
    explorer: Explorer;

    constructor(public executer: Executer) {
        this.explorer = new Explorer(executer);
    }

    async * simulationExamples(params: Parameters): AsyncIterable<SimulationExample> {
        const { source, target, address, limiters } = params;
        const traceMap = new Map<string, Set<State>>();

        debug(`exploring source states`);

        for await (const state of this.explorer.forward({ metadata: source, address, limiters })) {
            const traceString = state.trace.toString();
            if (!traceMap.has(traceString))
                traceMap.set(traceString, new Set<State>());
            traceMap.get(traceString)!.add(state);
        }

        debug(`exploring target states`);

        for await (const t of this.explorer.forward({ metadata: target, address, limiters })) {
            const traceString = t.trace.toString();
            for (const s of traceMap.get(traceString) || []) {
                yield { source: s, target: t }
            }
        }

        debug(`generated positive examples`);

    }
}
