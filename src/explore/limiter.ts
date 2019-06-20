import { State } from './states';

export interface StateLimiter {
    accept(state: State): boolean;
}

export interface StateLimiterFactory {
    get(): StateLimiter;
}

export class StateCountLimiterFactory {
    constructor(public stateCount: number) { }

    get(): StateLimiter {
        return new StateCountLimiter(this.stateCount);
    }
}

export class StateCountLimiter {
    constructor(public stateCount: number) { }

    accept(state: State): boolean {
        if (this.stateCount <= 0)
            return false;

        this.stateCount --;
        return true;
    }
}
