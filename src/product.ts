import Web3 from 'web3';
import fs from 'fs-extra';
import { getBlockchainInterface } from './setup';
import { Contract } from 'web3-eth-contract';
import { compile2 } from './frontend';
import { AbiItem } from 'web3-utils';
import { InvocationGenerator } from './explore/invocations';
import { AssertionError } from 'assert';
import { Debugger } from './debug';

const debug = Debugger(__filename);

export interface Parameters {
    contracts: {
        spec: string;
        impl: string;
        simContract: string;
    }
}

export async function run(parameters: Parameters) {

    const {contracts: {spec, impl, simContract}} = parameters;
    const val  = await compile2([spec, impl]);

    const [ { abi: specAbi }, { abi: implAbi } ] = val;
    if (val.length !== 2 || specAbi.length !== implAbi.length)
        throw Error('Expected two contracts with the same methods.');


    const [ { userdoc: specDoc, ast_field_nodes: specFields }, ...rest ] = val;
    //debug(`specDoc, %O)` , specDoc);
    //debug(`specFields, %O)` , specFields);

    const [ { name: specName }, { name: implName }] = val;
    
    const specPreconds = computeConditions(specDoc, specFields, specAbi, specName);

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
                    inputs_Type = inputs_Type + method.inputs[inpEle].name + ': ' + method.inputs[inpEle].type ;
                    inputs = inputs + method.inputs[inpEle].name ;
                }
                else
                {
                    inputs_Type = inputs_Type + method.inputs[inpEle].name + ': ' + method.inputs[inpEle].type + ', '; 
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
                        outputs_Type = outputs_Type + method.outputs[inpEle].name + ': ' + method.outputs[inpEle].type ; 
                    else
                        outputs_Type = outputs_Type +  method.outputs[inpEle].type ; 
                   
                    outputs_Spec = outputs_Spec + 'spec_' + String(inpEle) + '_' + method.outputs[inpEle].name ; 
                    outputs_Impl = outputs_Impl + 'impl_' + String(inpEle) + '_' + method.outputs[inpEle].name ;
                }
                else
                {
                    if(method.outputs[inpEle].name !== "")
                        outputs_Type = outputs_Type + method.outputs[inpEle].name + ': ' + method.outputs[inpEle].type + ', '; 
                    else
                        outputs_Type = outputs_Type +  method.outputs[inpEle].type ; 
                    outputs_Spec = outputs_Spec + 'spec_' + String(inpEle) + '_' + method.outputs[inpEle].name +  ', '; 
                    outputs_Impl = outputs_Impl + 'impl_' + String(inpEle) + '_' + method.outputs[inpEle].name +  ', ';
                }
             
                outputs_assu[mid][inpEle] = 'require(spec_' + String(inpEle) + '_' + method.outputs[inpEle].name + ' == ' +
                                'impl_' + String(inpEle) + '_' + method.outputs[inpEle].name + ', "Outputs of spec and impl differ.");'; 
            }
            if(method.outputs.length > 1)
            {
                outputs_Spec = 'var (' + outputs_Spec + ')';
                outputs_Impl = 'var (' + outputs_Impl + ')';
            }
            else if(method.outputs.length == 1)
            {
                outputs_Spec = 'var ' + outputs_Spec ;
                outputs_Impl = 'var ' + outputs_Impl ;
                
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
        if(method.stateMutability == 'view')
            method_Sig[mid] = method_Sig[mid] + ' view' ;
        method_Sig[mid] = method_Sig[mid] + ' public ';
        if(method.outputs !== undefined && outputs_Type !== '')
        {   
            method_Sig[mid] =  method_Sig[mid] + 'returns (' +  outputs_Type + ')';
            method_Impl[mid] = outputs_Impl + ' = ' +  method_Impl[mid];
            method_Spec[mid] = outputs_Spec + ' = ' +  method_Spec[mid];   
        }

    }
    fs.truncate(simContract, 0, function(){console.log('writing to simulation contract file')});
    fs.writeFile(simContract, 'contract SimContract is ' + specName + ' , ' + implName + ' {\n')  ;
    
    for (const mid in specAbi)
    {
        fs.appendFile(simContract,  '      /**');
        for(const specPrecond of specPreconds[mid])
        {
            fs.appendFile(simContract,  '      '+ specPrecond + '\n') ;
        }
        fs.appendFile(simContract,  '      */\n');

        fs.appendFile(simContract,  '      ' + method_Sig[mid] +  '{\n');
        fs.appendFile(simContract,  '            ' + method_Impl[mid] + '\n' );
        fs.appendFile(simContract,  '            ' + method_Spec[mid] + '\n' );     
        for (let inpEle = 0; inpEle < outputs_assu[mid].length  ;inpEle++)
            fs.appendFile(simContract,  '            ' + outputs_assu[mid][inpEle] + '\n');
        fs.appendFile(simContract,  '}\n');
        
    }
    fs.appendFile(simContract, '}')
}


function computeConditions(specDoc : object, specFields: object, specAbi: AbiItem[], specContractName: string): string[][] {
 
    //debug(`specFields size: %s`, Object.keys(specFields).length);
    var fieldsNames : string[] = [];
    for(const [nodeId, node] of Object.entries(specFields))
    {
        if(node.nodeType == 'VariableDeclaration' && node.stateVariable == true)
        {
            fieldsNames.push(node.name);
        }
    }
    //debug(`number of fields: %s`, fieldsNames.length);
    const methodComments : string[][] = [];
    for (const [mid, method ] of specAbi.entries()) 
    { 
        methodComments[mid] = [];
        for (const [methodName, methodSpec] of Object.entries(specDoc))
        {
            if(method.name === methodName.substring(0, methodName.indexOf("(") ))
            {
                const {notice :methodComment} = methodSpec ;
                //debug(`method comments: %s`, methodComment);
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
               // debug(`methodComments: %s`, methodComments);
                for (const [index, mdcomment] of methodComments[mid].entries())
                {
                    result = mdcomment;
                    //debug(`method comment: %s`, mdcomment);
                    for(const field in specFields)
                    {
                        let re = new RegExp(field);
                        result = result.replace(re, `${specContractName}.${field}`);
                       // debug(`result1 is: %s`, result);
                    }
                    //debug(`result2 is: %s`, result);
                    methodComments[mid][index] = `@notice precondition ${result}`;
                    //debug(`methodComments[mid][index]: %s`, methodComments[mid][index]);
                }
               

            }
        //debug(`method spec: %s`, methodSpec);
        }
    }


    return methodComments;
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
