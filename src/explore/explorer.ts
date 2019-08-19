import { State, Operation } from '../model';
import { ExecutorFactory } from './execute';
import { LimiterFactory } from './limiter';
import { InvocationGenerator } from '../model';
import { Address, Metadata } from '../frontend/metadata';
import { Debugger } from '../utils/debug';

const debug = Debugger(__filename);

interface Parameters {
    metadata: Metadata;
    invocationGenerator: InvocationGenerator;
    limiters: LimiterFactory;
};

export type Transition = {
    pre?: State;
    operation?: Operation;
    post: State;
};

export class Explorer {
    constructor(
        public executorFactory: ExecutorFactory,
        public accounts: Address[]) { }

    async * states(params: Parameters): AsyncIterable<State> {
        for await (const { post } of this.transitions(params))
            yield post;
    }

    async * transitions(params: Parameters): AsyncIterable<Transition> {
        const { metadata, limiters, invocationGenerator } = params;
        const limiter = limiters.get();
        const executer = this.executorFactory.getExecutor(invocationGenerator,metadata);

        const workList: State[] = [ ];

        debug(`exploring initial states`);

        for await (const initial of this.initials(params)) {
            debug(`initial: %s`, initial);
            yield { post: initial };
            workList.push(initial);
        }

        debug(`exploring transitions`);

        while (workList.length > 0) {
            const pre = workList.shift()!;
            debug(`prev: %s`, pre);

            for await (const invocation of invocationGenerator.mutators()) {
                if (!limiter.accept(pre, invocation))
                    continue;

                const result = await executer.execute(pre, invocation);

                const { operation, state: post } = result;
                debug(`oper: %s`, operation);
                debug(`next: %s`, post);

                const transition = { pre, operation, post };
                yield transition;
                workList.push(post);
            }
        }
    }

    initials(params: Parameters): AsyncIterable<State> {
        const { metadata, invocationGenerator } = params;
        const executer = this.executorFactory.getExecutor(invocationGenerator, metadata);
        return executer.initials();
    }
}
