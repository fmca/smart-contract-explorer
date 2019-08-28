import { Metadata } from "./metadata";
import * as Compile from "./compile";
import fs from "fs-extra";
import path from "path";

export class Unit {
    protected updated = false;

    constructor(protected path: string, protected content?: string, protected metadata?: Metadata) {
        if (content !== undefined)
            this.updated = true;
    }

    getPath() {
        return this.path;
    }

    getName() {
        const extname = path.extname(this.path);
        const basename = path.basename(this.path, extname);
        const [ name ] = basename.split(/[-.]/);
        return name;
    }

    suffix(suffix: string) {
        const dirname = path.dirname(this.path);
        const extname = path.extname(this.path);
        const basename = path.basename(this.path, extname);
        const _path = path.join(dirname, `${basename}${suffix}${extname}`);
        return new Unit(_path);
    }

    relocate(dirname: string) {
        const basename = path.basename(this.path);
        const _path = path.join(dirname, basename);
        return new Unit(_path);
    }

    getDirname() {
        return path.dirname(this.path);
    }

    getBasename() {
        return path.basename(this.path);
    }

    async getContent() {
        if (this.content === undefined) {
            const buffer = await fs.readFile(this.path);
            this.content = buffer.toString();
        }
        return this.content;
    }

    async getSourceInfo() {
        const path = this.path;
        const content = await this.getContent();
        return { path, content };
    }

    async getMetadata() {
        if (this.metadata === undefined) {
            const sourceInfo = await this.getSourceInfo();
            this.metadata = await Compile.fromString(sourceInfo);
        }
        return this.metadata;
    }

    async rewrite(f: (content: string) => string | Promise<string>, path: string) {
        const content = await this.getContent();
        const modified = await f(content);
        return new Unit(path, modified);
    }

    async rewriteInto(f: (content: string) => string | Promise<string>, unit: Unit) {
        const content = await this.getContent();
        const modified = await f(content);
        unit.setContent(modified);
    }

    async rewriteInPlace(f: (content: string) => string | Promise<string>) {
        const content = await this.getContent();
        const modified = await f(content);
        await this.setContent(modified);
    }

    async setContent(content: string | Content) {
        this.content = (typeof(content) === 'string')
            ? content
            : await content.getContent();
        this.updated = true;
    }

    async writeContent() {
        if (this.updated) {
            await fs.writeFile(this.path, this.content);
            this.updated = false;
        }
    }
}

interface Content {
    getContent: () => Promise<string>;
}
