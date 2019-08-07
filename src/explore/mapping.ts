import { Metadata } from '../frontend/metadata';
import { FunctionDefinition, VariableDeclaration } from '../solidity';
import { zip } from 'd3-array';
import { Debugger } from '../utils/debug';
const debug = Debugger(__filename);

type Source = FunctionDefinition;
type Target = FunctionDefinition;

type Entry = {
    source: Source;
    target: Target;
}

export abstract class FunctionMapping {
    constructor(public sourceMetadata: Metadata, public targetMetadata: Metadata) {}

    * sources(): Iterable<Source> {
        for (const { source } of this.entries())
            yield source;
    }

    * targets(): Iterable<Target> {
        for (const { target } of this.entries())
            yield target;
    }

    abstract entries(): Iterable<Entry>;

    static getMapping(source: Metadata, target: Metadata) {
        return new SimpleFunctionMapping(source, target);
    }
}

class SimpleFunctionMapping extends FunctionMapping {

    _entries: Entry[];

    constructor(sourceMetadata: Metadata, targetMetadata: Metadata) {
        super(sourceMetadata, targetMetadata);
        this._entries = [];

        for (const target of Metadata.getFunctions(targetMetadata)) {

            const source = target.name === ''

                // find a matching constructor
                ? [...Metadata.getFunctions(sourceMetadata)]
                    .find(f => f.name === '' && SimpleFunctionMapping.compatible(f, target))

                // find the same-named function
                : Metadata.findFunction(target.name, sourceMetadata);

            // Insist on matching constructors
            if (target.name === '' && source === undefined)
                throw Error(`No matching constructor found`);

            // no corresponding source method
            if (source === undefined)
                continue;

            // target method not accessible
            if (!['public', 'external'].includes(target.visibility))
                continue;

            // signatures are not compatible
            if (!SimpleFunctionMapping.compatible(source, target))
                throw Error(`Incompatible signatures for function: ${target.name}`);

            const entry = { source, target };
            this._entries.push(entry);
            debug(`entry: %O`, entry);
        }
    }

    static compatible(source: Source, target: Target) {
        const { parameters: { parameters: ps1 }, returnParameters: { parameters: rs1 } } = source;
        const { parameters: { parameters: ps2 }, returnParameters: { parameters: rs2 } } = target;

        if (ps1.length != ps2.length)
            return false;

        if (rs1.length != rs2.length)
            return false;

        for (const [v1, v2] of zip([...ps1, ...rs1], [...ps2, ...rs2])) {
            const { typeDescriptions: { typeString: t1 } } = v1;
            const { typeDescriptions: { typeString: t2 } } = v2;

            if (t1 !== t2)
                return false;
        }

        return true;
    }

    entries(): Iterable<Entry> {
        return this._entries;
    }
}
