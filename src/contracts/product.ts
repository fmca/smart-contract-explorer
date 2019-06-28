import * as Compile from '../frontend/compile';
import { Metadata } from "../frontend/metadata";
import { addPrefixToNode, FunctionDefinition, Return, toSExpr } from '../frontend/ast';
import * as Pie from './pie';
import { Debugger } from '../utils/debug';

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

export async function getProduct(parameters: Parameters): Promise<Result> {
    const { paths: { source, target } } = parameters;
    const t = await Compile.fromFile(target);
    const s = await Compile.fromFile(source);
    const metadata = getProductFromMetadata(s, t);
    return { metadata };
}

export function getProductFromMetadata(impl: Metadata, spec: Metadata): Metadata {
    const path = `Product.sol`;
    const name = `Product`;
    const { abi: specAbi } = spec;
    const { abi: implAbi } = impl;

    if (specAbi.length !== implAbi.length)
        throw Error('Expected two contracts with the same methods.');

    const content = getProductCode(impl, spec, name);
    const metadata = Compile.fromString({ path, content });
    return metadata;
}

function getProductCode(impl: Metadata, spec: Metadata, name: string) {
    const { name: implName, source: { path: implFile } } = impl;
    const { name: specName, source: { path: specFile } } = spec;
    const preconditions = computePrePostConditions(spec);

    const header = [
        `pragma solidity ^0.5.0;`,
        `import "${implFile}";`,
        `import "${specFile}";`,
        `contract ${name} is ${implName}, ${specName}`
    ];

    const members: string[] = [];

    for (const methodInfo of getMethodInfo(impl, spec)) {
        const { signature, implementation, specification, outputAssumptions } = methodInfo;
        const member = `/** ${preconditions.join('\n')} */
        ${signature} {
            ${implementation}
            ${specification}
            ${outputAssumptions.join('\n')}
        }`;
        members.push(member);
    }

    const code = `${header.join('\n')} {
    ${members.join('\n    ')}
}`;
    debug(`code: %s`, code);
    return code;
}

function computePrePostConditions(metadata: Metadata): string[][] {
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

type MethodInfo = {
    signature: string;
    implementation: string;
    specification: string;
    outputAssumptions: string[];
}

function getMethodInfo(impl: Metadata, spec: Metadata): MethodInfo[] {
    const { name: implName, abi: implAbi } = impl;
    const { name: specName, abi: specAbi } = spec;

    var inputs : string = ' ';

    var inputs_Type : string = '';
    var outputs_Type : string = '';

    var outputs_Spec : string = '';
    var outputs_Impl : string = '';

    const methodInfo: MethodInfo[] = [];

    for (const [mid, method ] of specAbi.entries()) {
        if (method.name !== implAbi[mid].name)
            throw Error('Spec and Impl methods must have the same signature.');

        let signature = '';
        let implementation = '';
        let specification = '';
        let outputAssumptions: string[] = [];

        inputs_Type = '';
        inputs = '';

        if(method.inputs !== undefined)
        {

            for (let inpEle = 0; inpEle < method.inputs.length  ;inpEle++)
            {   if(inpEle ==  method.inputs.length - 1)
                {
                    inputs_Type = inputs_Type + method.inputs[inpEle].type + ' ' + method.inputs[inpEle].name  ;
                    inputs = inputs + method.inputs[inpEle].name ;
                }
                else
                {
                    inputs_Type = inputs_Type + method.inputs[inpEle].type + ' ' + method.inputs[inpEle].name +  ', ';
                    inputs = inputs + method.inputs[inpEle].name + ', ';
                }
            }
        }

        outputs_Type = '';
        outputs_Spec = '';
        outputs_Impl = '';

        if(method.outputs !== undefined)
        {

            for (let inpEle = 0; inpEle < method.outputs.length  ;inpEle++)
            {

                if(inpEle ==  method.outputs.length - 1)
                {
                    if(method.outputs[inpEle].name !== "")
                        outputs_Type = outputs_Type +  method.outputs[inpEle].type + ' ' + method.outputs[inpEle].name  ;
                    else
                        outputs_Type = outputs_Type +  method.outputs[inpEle].type ;

                    outputs_Spec = outputs_Spec + method.outputs[inpEle].type + ' spec_' + String(inpEle) + '_' + method.outputs[inpEle].name ;
                    outputs_Impl = outputs_Impl + method.outputs[inpEle].type + ' impl_' + String(inpEle) + '_' + method.outputs[inpEle].name ;
                }
                else
                {
                    if(method.outputs[inpEle].name !== "")
                        outputs_Type = outputs_Type +  method.outputs[inpEle].type + ' ' + method.outputs[inpEle].name + ', ';
                    else
                        outputs_Type = outputs_Type +  method.outputs[inpEle].type ;
                    outputs_Spec = outputs_Spec + method.outputs[inpEle].type + ' spec_' + String(inpEle) + '_' + method.outputs[inpEle].name +  ', ';
                    outputs_Impl = outputs_Impl + method.outputs[inpEle].type + ' impl_' + String(inpEle) + '_' + method.outputs[inpEle].name +  ', ';
                }

                outputAssumptions[inpEle] = 'require(spec_' + String(inpEle) + '_' + method.outputs[inpEle].name + ' == ' +
                                'impl_' + String(inpEle) + '_' + method.outputs[inpEle].name + ', "Outputs of spec and impl differ.");';
            }
            if(method.outputs.length > 1)
            {
                outputs_Spec = '(' + outputs_Spec + ')';
                outputs_Impl = '(' + outputs_Impl + ')';
            }

        }

        if(method.name !== undefined)
        {
            signature =  'function  ' + method.name +  '(' + inputs_Type + ')';
            implementation = specName + '.' + method.name +  '(' + inputs + ') ;';
            specification = implName + '.' + method.name +  '(' + inputs + ') ;';
        }
        if(method.payable)
            signature = signature +  ' payable' ;
        signature = signature + ' public '; //
        if(method.stateMutability == 'view')
            signature = signature + 'view ' ;
        if(method.outputs !== undefined && outputs_Type !== '')
        {
            signature =  signature + 'returns (' +  outputs_Type + ')';
            implementation = outputs_Impl + ' = ' +  implementation;
            specification = outputs_Spec + ' = ' +  specification;
        }

        methodInfo.push({ signature, implementation, specification, outputAssumptions })
    }

    return methodInfo;
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
