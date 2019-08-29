import { Metadata } from "./metadata";
import * as Compile from "./compile";
import fs from "fs-extra";
import path from "path";

export class Unit {
    protected updated: boolean;
    protected content: Supplier<string>;
    protected metadata: Supplier<Metadata>;

    constructor(protected path: string, content?: Supplier<string>, metadata?: Supplier<Metadata>) {
        this.updated = !!content;
        this.content = content || this.defaultContentSupplier();
        this.metadata = metadata || this.defaultMetadataSupplier();
    }

    defaultContentSupplier() {
        let content: string | undefined;
        return {
            get: async () => {
                if (content === undefined) {
                    const buffer = await fs.readFile(this.path);
                    content = buffer.toString();
                }
                return content;
            }
        };
    }

    defaultMetadataSupplier() {
        let metadata: Metadata | undefined;
        return {
            get: async () => {
                if (metadata === undefined) {
                    const path = this.path;
                    const content = await this.content.get();
                    const sourceInfo = { path, content };
                    metadata = await Compile.fromString(sourceInfo);
                }
                return metadata;
            }
        };
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
        return new Unit(_path, this.content);
    }

    relocate(dirname: string) {
        const basename = path.basename(this.path);
        const _path = path.join(dirname, basename);
        return new Unit(_path, this.content);
    }

    getDirname() {
        return path.dirname(this.path);
    }

    getBasename() {
        return path.basename(this.path);
    }

    async getContent() {
        return this.content.get();
    }

    async getSourceInfo() {
        const path = this.path;
        const content = await this.getContent();
        return { path, content };
    }

    async getMetadata() {
        return this.metadata.get();
    }

    async rewrite(f: SyntacticRewriter | SemanticRewriter) {
        const content = await this.getContent();
        const modified = isSyntacticRewriter(f)
            ? await f(content)
            : await f(content, await this.getMetadata());
        this.setContent(modified);
    }

    setContent(content: string) {
        this.content = { get: async () => content };
        this.updated = true;
    }

    async writeContent() {
        if (this.updated) {
            const content = await this.content.get();
            await fs.writeFile(this.path, content);
            this.updated = false;
        }
    }
}

interface Supplier<T> {
    get(): Promise<T>;
}

type SyntacticRewriter = (content: string) => Promise<string>;
type SemanticRewriter = (content: string, metadata: Metadata) => Promise<string>;

function isSyntacticRewriter(f: (...args: any[]) => any): f is SyntacticRewriter {
    return f.length === 1;
}

function isSemanticRewriter(f: (...args: any[]) => any): f is SemanticRewriter {
    return f.length === 2;
}
