import * as Compile from '../frontend/compile';
import { Metadata } from "../frontend/metadata";
import { Expr } from '../frontend/sexpr';
import { addPrefixToNode, FunctionDefinition, Return, toSExpr, ContractMember } from '../frontend/ast';
import { Debugger } from '../utils/debug';

const debug = Debugger(__filename);

export function getProductCode(spec: Metadata, impl: Metadata, productFile: string): Metadata {
    const { abi: specAbi, name: specName, source: { path: specFile } } = spec;
    const { abi: implAbi, name: implName, source: { path: implFile } } = impl;

    if (specAbi.length !== implAbi.length)
        throw Error('Expected two contracts with the same methods.');

    const specPreconds = computePrePostConditions(spec);

    var inputs : string = ' ';

    var inputs_Type : string = '';
    var outputs_Type : string = '';

    var outputs_Spec : string = '';
    var outputs_Impl : string = '';


    const outputs_assu : string[][] = [];

    const method_Sig  : string[] = [];
    const method_Impl : string[] = [];
    const method_Spec : string[] = [];



    for (const [mid, method ] of specAbi.entries())
    {
        if (method.name !== implAbi[mid].name)
            throw Error('Spec and Impl methods must have the same signature.');

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

        outputs_assu[mid] = [];

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

                outputs_assu[mid][inpEle] = 'require(spec_' + String(inpEle) + '_' + method.outputs[inpEle].name + ' == ' +
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
            method_Sig[mid] =  'function  ' + method.name +  '(' + inputs_Type + ')';
            method_Impl[mid] = specName + '.' + method.name +  '(' + inputs + ') ;';
            method_Spec[mid] = implName + '.' + method.name +  '(' + inputs + ') ;';
        }
        if(method.payable)
            method_Sig[mid] = method_Sig[mid] +  ' payable' ;
        method_Sig[mid] = method_Sig[mid] + ' public '; //
        if(method.stateMutability == 'view')
            method_Sig[mid] = method_Sig[mid] + 'view ' ;
        if(method.outputs !== undefined && outputs_Type !== '')
        {
            method_Sig[mid] =  method_Sig[mid] + 'returns (' +  outputs_Type + ')';
            method_Impl[mid] = outputs_Impl + ' = ' +  method_Impl[mid];
            method_Spec[mid] = outputs_Spec + ' = ' +  method_Spec[mid];
        }

    }

    var stdOut : string = '';

    stdOut = `${stdOut}pragma solidity ^0.5.9; \n`;

    stdOut = `${stdOut}import "${specFile}"; \n`;
    stdOut = `${stdOut}import "${implFile}"; \n`;

    stdOut = `${stdOut}contract SimContract is  ${specName}, ${implName} {\n`  ;

    for (const mid in specAbi)
    {
        stdOut = `${stdOut}      /**`;
        for(const specPrecond of specPreconds[mid])
        {
            stdOut = `${stdOut}      ${specPrecond} \n` ;
        }
        stdOut = `${stdOut}      */\n`;

        stdOut = `${stdOut}      ${method_Sig[mid]} {\n`;
        stdOut = `${stdOut}            ${method_Impl[mid]} \n` ;
        stdOut = `${stdOut}            ${method_Spec[mid]} \n`;
        for (let inpEle = 0; inpEle < outputs_assu[mid].length  ;inpEle++)
            stdOut = `${stdOut}            ${outputs_assu[mid][inpEle]} \n`;
        stdOut = `${stdOut}}\n`;

    }

    stdOut = `${stdOut}}`;
    const productMetadata = Compile.fromString({ path: productFile, content: stdOut });
    return productMetadata;
}



function computePrePostConditions({ userdoc, abi, name, members }: Metadata): string[][] {

    const fieldsNames = extractContractFields(members);

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


function extractContractFields(members: ContractMember[]): string[]
{
    debug(`specFields size: %s`, Object.keys(members).length);
    const fieldsNames : string[] = [];
    for (const node of members as any[])
    {
        if(node.nodeType == 'VariableDeclaration' && node.stateVariable == true)
        {
            fieldsNames.push(node.name);
        }
    }
    debug(`number of fields: %s`, fieldsNames.length);
    return fieldsNames;
}

export function getProductSeedFeatures(spec: Metadata, impl: Metadata): [string,string][] {

    const spec_contractMembers = spec.members;
    const impl_contractMembers = impl.members;

    const spec_fieldsNames = extractContractFields(spec_contractMembers);
    const impl_fieldsNames = extractContractFields(impl_contractMembers);

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