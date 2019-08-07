import { State } from '../model/state';
import { Invocation } from '../model/invocations';

export interface Limiter {
    accept(state: State, invocation: Invocation): boolean;
}

export interface LimiterFactory {
    get(): Limiter;
}

export class StateCountLimiterFactory implements LimiterFactory {
    constructor(public stateCount: number) { }

    get(): Limiter {
        return new StateCountLimiter(this.stateCount);
    }
}

export class StateCountLimiter implements Limiter {
    constructor(public stateCount: number) { }

    accept(state: State, invocation: Invocation): boolean {
        if (this.stateCount <= 0)
            return false;

        this.stateCount --;
        return true;
    }
}
