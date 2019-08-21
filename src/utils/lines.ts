import stream from 'stream';
import readline from 'readline';

async function * empty<T>(): AsyncIterable<T> {}

export function lines(input: stream.Readable): AsyncIterable<string> {
    if (!input.readable)
        return empty();

    const output = new stream.PassThrough({ objectMode: true });
    const rl = readline.createInterface({ input });
    rl.on("line", line => { output.write(line); });
    rl.on("close", () => { output.end(); });
    return output;
}
