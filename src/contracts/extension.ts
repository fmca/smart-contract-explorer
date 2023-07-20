import * as Compile from '../frontend/compile';
import { Metadata } from "../frontend/metadata";
import * as Contracts from '../contracts/conversions';
import { Expr } from "../sexpr/expression";
import { Debugger } from '../utils/debug';
import * as Solidity from '../solidity/conversions';

const debug = Debugger(__filename);

export async function expressionEvaluator(expression: Expr, examples: Metadata): Promise<Metadata> {
    const path = `generated-feature`;
    const content = expressionEvaluationContract(expression, examples);
    const source = { path, content };
    debug(`compiling feature contract: %o`, source);
    const metadata = await Compile.fromString(source);
    return metadata;
}

function expressionEvaluationContract(expression: Expr, examples: Metadata) {
    const name = examples.getName();
    const { path } = examples.getSource();
    const node = Solidity.fromExpression(expression);
    debug(`node: %o`, node);
    const expr = Contracts.fromNode(node);
    debug(`expr: %o`, expr);
    const solExpr = fieldsToGetters(expr);
    console.log(expr);
    debug(`solExpr: %o`, solExpr);
    return `pragma solidity ^0.5.0;
import "${path}";
contract C { function f(${name} x) public view returns (bool) { return ${solExpr}; } }`;
}

function fieldsToGetters(expression: string) {
    return expression.replace(/(?<![\w.$])(\w([\w.$]*)\w)(?![\w.$])/g, 'x.$1()');
}

export async function extendWithPredicate(contract: Metadata, feature: Expr): Promise<[Metadata, string]> {
    const nodeAst = Solidity.fromExpression(feature);
    const strFeature = Contracts.fromNode(nodeAst);
    const [newContract, funNames] = await extendWithFeatures(contract,[strFeature]);

    if (funNames.length != 1)
        throw Error('expected single function to be added');

    return [newContract, funNames[0]];
}

export async function extendWithFeatures(contract: Metadata, features: string[]): Promise<[Metadata, string[]]> {
    const { path, content } = contract.getSource();

    debug(`creating a product file to test features`);

    debug(`number of features: %s`, features.length);

    const featuresNames: string[] = [];
    var stdOut: string =  content;
    stdOut = stdOut.replace(/}([^}]*)$/,'$1');
    stdOut = `${stdOut}\n`;

    for (const [index, feature] of features.entries())
    {
            stdOut = `${stdOut}      function feature_${String(index)}() public view returns (bool) {\n`;
            featuresNames.push(`feature_${String(index)}`);
            stdOut = `${stdOut}            return ${feature};\n`;
            stdOut = `${stdOut}      }\n`;
    }
    stdOut = `${stdOut}}`;
    debug(`stdOut: %s`, stdOut);
    debug(`contract.source.path: %s`, path);
    const resultMetadata = await Compile.fromString({ path, content: stdOut });

    return [resultMetadata,featuresNames];
}
