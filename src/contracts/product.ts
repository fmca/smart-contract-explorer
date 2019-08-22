import { Metadata } from "../frontend/metadata";
import { Contract} from "./contract";
import { Unit } from "../frontend/unit";

export abstract class ProductContract extends Contract {
    constructor(public source: Metadata, public target: Metadata, public unit: Unit) {
        super(unit);
    }

    async getImports() {
        return [this.source.getSource().path, this.target.getSource().path];
    }

    async getParents() {
        return [this.source.getName(), this.target.getName()];
    }

    async getSpec() {
        return [] as string [];
    }
}
