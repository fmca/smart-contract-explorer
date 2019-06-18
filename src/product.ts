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
    }
}

export async function run(parameters: Parameters) {

    const { contracts: { spec, impl }} = parameters;
    const val  = await compile2([spec, impl]);

    const [ { abi: specAbi }, { abi: implAbi } ] = val;

    if (val.length !== 2 || specAbi.length !== implAbi.length)
        throw Error('Expected two contracts with the same methods.');

    var inputs : string = ' ';
   
    var inputs_Type : string = '';
    var outputs_Type : string = '';
   
    var outputs_Spec : string = '';
    var outputs_Impl : string = '';

    const outputs_assu : string[] = [];
    
    const method_Sig  : string[] = [];
    const method_Impl : string[] = [];
    const method_Spec : string[] = [];

    const [ { name: specName }, { name: implName }] = val;
  
    for (const [mid, method ] of specAbi.entries()) 
    {   
        if (method.name !== implAbi[mid].name)
            throw Error('Spec and Impl methods must have the same signature.');

        if(method.inputs !== undefined)
        {   
            inputs_Type = '';
            inputs = '';

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
            debug(`inputs_Type: %O`, inputs_Type);
        }

        if(method.outputs !== undefined)
        {   
            outputs_Type = '';
            outputs_Spec = '';
            outputs_Impl = '';

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
                if(method.outputs.length > 1)
                {
                    outputs_Spec = 'var (' + outputs_Spec + ')';
                    outputs_Impl = 'var (' + outputs_Impl + ')';
                }
                outputs_assu[inpEle] = 'require(spec_' + String(inpEle) + '_' + method.outputs[inpEle].name + ' == ' +
                                        'impl_' + String(inpEle) + '_' + method.outputs[inpEle].name + ', "Outputs of spec and impl differ.");'; 
            }
        }

        if(method.name !== undefined)
            method_Sig[mid] =  'function  ' + method.name +  '(' + inputs_Type + ')';
            method_Impl[mid] = specName + '.' + method.name +  '(' + inputs + ') ;';
            method_Spec[mid] = implName + '.' + method.name +  '(' + inputs + ') ;';
        if(method.payable)
            method_Sig[mid] = method_Sig[mid] +  ' payable' ;
        if(method.stateMutability == 'view')
            method_Sig[mid] = method_Sig[mid] + ' view' ;
        method_Sig[mid] = method_Sig[mid] + ' public ';
        if(method.outputs !== undefined)
            method_Sig[mid] =  method_Sig[mid] + 'returns (' +  outputs_Type + ')';
            method_Impl[mid] = outputs_Impl + ' = ' +  method_Impl[mid];
            method_Spec[mid] = outputs_Spec + ' = ' +  method_Spec[mid];       
    }
    
    fs.writeFile('SimContract.sol', 'contract SimContract is ' + specName + ' , ' + implName + ' { \n')  ;
    
    for (const mid in specAbi)
    {
        fs.appendFile('SimContract.sol',  '      ' + method_Sig[mid] + '\n' + '{ \n');
        fs.appendFile('SimContract.sol',  '            ' + method_Impl[mid] + '\n' );
        fs.appendFile('SimContract.sol',  '            ' + method_Spec[mid] + '\n' );
        for (let inpEle = 0; inpEle < outputs_assu.length  ;inpEle++)
            fs.appendFile('SimContract.sol',  '            ' + outputs_assu[inpEle] + '\n');
        fs.appendFile('SimContract.sol',  '} \n');
    }
    fs.appendFile('SimContract.sol', '}')
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
