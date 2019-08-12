import { Observation } from './observation';
import { Trace } from './trace';

export class State {
    constructor(public contractId: string, public trace: Trace,
        public observation: Observation) { }

    toString() {
        return `[[ ${this.trace} : ${this.observation} ]]`;
    }

    obsEquals(that: State) {
        return this.observation.equals(that.observation);
    }

    static initial(contractId: string, observation: Observation): State {
        return new State(contractId, Trace.empty(), observation);
    }

    // static deserialize(obj: { [K in keyof State]: State[K] }): State {
    //     const { contractId, trace: t, observation: o } = obj;
    //     const trace = Trace.deserialize(t);
    //     const observation = Observation.deserialize(o);
    //     return new State(contractId, trace, observation);
    // }
}
