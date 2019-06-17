import { AbiItem } from 'web3-utils';

import { State, emptyTrace } from './states';
import { Executer } from './execute';
import { Limiter } from './limiter';
import { InvocationGenerator } from './invocations';

export class Explorer {
    executer: Executer;

    constructor(executer: Executer) {
        this.executer = executer;
    }

    async * explore(abi: Iterable<AbiItem>, limiter: Limiter): AsyncIterable<State> {
        const invGen = new InvocationGenerator(abi);

        const initialState: State = new State(emptyTrace);
        const workList = [ initialState ];

        while (true) {
            const state = workList.shift();

            if (state === undefined)
                break;

            if (!limiter.accept(state))
                continue;

            yield state;

            for (const invocation of invGen.invocations()) {
                const nextState = await this.executer.execute(state, invocation);

                workList.push(nextState);
            }
        }
    }
}
