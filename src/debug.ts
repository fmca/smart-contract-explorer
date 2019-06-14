import Debug from 'debug';
import path from 'path';

export function Debugger(filename: string) {
    const pack = require('../package.json').name;
    const file = path.basename(filename, '.js');
    const name = file === 'index' ? pack : `${pack}:${file}`;
    return Debug(name);
}
