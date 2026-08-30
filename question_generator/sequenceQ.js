const SEQUENCE_TYPES = ['arithmetic', 'geometric', 'quadratic', 'fibonacci_like', 'geometric_alternating'];

function generateSequenceQuestion({
    type = null,
    termsShown = 5,
    minVal = -10,
    maxVal = 10
} = {}) {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randNonZero = (min, max) => { let v; do { v = randInt(min, max); } while (v === 0); return v; };

    const chosenType = type || SEQUENCE_TYPES[Math.floor(Math.random() * SEQUENCE_TYPES.length)];

    let generator, ruleDescription;

    switch (chosenType) {
        case 'arithmetic': {
            const start = randInt(minVal, maxVal);
            const diff = randNonZero(-6, 6);
            generator = (n) => start + n * diff;
            ruleDescription = `arithmetic, common difference ${diff}`;
            break;
        }
        case 'geometric': {
            const start = randNonZero(1, 5) * (Math.random() < 0.5 ? 1 : -1);
            const ratio = randNonZero(-3, 3) === 0 ? 2 : randNonZero(2, 3) * (Math.random() < 0.5 ? -1 : 1);
            generator = (n) => start * Math.pow(ratio, n);
            ruleDescription = `geometric, common ratio ${ratio}`;
            break;
        }
        case 'quadratic': {
            const a = randNonZero(-3, 3);
            const b = randInt(-5, 5);
            const c = randInt(minVal, maxVal);
            generator = (n) => a * n * n + b * n + c;
            ruleDescription = `quadratic, second difference ${2 * a}`;
            break;
        }
        case 'fibonacci_like': {
            const t0 = randInt(1, 6);
            const t1 = randInt(1, 6);
            const seq = [t0, t1];
            generator = (n) => {
                while (seq.length <= n) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
                return seq[n];
            };
            ruleDescription = `each term = sum of previous two (start ${t0}, ${t1})`;
            break;
        }
        case 'geometric_alternating': {
            const start = randNonZero(-5, 5);
            const ratio = randNonZero(2, 3);
            generator = (n) => start * Math.pow(-ratio, n);
            ruleDescription = `geometric with alternating sign, ratio ${-ratio}`;
            break;
        }
    }

    const minTermsForType = { arithmetic: 4, geometric: 4, quadratic: 5, fibonacci_like: 5, geometric_alternating: 5 };
    const shown = Math.max(termsShown, minTermsForType[chosenType]);

    const sequence = Array.from({ length: shown }, (_, i) => generator(i));
    const nextValue = generator(shown);

    return {
        questionType: 'next_sequence_value',
        sequenceType: chosenType,
        prompt: `What is the next number in the sequence: ${sequence.join(', ')}, ?`,
        sequence,
        correct_answer: nextValue,
        rule: ruleDescription,
        difficulty_hint: estimateDifficulty(chosenType, sequence)
    };
}

function estimateDifficulty(type, sequence) {
    const base = { arithmetic: 1000, geometric: 1150, geometric_alternating: 1250, quadratic: 1350, fibonacci_like: 1300 };
    let score = base[type] ?? 1100;
    const maxAbs = Math.max(...sequence.map(Math.abs));
    if (maxAbs > 50) score += 60;
    return score;
}

console.log(generateSequenceQuestion({ type: 'arithmetic' }));
console.log(generateSequenceQuestion({ type: 'quadratic' }));
console.log(generateSequenceQuestion({ type: 'fibonacci_like' }));
console.log(generateSequenceQuestion());
