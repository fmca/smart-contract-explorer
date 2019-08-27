import cp from 'child_process';
import { lines } from './lines';
import { warning } from './warn';

export function Run(console: Console, verbose = false) {
    return async function(command: string, ...args: readonly string[]) {
        const options = {};
        const childProcess = cp.spawn(command, args, options);
        const output: string[] = [];
        const errors: string[] = [];
        const { stdout, stderr } = childProcess;

        const result = new Promise<boolean>((resolve, reject) => {
            childProcess.on('exit', (code, signal) => {
                if (signal !== null)
                    reject(signal);

                else if (code !== null)
                    resolve(code === 0);

                else
                    throw Error(`Unexpected null signal and return code.`);
            });
        });

        for await (const line of lines(stdout)) {
            output.push(line);

            if (verbose)
                console.log(line);
        }

        for await (const line of lines(stderr)) {
            errors.push(line);

            if (verbose)
                warning(line);
        }

        return result.then(success => ({
            success,
            output,
            errors
        }));
    }
}
