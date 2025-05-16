import { AppExp, CExp, DefineExp, Exp, isAppExp, isBoolExp, isDefineExp, isIfExp, isNumExp, isPrimOp, isProcExp, isProgram, isStrExp, isVarDecl, isVarRef, parseL3Exp, PrimOp, ProcExp, Program, VarDecl } from './L3/L3-ast';
import fs from "fs";

import { Result, makeFailure, mapResult, bind} from './shared/result';
import { isNumber, isString } from './shared/type-predicates';
import { makeOk } from './shared/result';
import { ascend } from 'ramda';
import { escape } from 'querystring';
/*
Purpose: Transform L2 AST to JavaScript program string
Signature: l2ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/

type Value = number | boolean | string | PrimOp

export const l2ToJS = (exp: Exp | Program): Result<string>  => 
    isNumExp(exp) ? makeOk(valueToString(exp.val)) :
    isBoolExp(exp) ? makeOk(valueToString(exp.val)) :
    isStrExp(exp) ? makeOk(valueToString(exp.val)) :
    isPrimOp(exp) ? makeOk(valueToString(exp)) :
    isVarRef(exp) ? makeOk(exp.var) :
    isIfExp(exp) ? bind(l2ToJS(exp.test), (test: string) =>
                        bind(l2ToJS(exp.then), (then: string) =>
                            bind(l2ToJS(exp.alt), (alt: string) =>
                                makeOk(`(${test} ? ${then} : ${alt})`)
                                )
                            )
                        ):
    isProgram(exp) ? bind(mapResult((expression: Exp) => l2ToJS(expression), exp.exps), (exps: string[]) => makeOk(exps.join(';\n'))) : 
    isAppExp(exp) ? convertAppExp(exp) :
    isProcExp(exp) ? convertProcExp(exp) :
    isDefineExp(exp) ? convertDefineExp(exp) :
    makeFailure("bad expression")

const operatorDict = {
    '+': "+",
    '-': "-",
    '*': "*",
    '/': "/",
    '>': ">",
    '<': "<",
    '=': "===",
    'eq?': "===",
    'not': "!",
    'and': "&&",
    'or': "||",
}

const isBaseOp = (op: string) : boolean => 
    ["+", "-", "*", "/", ">", "<", "=", "not", "and", "or", "eq?"].includes(op);


const valueToString = (val: Value): string =>
    isNumber(val) ?  val.toString() :
    val === true ? 'true' :
    val === false ? 'false' :
    isString(val) ? `"${val}"` :
    isPrimOp(val) ? primOpToString(val.op) :
    val;


const convertNonBaseOp = (op: string) : string =>
    op === "number?" ? "((x) => typeof(x) === 'number')" :
    op === "boolean?" ? "((x) => typeof(x) === 'boolean')" :
    op;


const primOpToString = (op: string) : string => 
    isBaseOp(op) ? op :
    convertNonBaseOp(op)


const convertProcExp = (exp: ProcExp) : Result<string> =>
    bind(mapResult((param: VarDecl) => makeOk(param.var), exp.args), (args: string[]) =>
        bind(l2ToJS(exp.body[0]), (body: string) =>
            (makeOk(`((${args.join(',')}) => ${body})`))
        )
    );
    
const convertAppExp = (exp: AppExp): Result<string> =>
    isPrimOp(exp.rator) && isBaseOp(exp.rator.op)
        ? bind(
            mapResult((rand: CExp) => l2ToJS(rand), exp.rands), (rands: string[]) => 
                bind(l2ToJS(exp.rator), (rator: string) =>
                    rands.length > 1 ? makeOk(`(${rands.join(` ${operatorDict[rator as keyof typeof operatorDict]} `)})`) :
                    makeOk(`(!${rands[0]})`)
                )
                
        )
        : bind(l2ToJS(exp.rator), (op: string) =>
                bind(
                    mapResult((rand: CExp) => l2ToJS(rand), exp.rands), (rands: string[]) => 
                        rands.length >= 1 ? makeOk(`${op}(${rands.join(",")})`) :
                        makeOk(`${op}()`)
                )
        );


const convertDefineExp = (exp: DefineExp) => 
    bind(makeOk(exp.var.var), (variable: string) =>
        bind(l2ToJS(exp.val), (body: string) =>
            makeOk(`const ${variable} = ${body}`))
    );
