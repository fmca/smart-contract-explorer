import { Metadata } from "../frontend/metadata";
import { Contract, ContractInfo, block } from "./contract";

export abstract class ProductContract extends Contract {
    constructor(public source: Metadata, public target: Metadata, public info: ContractInfo) {
        super(info);
    }

    async getContract(): Promise<string[]> {
        const { name } = this.info;
        const spec = await this.getSpec();
        const body = await this.getBody();
        const aux = [...this.auxiliaryDefinitions.values()].flat();
        const lines = block()(
            `pragma solidity ^0.5.0;`,
            ``,
            `import "${this.source.source.path}";`,
            `import "${this.target.source.path}";`,
            ``,
            ...spec,
            `contract ${name} is ${this.source.name}, ${this.target.name} {`,
            ...block(4)(...body, ...aux),
            `}`
        );
        return lines;
    }

    async getSpec(): Promise<string[]> {
        return [];
    }

    abstract async getBody(): Promise<string[]>;
}
