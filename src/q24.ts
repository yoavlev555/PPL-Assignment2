import { CExp, DictExp, Exp, Program, isDictExp, isAppExp, isBoolExp, isNumExp, isStrExp, isVarRef, isLitExp, isPrimOp, isIfExp, isProcExp, isDefineExp, makeAppExp, makeDefineExp,
    makeLitExp, makeProcExp, makeProgram, makeVarDecl, makeVarRef, makeIfExp, makePrimOp } from './L32/L32-ast';

import { makeSymbolSExp, makeEmptySExp, makeCompoundSExp, SExpValue } from './L32/L32-value';

const convertToSExp = (cexp: CExp): SExpValue => {
    if (isNumExp(cexp) || isBoolExp(cexp) || isStrExp(cexp))
        return cexp.val;

    if (isVarRef(cexp)) return makeSymbolSExp(cexp.var);
    if (isLitExp(cexp)) return cexp.val;
    if (isPrimOp(cexp)) return makeSymbolSExp(cexp.op);

    if (isAppExp(cexp)) {
        const components = [cexp.rator, ...cexp.rands].map(convertToSExp);
        return components.reduceRight<SExpValue>(
            (acc, curr) => makeCompoundSExp(curr, acc),
            makeEmptySExp()
        );
    }

    if (isProcExp(cexp)) {
        const lambdaSym = makeSymbolSExp('lambda');
        const argsList = cexp.args
            .map(arg => makeSymbolSExp(arg.var))
            .reduceRight<SExpValue>((acc, curr) => makeCompoundSExp(curr, acc), makeEmptySExp());
        const bodyConverted = cexp.body.map(convertToSExp);
        return [lambdaSym, argsList, ...bodyConverted].reduceRight<SExpValue>(
            (acc, curr) => makeCompoundSExp(curr, acc),
            makeEmptySExp()
        );
    }

    if (isDictExp(cexp)) {
        const dictSym = makeSymbolSExp("dict");
        const dictEntries = cexp.bindings.map(entry => {
            const keySym = makeSymbolSExp(entry.var.var);
            const valSym = convertToSExp(entry.val);
            return makeCompoundSExp(keySym, makeCompoundSExp(valSym, makeEmptySExp()));
        });
        return [dictSym, ...dictEntries].reduceRight<SExpValue>(
            (acc, curr) => makeCompoundSExp(curr, acc),
            makeEmptySExp()
        );
    }

    return makeSymbolSExp(cexp.toString());
};

const convertDictToApp = (dict: DictExp): CExp => {
    const quotedBindings = dict.bindings.reduceRight<SExpValue>((acc, entry) =>
        makeCompoundSExp(
            makeCompoundSExp(
                makeSymbolSExp(entry.var.var),
                convertToSExp(entry.val)
            ),
            acc
        ), makeEmptySExp());

    return makeAppExp(makeVarRef('dict'), [makeLitExp(quotedBindings)]);
};

const rewriteCExp = (exp: CExp): CExp => {
    if (isNumExp(exp) || isBoolExp(exp) || isStrExp(exp) ||
        isVarRef(exp) || isLitExp(exp) || isPrimOp(exp)) {
        return exp;
    } else if (isIfExp(exp)) {
        return makeIfExp(rewriteCExp(exp.test), rewriteCExp(exp.then), rewriteCExp(exp.alt));
    } else if (isProcExp(exp)) {
        return makeProcExp(exp.args, exp.body.map(rewriteCExp));
    } else if (isAppExp(exp)) {
        return isDictExp(exp.rator)
            ? makeAppExp(convertDictToApp(exp.rator), [rewriteCExp(exp.rands[0])])
            : makeAppExp(rewriteCExp(exp.rator), exp.rands.map(rewriteCExp));
    } else if (isDictExp(exp)) {
        return convertDictToApp(exp);
    }
    return exp;
};

const rewriteExp = (exp: Exp): Exp =>
    isDefineExp(exp)
        ? makeDefineExp(exp.var, rewriteCExp(exp.val))
        : rewriteCExp(exp);

export const Dict2App = (program: Program): Program =>
    makeProgram(program.exps.map(rewriteExp));

export const L32toL3 = (program: Program): Program => {
    const dictDef = makeDefineExp(
        makeVarDecl('dict'),
        makeProcExp([
            makeVarDecl('pairs')
        ], [
            makeProcExp([
                makeVarDecl('k')
            ], [
                makeIfExp(
                    makeAppExp(makePrimOp('eq?'), [
                        makeAppExp(makePrimOp('car'), [
                            makeAppExp(makePrimOp('car'), [makeVarRef('pairs')])
                        ]),
                        makeVarRef('k')
                    ]),
                    makeAppExp(makePrimOp('cdr'), [
                        makeAppExp(makePrimOp('car'), [makeVarRef('pairs')])
                    ]),
                    makeAppExp(
                        makeAppExp(makeVarRef('dict'), [
                            makeAppExp(makePrimOp('cdr'), [makeVarRef('pairs')])
                        ]),
                        [makeVarRef('k')]
                    )
                )
            ])
        ])
    );

    return makeProgram([dictDef, ...Dict2App(program).exps]);
};
