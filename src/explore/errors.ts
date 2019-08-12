
export interface RuntimeError {
    name: string;
    results: Results;
    hashes: string[];
    message: string;
}

export interface Results {
    [key: string]: TransactionResult;
}

export type TransactionResult = ErrorResult;

export interface ErrorResult {
    error: Error;
    program_counter: number;
    return: string;
    reason: string;
}

type Error = 'revert';

export function isRuntimeError(error: any): error is RuntimeError {
    return ['name', 'results', 'hashes', 'message'].every(key => error[key] !== undefined);
}

export function isResults(results: any): results is Results {
    const values = Object.values(results);
    return values.every(isErrorResult);
}

export function isErrorResult(result: any): result is ErrorResult {
    return result.error !== undefined;
}
