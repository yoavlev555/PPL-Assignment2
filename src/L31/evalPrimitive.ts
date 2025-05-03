import { reduce } from "ramda";
import { PrimOp } from "./L31-ast";
import { isCompoundSExp, isEmptySExp, isSymbolSExp, makeCompoundSExp, makeEmptySExp, CompoundSExp, EmptySExp, Value, SExpValue } from "./L31-value";
import { List, allT, first, isNonEmptyList, rest } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure } from "../shared/result";
import { format } from "../shared/format";

export const applyPrimitive = (proc: PrimOp, args: Value[]): Result<Value> =>
    proc.op === "+" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x + y, 0, args)) : 
                                              makeFailure(`+ expects numbers only: ${format(args)}`)) :
    proc.op === "-" ? minusPrim(args) :
    proc.op === "*" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x * y, 1, args)) : 
                                              makeFailure(`* expects numbers only: ${format(args)}`)) :
    proc.op === "/" ? divPrim(args) :
    proc.op === ">" ? makeOk(args[0] > args[1]) :
    proc.op === "<" ? makeOk(args[0] < args[1]) :
    proc.op === "=" ? makeOk(args[0] === args[1]) :
    proc.op === "not" ? makeOk(!args[0]) :
    proc.op === "and" ? isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] && args[1]) : 
                                                                   makeFailure(`Arguments to "and" not booleans: ${format(args)}`) :
    proc.op === "or" ? isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] || args[1]) : 
                                                                  makeFailure(`Arguments to "or" not booleans: ${format(args)}`) :
    proc.op === "eq?" ? makeOk(eqPrim(args)) :
    proc.op === "string=?" ? makeOk(args[0] === args[1]) :
    proc.op === "cons" ? makeOk(consPrim(args[0], args[1])) :
    proc.op === "car" ? carPrim(args[0]) :
    proc.op === "cdr" ? cdrPrim(args[0]) :
    proc.op === "list" ? makeOk(listPrim(args)) :
    proc.op === "pair?" ? makeOk(isPairPrim(args[0])) :
    proc.op === "number?" ? makeOk(typeof (args[0]) === 'number') :
    proc.op === "boolean?" ? makeOk(typeof (args[0]) === 'boolean') :
    proc.op === "symbol?" ? makeOk(isSymbolSExp(args[0])) :
    proc.op === "string?" ? makeOk(isString(args[0])) :
    proc.op === "dict" ? evalDict(args) :
    proc.op === "get" ? evalGet(args) :
    proc.op === "dict?" ? evalDictQ(args) : 
    makeFailure(`Bad primitive op: ${format(proc.op)}`);

// Q2.1c
// dict
const evalDict = (args: Value[]): Result<Value> => {
    if (args.length !== 1) return makeFailure("dict expects one argument");
    return makeOk(args[0]); 
};

// get
const evalGet = (args: Value[]): Result<Value> => {
    if (args.length !== 2) return makeFailure("get expects 2 arguments");
    const dict = args[0];
    const key = args[1];

    if (!isCompoundSExp(dict) && !isEmptySExp(dict))
        return makeFailure("get expects a quoted list as first argument");

    if (!isSymbolSExp(key))
        return makeFailure("get expects a symbol as key");

    // Search for a pair (key . val)
    let curr: SExpValue | CompoundSExp | EmptySExp = dict;
    while (isCompoundSExp(curr)) {
        const pair = curr.val1;
        if (isCompoundSExp(pair) && isSymbolSExp(pair.val1)) {
            if (pair.val1.val === key.val) return makeOk(pair.val2);
        }
        curr = curr.val2;
    }

    return makeFailure(`Key ${key.val} not found`);
};

// dict?
const evalDictQ = (args: Value[]): Result<Value> => {
    if (args.length !== 1) return makeFailure("dict? expects one argument");

    // Helper function
    const isPairList = (v: Value): boolean => {
        // Base case
        if (isEmptySExp(v)) 
            return true;
        
        else if (isCompoundSExp(v)) { 
            // check head
            if (!isCompoundSExp(v.val1)) 
                return false;

            // Recursively check whole list
            return isPairList(v.val2);
        }

        else 
            return false;
    };

    return makeOk(isPairList(args[0])); 
};


const minusPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x - y);
    }
    else {
        return makeFailure(`Type error: - expects numbers ${format(args)}`);
    }
};

const divPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x / y);
    }
    else {
        return makeFailure(`Type error: / expects numbers ${format(args)}`);
    }
};

const eqPrim = (args: Value[]): boolean => {
    const x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    }
    else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    }
    else if (isNumber(x) && isNumber(y)) {
        return x === y;
    }
    else if (isString(x) && isString(y)) {
        return x === y;
    }
    else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    }
    else {
        return false;
    }
};

const carPrim = (v: Value): Result<Value> => 
    isCompoundSExp(v) ? makeOk(v.val1) :
    makeFailure(`Car: param is not compound ${format(v)}`);

const cdrPrim = (v: Value): Result<Value> =>
    isCompoundSExp(v) ? makeOk(v.val2) :
    makeFailure(`Cdr: param is not compound ${format(v)}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: List<Value>): EmptySExp | CompoundSExp =>
    isNonEmptyList<Value>(vals) ? makeCompoundSExp(first(vals), listPrim(rest(vals))) :
    makeEmptySExp();

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);
