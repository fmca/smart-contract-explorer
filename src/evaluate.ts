import { Debugger } from './utils/debug';
import * as readline from 'readline';
import stream from 'stream';

const debug = Debugger(__filename);

export interface Parameters {
    contractFile: string
}

export async function listen(params: Parameters) {
    for await (const line of lines(process.stdin)) {
        const request = parseRequest(line);
        const result = await processRequest(request);
        console.log(`${result}`);
    }
}

interface Request {
    state: string;
    expression: string;
}

interface Response {
    result: boolean;
}

async function processRequest(request: Request): Promise<Response> {
    throw Error(`TODO implement me`);
}

function parseRequest(line: string): Request {
    throw Error(`TODO implement me`);
}

function lines(input: stream.Readable): AsyncIterable<string> {
    const output = new stream.PassThrough({ objectMode: true });
    const rl = readline.createInterface({ input });
    rl.on("line", line => { output.write(line); });
    rl.on("close", () => { output.push(null); });
    return output;
}
