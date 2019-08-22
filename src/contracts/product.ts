import { Metadata } from "../frontend/metadata";
import { Contract, ContractInfo, block } from "./contract";

export abstract class ProductContract extends Contract {
    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo) {
        super(info);
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
