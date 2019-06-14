
export interface Parameters {
    contracts: {
        spec: string;
        impl: string;
    }
}

export async function run(parameters: Parameters) {
    const { contracts: { spec, impl }} = parameters;
    console.log(`spec: ${spec}`);
    console.log(`impl: ${impl}`);
}
