import { Value } from './values';
import { Invocation } from './invocations';

type Result = {
    outputs: Value[];
};

type Operation = {
    invocation: Invocation;
    result: Result;
};

export type Trace = {
    actions: Operation[];
};

export const emptyTrace: Trace = { actions: [] };

type Observation = {

};

export type State = {
    trace: Trace;
};
