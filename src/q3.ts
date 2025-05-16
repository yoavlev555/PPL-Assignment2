import { AppExp, CExp, Exp, isAppExp, isBoolExp, isIfExp, isNumExp, isPrimOp, isProcExp, isStrExp, PrimOp, ProcExp, Program } from './L3/L3-ast';

import { Result, makeFailure, mapResult, bind} from './shared/result';
import { isNumber, isString } from './shared/type-predicates';
import { makeOk } from './shared/result';
import { Closure, isClosure, isCompoundSExp, isEmptySExp, isSymbolSExp } from './L3/L3-value';
import exp from 'constants';
import { mapv } from './shared/optional';
import { verify } from 'crypto';
/*
Purpose: Transform L2 AST to JavaScript program string
Signature: l2ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/

type Value = number | boolean | string | PrimOp

const isBaseOp = (op: string) : boolean => 
    ["+", "-", "*", "/", ">", "<"].includes(op);


const valueToString = (val: Value): string =>
    isNumber(val) ?  val.toString() :
    val === true ? 'true' :
    val === false ? 'false' :
    isString(val) ? `"${val}"` :
    isPrimOp(val) ? primOpToString(val.op) :
    val;

const eqPrim: string = `(x: any, y: any) => {
    if (typeof(x) === 'number' && typeof(y) === 'number') {
        return x === y;
    }
    else if (typeof(x) === 'string' && typeof(y) === 'string') {
        return x === y;
    }
    else if (typeof(x) === 'boolean' && typeof(y) === 'boolean') {
        return x === y;
    }
    else {
        return false;
    }
};`

const convertNonBaseOp = (op: string) : string =>
    op === "=" ? "===" :
    op === "and" ? "&&" :
    op === "or" ? "||" :
    op === "not" ? "!" :
    op === "number?" ? "((x) => typeof(x) === 'number')(y)" :
    op === "boolean?" ? "((x) => typeof(x) === 'boolean')(y)" :
    op === "eq?" ? eqPrim : 
    op;




export const l2ToJS = (exp: Exp | Program): Result<string>  => 
    isNumExp(exp) ? makeOk(valueToString(exp.val)) :
    isBoolExp(exp) ? makeOk(valueToString(exp.val)) :
    isStrExp(exp) ? makeOk(valueToString(exp.val)) :
    isPrimOp(exp) ? makeOk(valueToString(exp)) :
    isIfExp(exp) ? makeOk(`${l2ToJS(exp.test)} ? (${l2ToJS(exp.then)}) : (${l2ToJS(exp.alt)})`) :
    isAppExp(exp) ? convertAppExp(exp) :
    isProcExp(exp) ? convertProcExp(exp) :
    makeFailure("bad expression")



const primOpToString = (op: string) : string => 
    isBaseOp(op) ? op :
    convertNonBaseOp(op)


const convertProcExp = (exp: ProcExp) : Result<string> =>
    bind(mapResult((param: Cexp) => ))
    
const convertAppExp = (exp: AppExp): Result<string> =>
    isPrimOp(exp.rator) && isBaseOp(exp.rator.op)
        ? bind(
            mapResult((rand: CExp) => l2ToJS(rand), exp.rands),
            (rands: string[]) => makeOk(rands.join(` ${l2ToJS(exp.rator)} `))
        )
        : bind(
            l2ToJS(exp.rator),
            (op: string) =>
                bind(
                    mapResult((rand: CExp) => l2ToJS(rand), exp.rands),
                    (rands: string[]) => makeOk(`${op}(${rands.join("), (")})`)
                )
        );
