import { AbiItem } from 'web3-utils';

import { State } from './states';
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
        const observers = [...invGen.observers()];
        const initialState = await this.executer.initial(observers);
        const workList = [ initialState ];

        while (true) {
            const state = workList.shift();

            if (state === undefined)
                break;

            if (!limiter.accept(state))
                continue;

            yield state;

            for (const invocation of invGen.mutators()) {
                const nextState = await this.executer.execute(state, invocation, observers);

                workList.push(nextState);
            }
        }
    }
}
