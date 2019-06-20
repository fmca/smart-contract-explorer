import { State } from './states';
import { Executer } from './execute';
import { StateLimiterFactory } from './limiter';
import { InvocationGenerator } from './invocations';
import { Metadata } from '../frontend';

interface Parameters {
    metadata: Metadata;
    address: string;
    limiters: StateLimiterFactory;
};

export class Explorer {
    constructor(public executer: Executer) { }

    async * forward(params: Parameters): AsyncIterable<State> {
        const { metadata, address, limiters } = params;
        const limiter = limiters.get();
        const invGen = new InvocationGenerator(metadata);
        const initialState = await this.executer.initial(metadata, address);
        const workList = [ initialState ];

        while (true) {
            const state = workList.shift();

            if (state === undefined)
                break;

            if (!limiter.accept(state))
                continue;

            yield state;

            for (const invocation of invGen.mutators()) {
                const nextState = await this.executer.execute(state, invocation);

                workList.push(nextState);
            }
        }
    }
}
