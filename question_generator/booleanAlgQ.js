const VARS = ['A', 'B', 'C', 'D'];

function buildRandomExpression(numVars, minDepth = 2, maxDepth = 4) {
    const varsInUse = VARS.slice(0, numVars);

    function build(depth) {
        const mustRecurse = depth < minDepth;
        const canRecurse = depth < maxDepth;
        const leafChance = mustRecurse ? 0 : 0.25 + (depth - minDepth) * 0.2;

        if (!canRecurse || Math.random() < leafChance) {
            const name = varsInUse[Math.floor(Math.random() * varsInUse.length)];
            return Math.random() < 0.25
                ? { type: 'not', child: { type: 'var', name } }
                : { type: 'var', name };
        }
        const opRoll = Math.random();
        const op = opRoll < 0.35 ? 'and'
                  : opRoll < 0.65 ? 'or'
                  : opRoll < 0.85 ? 'implies'
                  : 'iff';

        return {
            type: op,
            left: build(depth + 1),
            right: build(depth + 1)
        };
    }

    return build(0);
}

function evaluateExpr(node, assignment) {
    switch (node.type) {
        case 'var': return assignment[node.name];
        case 'not': return !evaluateExpr(node.child, assignment);
        case 'and': return evaluateExpr(node.left, assignment) && evaluateExpr(node.right, assignment);
        case 'or': return evaluateExpr(node.left, assignment) || evaluateExpr(node.right, assignment);
        case 'implies': return !evaluateExpr(node.left, assignment) || evaluateExpr(node.right, assignment);
        case 'iff': return evaluateExpr(node.left, assignment) === evaluateExpr(node.right, assignment);
    }
}

function buildTruthTable(node, numVars) {
    const varsInUse = VARS.slice(0, numVars);
    const rows = [];
    for (let i = 0; i < (1 << numVars); i++) {
        const assignment = {};
        varsInUse.forEach((v, idx) => {
            assignment[v] = Boolean((i >> (numVars - 1 - idx)) & 1);
        });
        rows.push({ assignment, output: evaluateExpr(node, assignment) });
    }
    return rows;
}
function minimize(truthTable, numVars) {
    const minterms = truthTable
        .map((row, i) => ({ i, output: row.output }))
        .filter(r => r.output)
        .map(r => r.i);

    if (minterms.length === 0) return 'false';
    if (minterms.length === (1 << numVars)) return 'true';

    let groups = minterms.map(m => ({
        bits: m.toString(2).padStart(numVars, '0'),
        covers: [m]
    }));

    const primeImplicants = [];
    let changed = true;

    while (changed) {
        changed = false;
        const used = new Set();
        const nextGroups = [];

        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                const diff = diffOneBit(groups[i].bits, groups[j].bits);
                if (diff !== null) {
                    changed = true;
                    used.add(i); used.add(j);
                    const merged = groups[i].bits.split('');
                    merged[diff] = '-';
                    nextGroups.push({
                        bits: merged.join(''),
                        covers: [...new Set([...groups[i].covers, ...groups[j].covers])]
                    });
                }
            }
        }
        groups.forEach((g, idx) => { if (!used.has(idx)) primeImplicants.push(g); });
        groups = dedupe(nextGroups);
    }
    primeImplicants.push(...groups);
    
    const uncovered = new Set(minterms);
    const chosen = [];
    while (uncovered.size > 0) {
        let best = primeImplicants.reduce((a, b) =>
            b.covers.filter(c => uncovered.has(c)).length > a.covers.filter(c => uncovered.has(c)).length ? b : a
        );
        chosen.push(best);
        best.covers.forEach(c => uncovered.delete(c));
        primeImplicants.splice(primeImplicants.indexOf(best), 1);
    }

    return chosen.map(pi => termToString(pi.bits, numVars)).join(' v ');
}

function diffOneBit(a, b) {
    let diffIdx = null, diffCount = 0;
    for (let k = 0; k < a.length; k++) {
        if (a[k] !== b[k]) {
            if (a[k] === '-' || b[k] === '-') return null;
            diffCount++; diffIdx = k;
        }
    }
    return diffCount === 1 ? diffIdx : null;
}

function dedupe(groups) {
    const seen = new Map();
    for (const g of groups) seen.set(g.bits, g);
    return [...seen.values()];
}

function termToString(bits, numVars) {
    const vars = VARS.slice(0, numVars);
    let term = '';
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') term += vars[i];
        else if (bits[i] === '0') term += `¬${vars[i]}`;
    }
    return term || 'true';
}

function exprToString(node) {
    switch (node.type) {
        case 'var': return node.name;
        case 'not': return `¬${exprToString(node.child)}`;
        case 'and': return `(${exprToString(node.left)} ^ ${exprToString(node.right)})`;
        case 'or': return `(${exprToString(node.left)} v ${exprToString(node.right)})`;
        case 'implies': return `(${exprToString(node.left)} => ${exprToString(node.right)})`;
        case 'iff': return `(${exprToString(node.left)} <=> ${exprToString(node.right)})`;
    }
}

function boolToWord(b) {
    return b ? 'true' : 'false';
}

function generateBooleanQuestion({
    numVars = 3,
    questionType = 'simplify',
    minDepth = 2,
    maxDepth = 4
} = {}) {
    if (![2, 3, 4].includes(numVars)) throw new Error('numVars must be 2, 3, or 4');

    const expr = buildRandomExpression(numVars, minDepth, maxDepth);
    const truthTable = buildTruthTable(expr, numVars);
    const simplified = minimize(truthTable, numVars);

    if (questionType === 'evaluate') {
        const row = truthTable[Math.floor(Math.random() * truthTable.length)];
        const givenStr = Object.entries(row.assignment)
            .map(([k, v]) => `${k}=${boolToWord(v)}`).join(', ');

        return {
            questionType,
            prompt: `Evaluate: ${exprToString(expr)}, given ${givenStr}`,
            correct_answer: boolToWord(row.output),
            difficulty_hint: estimateDifficulty(expr, numVars)
        };
    }

    return {
        questionType,
        prompt: `Simplify: ${exprToString(expr)}`,
        correct_answer: simplified,
        truth_table: truthTable,       
        difficulty_hint: estimateDifficulty(expr, numVars)
    };
}

function estimateDifficulty(expr, numVars) {
    let score = 1000 + numVars * 100;
    const depth = exprDepth(expr);
    score += depth * 60;
    return score;
}
function exprDepth(node) {
    if (node.type === 'var') return 1;
    if (node.type === 'not') return 1 + exprDepth(node.child);
    return 1 + Math.max(exprDepth(node.left), exprDepth(node.right));
}
