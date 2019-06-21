import { State, Operation } from './states';
import { Executer } from './execute';
import { LimiterFactory } from './limiter';
import { InvocationGenerator } from './invocations';
import { Metadata } from '../frontend/metadata';

interface Parameters {
    metadata: Metadata;
    address: string;
    limiters: LimiterFactory;
};

export type Transition = {
    pre?: State;
    operation?: Operation;
    post: State;
};

export class Explorer {
    constructor(public executer: Executer) { }

    async * states(params: Parameters): AsyncIterable<State> {
        for await (const { post } of this.transitions(params))
            yield post;
    }

    async * transitions(params: Parameters): AsyncIterable<Transition> {
        const { metadata, limiters } = params;
        const limiter = limiters.get();
        const invGen = new InvocationGenerator(metadata, this.executer.creator);
        const initial = await this.initial(params);
        const workList = [ initial ];
        yield { post: initial };

        while (workList.length > 0) {
            const pre = workList.shift()!;

            for await (const invocation of invGen.mutators()) {
                if (!limiter.accept(pre, invocation))
                    continue;

                const { operation, state: post } = await this.executer.execute(pre, invocation);
                const transition = { pre, operation, post };
                yield transition;
                workList.push(post);
            }
        }
    }

    async initial(params: Parameters): Promise<State> {
        const { metadata, address } = params;
        const state = await this.executer.initial(metadata, address);
        return state;
    }
}
