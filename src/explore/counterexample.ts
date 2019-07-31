import { State } from "./states";

export class SimulationCounterExample extends Error {
    constructor(public source: State, public target: State) {
        super("Counterexample");
    }
}
