
let warningConsole: Console | undefined;

export function warning(message: string) {
    if (warningConsole !== undefined)
        warningConsole.error(`Warning: %s`, message);
}

export function setConsole(console: Console) {
    warningConsole = console;
}
