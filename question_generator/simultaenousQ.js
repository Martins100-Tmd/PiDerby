const VARS = ['x', 'y', 'z', 'w'];

/**
 * Generates a system of n linear equations in n unknowns (n = 2, 3, or 4),
 * with a known, exact solution — same "pick the answer first" strategy as
 * before, generalized to arbitrary size.
 *
 * @param {Object} options
 * @param {number} options.size - 2, 3, or 4
 * @param {number} options.minVal - smallest possible value per unknown
 * @param {number} options.maxVal - largest possible value per unknown
 * @param {number} options.maxCoeff - cap on |coefficient|, keeps numbers readable
 * @param {boolean} options.allowFractionalSolution - allow values like 3/2
 */
function generateSimultaneousEquations({
    size = 2,
    minVal = -10,
    maxVal = 10,
    maxCoeff = 6,
    allowFractionalSolution = false
} = {}) {
    if (![2, 3, 4].includes(size)) throw new Error('size must be 2, 3, or 4');

    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randNonZero = (min, max) => {
        let v;
        do { v = randInt(min, max); } while (v === 0);
        return v;
    };

    const solution = [];
    for (let i = 0; i < size; i++) {
        if (allowFractionalSolution && Math.random() < 0.3) {
            const denom = randInt(2, 3);
            const num = randInt(minVal * denom, maxVal * denom);
            solution.push(num / denom);
        } else {
            solution.push(randInt(minVal, maxVal));
        }
    }

    let matrix, det;
    let attempts = 0;
    do {
        matrix = Array.from({ length: size }, () =>
            Array.from({ length: size }, () => randNonZero(-maxCoeff, maxCoeff))
        );
        det = determinant(matrix);
        attempts++;
        if (attempts > 200) throw new Error('failed to find invertible matrix — widen maxCoeff or retry');
    } while (det === 0);

    const rawConstants = matrix.map(row =>
        row.reduce((sum, coef, j) => sum + coef * solution[j], 0)
    );

    const equations = matrix.map((row, i) => scaleToIntegers(row, rawConstants[i]));

    return {
        size,
        equations_display: equations.map(eq => formatLinearEq(eq.coeffs, eq.constant)),
        params: { equations: equations.map(eq => ({ coeffs: eq.coeffs, constant: eq.constant })) },
        solution: Object.fromEntries(VARS.slice(0, size).map((v, i) => [v, solution[i]])),
        difficulty_hint: estimateDifficulty(equations, solution)
    };
}

function determinant(matrix) {
    const n = matrix.length;
    if (n === 1) return matrix[0][0];
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

    let det = 0;
    for (let col = 0; col < n; col++) {
        const minor = matrix.slice(1).map(row =>
            row.filter((_, j) => j !== col)
        );
        const sign = col % 2 === 0 ? 1 : -1;
        det += sign * matrix[0][col] * determinant(minor);
    }
    return det;
}

function scaleToIntegers(coeffs, constant) {
    if (Number.isInteger(constant)) return { coeffs, constant };
    const denom = findDenominator(constant);
    return {
        coeffs: coeffs.map(c => c * denom),
        constant: Math.round(constant * denom)
    };
}

function findDenominator(val, maxDenom = 12) {
    for (let d = 2; d <= maxDenom; d++) {
        if (Number.isInteger(Math.round(val * d * 1000) / 1000)) return d;
    }
    return 1;
}

function formatLinearEq(coeffs, constant) {
    let terms = coeffs.map((coef, i) => {
        if (coef === 0) return '';
        const variable = VARS[i];
        const sign = coef > 0 ? '+' : '-';
        const abs = Math.abs(coef);
        const num = abs === 1 ? '' : abs;
        return ` ${sign} ${num}${variable}`;
    }).join('');
    terms = terms.replace(/^\s*\+\s*/, '').trim();
    return `${terms} = ${constant}`;
}

function estimateDifficulty(equations, solution) {
    let score = 1000 + (equations.length - 1) * 200;
    if (solution.some(v => !Number.isInteger(v))) score += 130;
    const maxAbsCoeff = Math.max(...equations.flatMap(eq => eq.coeffs.map(Math.abs)));
    if (maxAbsCoeff > 8) score += 40;
    const maxAbsConst = Math.max(...equations.map(eq => Math.abs(eq.constant)));
    if (maxAbsConst > 30) score += 30;
    return score;
}

let rand = Math.floor(Math.random() * 4) + 1;
rand = rand < 2 ? 2 : rand;
rand = rand > 4 ? 4 : rand;
console.log(generateSimultaneousEquations({ size: rand, allowFractionalSolution: true }));
