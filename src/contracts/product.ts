import { Metadata } from "../frontend/metadata";
import { Contract, ContractInfo, block } from "./contract";

export abstract class ProductContract extends Contract {
    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo) {
        super(info);
    }

    async getImports() {
        return [this.source.source.path, this.target.source.path];
    }

    async getParents() {
        return [this.source.name, this.target.name];
    }

    async getSpec() {
        return [] as string [];
    }
}
