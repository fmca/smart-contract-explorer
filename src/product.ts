import fs from 'fs-extra';
import { Metadata } from './frontend/metadata';
import { Expr } from './frontend/sexpr';
import { toContract } from './frontend/ast';
import * as Compile from './frontend/compile';
import { Debugger } from './utils/debug';

const debug = Debugger(__filename);

export interface Parameters {
    specFile: string;
    implFile: string;
    productFile: string;
}


export async function run(parameters: Parameters, product: Product) {

    const { specFile, implFile, productFile } = parameters;
   
    const specMetadata = await Compile.fromFile(specFile);
    const implMetadata = await Compile.fromFile(implFile);

    const productMetadata = product.getProductCode(parameters, specMetadata, implMetadata);
    debug(`product is: %O`, productMetadata);
    await fs.writeFile(productFile, productMetadata.source);

    const procContract = new ProcContract();

    const [newproductMetadata, featuresNames] = await procContract.extendWithFeatures(productMetadata,[`HelloAfrica.counter==HelloAmerica.counter`]);
    debug(`newproductMetadata is: %s`, newproductMetadata.source.content);
}

export class Product 
{

    getProductCode(parameters: Parameters, spec: Metadata, impl: Metadata): Metadata {

    const { specFile, implFile, productFile } = parameters;
    const { abi: specAbi, name: specName } = spec;
    const { abi: implAbi, name: implName } = impl;

    if (specAbi.length !== implAbi.length)
        throw Error('Expected two contracts with the same methods.');

    const specPreconds = this.computePrePostConditions(spec);

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
    const productMetadata = Compile.fromString(productFile, stdOut);
    return productMetadata;
}

    computePrePostConditions({ userdoc, abi, name, members }: Metadata): string[][] {

    debug(`specFields size: %s`, Object.keys(members).length);
    var fieldsNames : string[] = [];
    for (const node of members as any[])
    {
        if(node.nodeType == 'VariableDeclaration' && node.stateVariable == true)
        {
            fieldsNames.push(node.name);
        }
    }
    debug(`number of fields: %s`, fieldsNames.length);
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



 
 }

 export class ProcContract
{

    async extendWithPredicate(contract: Metadata, feature:Expr): Promise<[Metadata, string]> {
        const nodeAst = Expr.toNode(feature);
        const strFeature = toContract(nodeAst);
        const [newContract, funNames] = await this.extendWithFeatures(contract,[strFeature]);

        if (funNames.length != 1)
            throw Error('expected single function to be added');

        return [newContract, funNames[0]];

    }


    async extendWithFeatures(contract: Metadata, features: string[]): Promise<[Metadata, string[]]> {

        debug(`creating a product file to test features`);
     
        debug(`number of features: %s`, features.length);
     

        const featuresNames: string[] = [];
        var stdOut: string =  contract.source.content;
        stdOut = stdOut.replace(/}([^}]*)$/,'$1');
        stdOut = `${stdOut}\n`;
     
        for (const [index, feature] of features.entries())
        {
             stdOut = `${stdOut}      function feature_${String(index)}() public pure returns (bool) {\n`;
             featuresNames.push(`feature_${String(index)}`);
             stdOut = `${stdOut}            return ${feature};\n`;
             stdOut = `${stdOut}      }\n`;
        }
        stdOut = `${stdOut}}`;
        debug(`stdOut: %s`, stdOut);
        debug(`contract.source.path: %s`, contract.source.path);
        const resultMetadata = await Compile.fromString(contract.source.path, stdOut);
        
        return [resultMetadata,featuresNames];
     }

}


/**function getMethod(method: AbiItem, methodID: number): string {
    const signature = getSignature(method);
    const implCall = getCall(method, methodID, _);
    const specCall = getCall(method, methodID, _);
    const checkStmt = getCheck(_);
    return `${signature}{\n  ${implCall}\n  ${specCall}\n  ${checkStmt}\n}`;
}

function getCheck(ethod: AbiItem, methodID: number): string {

    if(method.outputs !== undefined)
    {
        for (let inpEle = 0; inpEle < method.outputs.length  ;inpEle++)
        {

}
*/
