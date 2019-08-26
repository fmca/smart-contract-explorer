
type ExampleId = string;
type ExpressionId = string;

export interface SimulationData {
    examplesContractPath: string;
    examples: ExampleData[];
    expressions: ExpressionData[];
}

export interface ExampleData {
    id: ExampleId;
    positive: boolean;
}

export interface ExpressionData {
    id: ExpressionId;
    pieType: string;
    evaluatorExpression: string;
    verifierExpression: string;
}

export interface EvaluatorQuery {
    dataPath: string;
    exampleId: ExampleId;
    expression?: string;
}
