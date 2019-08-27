
export type ExampleId = string;
export type ExpressionId = string;

export type Feature = { name: string, expression: string };

export interface SimulationData {
    examplesContractPath: string;
    examples: { positive: ExampleData[], negative: ExampleData[] };
    expressions: ExpressionData[];
    features: Feature[];
}

export interface ExampleData {
    id: ExampleId;
}

export interface ExpressionData {
    id: ExpressionId;
    pieType: string;
    evaluatorExpression: string;
    verifierExpression: string;
}

export interface EvaluatorQuery {
    dataPath: string;
    id: ExampleId;
    expression?: string;
}
