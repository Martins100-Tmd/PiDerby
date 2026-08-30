import { PWD } from "../pwd";

async function quadraticEquation(equation) {
    try {
        const params = new URLSearchParams({
            appid: PWD,
            input: `solve (${equation})`,
            includepodid: 'Result',
            output: 'json'
        });
        const response = await fetch(
            `https://api.wolframalpha.com/v2/query?${params}`
        );
        const data = await response.json();

        const pod = data.queryresult?.pods?.[0];
        if (!pod) return { raw: null, roots: [] };

        // Collect ALL subpods, not just the first
        const rawText = pod.subpods
            .map(sp => sp.plaintext)
            .filter(Boolean)
            .join(' | ');
        console.log(rawText);
        return { raw: rawText, roots: parseRoots(rawText) };
    } catch (error) {
        return { raw: `Error: ${error.message}`, roots: [] };
    }
}

function parseRoots(text) {
    const chunks = text
        .split(/\bor\b|\band\b|\||,/i)
        .map(s => s.trim())
        .filter(Boolean);
    const roots = new Set();
    for (const chunk of chunks) {
        const match = chunk.match(/=\s*(.+)$/);
        if (!match) continue;
        const expr = match[1].trim();
        const raw = expr.startsWith('±') ? expr.slice(1).trim() : expr;

        let val;
        if (raw.includes('/')) {
            const [n, d] = raw.split('/').map(s => parseFloat(s.trim()));
            val = d === 0 ? NaN : n / d;
        } else {
            val = parseFloat(raw);
        }

        if (isNaN(val)) continue;
        if (expr.startsWith('±')) { roots.add(val); roots.add(-val); }
        else roots.add(val);
    }
    return [...roots].sort((a, b) => a - b);
}

/**
 * Generates a polynomial equation of degree 1-4 with known, exact roots,
 * by constructing it from its factors rather than solving for random coefficients.
 *
 * @param {Object} options
 * @param {number} options.degree 
 * @param {number} options.minRoot
 * @param {number} options.maxRoot
 * @param {boolean} options.allowFractionalRoots
 * @param {boolean} options.allowRepeatedRoots
 * @param {number} options.maxScale
 * */
function generatePolynomial({
    degree = 2,
    minRoot = -6,
    maxRoot = 6,
    allowFractionalRoots = false,
    allowRepeatedRoots = false,
    maxScale = 2
} = {}) {
    if (degree < 1 || degree > 4) throw new Error('degree must be between 1 and 4');

    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const roots = [];
    for (let i = 0; i < degree; i++) {
        if (allowRepeatedRoots && roots.length > 0 && Math.random() < 0.25) {
            roots.push({ ...roots[randInt(0, roots.length - 1)] });
            continue;
        }
        let denom = 1;
        let num;
        if (allowFractionalRoots && Math.random() < 0.35) {
            denom = randInt(2, 3);
            num = randInt(minRoot * denom, maxRoot * denom);
        } else {
            num = randInt(minRoot, maxRoot);
        }
        roots.push({ num, denom });
    }

    let coeffs = [1];
    for (const { num, denom } of roots) {
        coeffs = multiplyPoly(coeffs, [-num, denom]);
    }

    const scale = randInt(1, maxScale);
    coeffs = coeffs.map(c => c * scale);

    const exactRoots = roots.map(r => r.num / r.denom).sort((a, b) => a - b);

    return {
        template_expr: buildExprString(coeffs),
        degree,
        coefficients: coeffs.slice().reverse(),
        roots: exactRoots,
        accepted_forms: buildAcceptedForms(exactRoots),
        difficulty_hint: estimateDifficulty(degree, roots, coeffs)
    };
}

function multiplyPoly(p1, p2) {
    const result = new Array(p1.length + p2.length - 1).fill(0);
    for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
            result[i + j] += p1[i] * p2[j];
        }
    }
    return result;
}


function buildExprString(coeffsAscending) {
    const n = coeffsAscending.length - 1;
    let terms = [];
    for (let power = n; power >= 0; power--) {
        const c = coeffsAscending[power];
        if (c === 0) continue;
        const sign = c > 0 ? '+' : '-';
        const abs = Math.abs(c);
        let term;
        if (power === 0) term = `${abs}`;
        else if (power === 1) term = abs === 1 ? 'x' : `${abs}x`;
        else term = abs === 1 ? `x^${power}` : `${abs}x^${power}`;
        terms.push(`${sign} ${term}`);
    }
    let expr = terms.join(' ').replace(/^\+\s*/, '');
    return `${expr} = 0`;
}

function buildAcceptedForms(roots) {
    const distinct = [...new Set(roots.map(r => Number.isInteger(r) ? r : parseFloat(r.toFixed(4))))];
    return { canonical: distinct.sort((a, b) => a - b) };
}

function estimateDifficulty(degree, roots, coeffs) {
    let score = 1000 + degree * 150;
    const hasFraction = roots.some(r => r.denom !== 1);
    const hasRepeat = new Set(roots.map(r => `${r.num}/${r.denom}`)).size < roots.length;
    if (hasFraction) score += 100;
    if (hasRepeat) score += 60;
    if (Math.max(...coeffs.map(Math.abs)) > 40) score += 40;
    return score;
}


const randomDegree = Math.floor(Math.random() * 4) + 1;
const question = generatePolynomial({ allowFractionalRoots: true, degree: randomDegree });
console.log(question.template_expr);
console.time();
const answer = await quadraticEquation(question.template_expr);
console.timeEnd();
console.log('Solution:', answer.roots);
