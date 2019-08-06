import { State, Operation } from './states';
import { ExecutorFactory, isErrorResult } from './execute';
import { LimiterFactory } from './limiter';
import { InvocationGenerator } from './invocations';
import { Address, Metadata } from '../frontend/metadata';
import { Debugger } from '../utils/debug';

const debug = Debugger(__filename);

interface Parameters {
    metadata: Metadata;
    limiters: LimiterFactory;
};

export type Transition = {
    pre?: State;
    operation?: Operation;
    post: State;
};

export class Explorer {
    constructor(public executorFactory: ExecutorFactory, public accounts: Address[]) { }

    async * states(params: Parameters): AsyncIterable<State> {
        for await (const { post } of this.transitions(params))
            yield post;
    }

    async * transitions(params: Parameters): AsyncIterable<Transition> {
        const { metadata, limiters } = params;
        const limiter = limiters.get();
        const executer = this.executorFactory.getExecutor(metadata);
        const invGen = new InvocationGenerator(metadata, this.accounts);
        const initial = await this.initial(params);
        const workList = [ initial ];
        debug({ post: initial });
        yield { post: initial };

        while (workList.length > 0) {
            const pre = workList.shift()!;

            for await (const invocation of invGen.mutators()) {
                if (!limiter.accept(pre, invocation))
                    continue;

                const result = await executer.execute(pre, invocation);

                if (isErrorResult(result))
                    continue;

                const { operation, state: post } = result;
                const transition = { pre, operation, post };
                debug(transition);
                yield transition;
                workList.push(post);
            }
        }
    }

    async initial(params: Parameters): Promise<State> {
        const { metadata } = params;
        const executer = this.executorFactory.getExecutor(metadata);
        const state = await executer.initial();
        return state;
    }
}
