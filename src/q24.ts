import { all, is, map } from 'ramda';
import { AppExp, isDictExp, makeAppExp, makeLitExp, makeProgram, Program, CExp, DefineExp, Exp, isCExp, isDefineExp,makeDefineExp, Binding, makeBinding,
     isAppExp, isAtomicExp, isIfExp, makeIfExp,  isProcExp, makeProcExp, isLitExp, isLetExp, makeLetExp,
     parseL32,
     } from './L32/L32-ast';
import { DictExp, makeVarRef } from './L32/L32-ast';
import { makeDictValue, Value } from './L32/L32-value';
import { bind, isOk, makeFailure, makeOk, Result, } from './shared/result';
import { isProgram, makeStrExp,parseGoodDefine } from './L3/L3-ast';
import { parse as p, } from "./shared/parser";
import { evalL32program } from './L32/L32-eval';
import { unparseL32 } from './L32/L32-ast';

const makeLiteralFromDictExp = (exp: DictExp): string =>
    `'(${map((b: Binding) => `(${b.var.var} . ${unparseL32(b.val)})`, exp.bindings).join(" ")})`

//Helper function
const DictExp2AppExp = (exp: DictExp) : AppExp =>
    makeAppExp(makeVarRef('dict'), [makeLitExp(makeLiteralFromDictExp(exp))]);

/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/
export const Dict2App  = (exp: Program) : Program => 
    makeProgram(map((e: Exp) => convertAllDictToApp(e), exp.exps));


const convertAllDictToApp = (exp: Exp) : Exp =>
    isDefineExp(exp) ? defineConvertAllDictToApp(exp) :
    isCExp(exp) ? CExpConvertAllDictToApp(exp) :
    exp;

const defineConvertAllDictToApp = (exp: DefineExp): DefineExp =>
    makeDefineExp(exp.var, CExpConvertAllDictToApp(exp.val));

const CExpConvertAllDictToApp = (exp: CExp): CExp =>
    isDictExp(exp) ? DictExp2AppExp(exp) :
    isAtomicExp(exp) ? exp :
    isLitExp(exp) ? exp :
    isIfExp(exp) ? makeIfExp(CExpConvertAllDictToApp(exp.test), CExpConvertAllDictToApp(exp.then), CExpConvertAllDictToApp(exp.alt)) :
    isAppExp(exp) ? makeAppExp(CExpConvertAllDictToApp(exp.rator), map((rand: CExp) => CExpConvertAllDictToApp(rand), exp.rands)) :
    isProcExp(exp) ? makeProcExp(exp.args, map((e: CExp) => CExpConvertAllDictToApp(e), exp.body)) :
    isLetExp(exp) ? makeLetExp(map((b: Binding) => makeBinding(b.var.var ,CExpConvertAllDictToApp(b.val)), exp.bindings), map((e: CExp) => CExpConvertAllDictToApp(e), exp.body)) :
    exp;

 
const GET = `(define get (lambda (dictExp keyExp)
  (if (eq? dictExp '())
      "Error: key is not found"
      (if (eq? (car (car dictExp)) keyExp)
          (cdr (car dictExp))
          (get (cdr dictExp) keyExp))))
)`

const DICT =   `(define dict
    (lambda (dictExp)
        (lambda (keyExp)
            (get dictExp keyExp)
        )
    )
)
`

const parseL3 = (x: string): Result<Exp> => {
    const stree = p(x)
    const subSexp: Result<Exp> = isOk(stree) ? parseGoodDefine(stree.value[1], stree.value[2]) : makeFailure("No la policiaaaaa!!!") 
    return subSexp
}
/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog : Program): Program => {
    const convertedProg = Dict2App(prog);
    printProgram(prog)
    printProgram(convertedProg)
    const exps: Exp[] = convertedProg.exps
    const getExpression = parseL3(GET);
    const dictExpression = parseL3(DICT);
    const getExpressionValue: Exp = isOk(getExpression) ? getExpression.value : makeStrExp(getExpression.message);  
    const dictExpressionValue: Exp = isOk(dictExpression) ? dictExpression.value : makeStrExp(dictExpression.message);     
    return makeProgram([getExpressionValue, dictExpressionValue, ...exps]);
}


const printProgram = (prog: Program | Exp) => {
    console.log(JSON.stringify(prog, null, 2));
};


const noDictExp = (e : Program | Exp) : boolean =>
    isAtomicExp(e) ? true :
    isLitExp(e) ? true :
    isIfExp(e) ? noDictExp(e.test) && noDictExp(e.then) && noDictExp(e.alt) :
    isProcExp(e) ? all((b) => noDictExp(b), e.body) :
    isAppExp(e) ? noDictExp(e.rator) &&
              all((rand) => noDictExp(rand), e.rands) :
    isDefineExp(e) ? noDictExp(e.val) :
    isLetExp(e) ? all((val : CExp) => noDictExp(val), map((b : Binding) => b.val, e.bindings)) &&
                  all((b) => noDictExp(b), e.body) :
    isDictExp(e) ? true :
    isProgram(e) ? all((e) => noDictExp(e), e.exps) : 
    true;


const evalP = (x: string): Result<Value> => 
    bind(parseL32(x), (prog) => {
        
        return evalL32program(L32toL3(prog))
    }
)

const noDict = (x: string): Result<boolean> => 
    bind(parseL32(x), (prog) => 
        makeOk(noDictExp(L32toL3(prog))))


evalP(`(L32 ((dict (a 1) (b 2)) 'a))`)