import { State } from './states';

export class Limiter {
    stateCount: number;

    constructor(stateCount: number) {
        this.stateCount = stateCount;
    }

    accept(state: State): boolean {
        if (this.stateCount <= 0)
            return false;

        this.stateCount --;
        return true;
    }
}
