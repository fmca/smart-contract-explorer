import * as Compile from '../frontend/compile';
import { Metadata } from "../frontend/metadata";
import { addPrefixToNode, FunctionDefinition, Return, toSExpr } from '../frontend/ast';
import * as Pie from './pie';
import { Debugger } from '../utils/debug';
import { SimulationCheckingContract } from './contract';

const debug = Debugger(__filename);

export interface Parameters {
    paths: {
        source: string;
        target: string;
    }
}

export interface Result {
    metadata: Metadata;
}

export async function getSimulationCheckContract(parameters: Parameters) {
    const { paths: { source, target } } = parameters;
    const t = await Compile.fromFile(target);
    const s = await Compile.fromFile(source);
    const info = { name: 'SimulationCheck', path: 'SimulationCheck.sol' };
    const metadata = await new SimulationCheckingContract(s, t, info).getMetadata();
    return { metadata };
}

export function computePrePostConditions(metadata: Metadata): string[][] {
    const { userdoc, abi, name, members } = metadata;
    const fieldsNames = Pie.fields(metadata);

    const methodComments : string[][] = [];
    for (const [mid, method ] of abi.entries())
    {
        methodComments[mid] = [];
        for (const [methodName, methodSpec] of Object.entries(userdoc))
        {
            if(method.name === methodName.substring(0, methodName.indexOf("(") ))
            {
                const {notice :methodComment} = methodSpec ;
                debug(`method comments: %s`, methodComment);
                //Some hacking to get only precondition statements
                const methodPreComments = methodComment.split(/precondition/);
                for(const [index, mdcomment] of methodPreComments.entries())
                {
                    if(index !== 0)
                    {   const methodPostComments = mdcomment.split(/postcondition/);
                        methodComments[mid].push(methodPostComments[0]);
                    }
                }
                var result : string;
               debug(`methodComments: %s`, methodComments);
                for (const [index, mdcomment] of methodComments[mid].entries())
                {
                    result = mdcomment;
                    debug(`method comment: %s`, mdcomment);
                    for(const field of fieldsNames)
                    {
                        let re = new RegExp(`\\b${field}\\b`,'gi');
                        result = result.replace(re, `${name}.${field}`);
                       debug(`result1 is: %s`, result);
                    }
                    debug(`result2 is: %s`, result);
                    methodComments[mid][index] = `@notice precondition ${result}`;
                    debug(`methodComments[mid][index]: %s`, methodComments[mid][index]);
                }
            }
            debug(`method spec: %o`, methodSpec);
        }
    }
    return methodComments;
}

export function getProductSeedFeatures(spec: Metadata, impl: Metadata): [string,string][] {

    const spec_contractMembers = spec.members;
    const impl_contractMembers = impl.members;

    const spec_fieldsNames = Pie.fields(spec);
    const impl_fieldsNames = Pie.fields(impl);

    const spec_contractName = spec.name;
    const impl_contractName = impl.name;


    const seed_features : [string,string][] = [];

    for (const spec_node of spec_contractMembers)
    {
        if(spec_node.nodeType === 'FunctionDefinition')
        {
            const spec_func = spec_node as FunctionDefinition;

            if(spec_func.visibility === 'public' && spec_func.stateMutability === 'view')
            {
                for (const impl_node of impl_contractMembers)
                {
                    if(impl_node.nodeType === 'FunctionDefinition')
                    {
                        const impl_func = impl_node as FunctionDefinition;

                        if(impl_func.name === spec_func.name && impl_func.visibility === 'public' && impl_func.stateMutability === 'view')
                        {
                            if(spec_func.body.statements.length != 1 || spec_func.body.statements.length != impl_func.body.statements.length)
                                throw Error('expected single statement in observation function');

                            const spec_statement = spec_func.body.statements[0];
                            const impl_statement = impl_func.body.statements[0];

                            if(spec_statement.nodeType != 'Return' || impl_statement.nodeType != 'Return')
                                throw Error('expected return statement');

                            const return_spec = spec_statement as Return;
                            const return_impl = impl_statement as Return;

                            const spec_expression = addPrefixToNode(return_spec.expression,spec_contractName,spec_fieldsNames);
                            const impl_expression = addPrefixToNode(return_impl.expression,impl_contractName,impl_fieldsNames);

                            const spec_exper = toSExpr(spec_expression);
                            const impl_exper = toSExpr(impl_expression);

                            const seed_feature = `(= ${spec_exper} ${impl_exper})`;

                            seed_features.push([seed_feature,spec_func.name]);
                        }
                    }
                }
            }
        }
    }

    return seed_features;
}
