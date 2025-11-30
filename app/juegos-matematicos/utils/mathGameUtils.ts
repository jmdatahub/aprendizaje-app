import { MathGameStats } from '../services/mathGameStorage';

export type OperationType = 'sum' | 'sub' | 'mul' | 'div' | 'mixed';
export type DifficultyLevel = 'facil' | 'medio' | 'dificil';

export interface MathExercise {
  operands: number[];
  operator: string;
  answer: number;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateExercise(operation: OperationType, level: DifficultyLevel): MathExercise {
  // Handle mixed operation by randomly selecting one
  if (operation === 'mixed') {
    const operations: OperationType[] = ['sum', 'sub', 'mul', 'div'];
    const randomOp = operations[Math.floor(Math.random() * operations.length)];
    return generateExercise(randomOp, level);
  }

  let operands: number[] = [];
  let answer = 0;
  let operator = '';

  switch (operation) {
    case 'sum':
      operator = '+';
      if (level === 'facil') {
        operands = [getRandomInt(1, 20), getRandomInt(1, 20)];
      } else if (level === 'medio') {
        operands = [getRandomInt(10, 100), getRandomInt(10, 100)];
      } else {
        // Dificil: 2 or 3 numbers
        const count = Math.random() > 0.5 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          operands.push(getRandomInt(50, 200));
        }
      }
      answer = operands.reduce((a, b) => a + b, 0);
      break;

    case 'sub':
      operator = '-';
      if (level === 'facil') {
        // Ensure positive result for easy
        const a = getRandomInt(5, 20);
        const b = getRandomInt(1, a); // b <= a
        operands = [a, b];
      } else if (level === 'medio') {
        // Can result in negative, but keep numbers reasonable
        operands = [getRandomInt(10, 100), getRandomInt(10, 100)];
      } else {
        // Larger numbers
        operands = [getRandomInt(50, 500), getRandomInt(50, 500)];
      }
      answer = operands[0] - operands[1];
      break;

    case 'mul':
      operator = '×';
      if (level === 'facil') {
        // Basic tables 1-10
        operands = [getRandomInt(1, 10), getRandomInt(1, 10)];
      } else if (level === 'medio') {
        // One factor up to 20, or both up to 12
        operands = [getRandomInt(2, 20), getRandomInt(2, 12)];
      } else {
        // 2 digits * 2 digits
        operands = [getRandomInt(10, 30), getRandomInt(5, 20)];
      }
      answer = operands[0] * operands[1];
      break;

    case 'div':
      operator = '÷';
      if (level === 'facil') {
        // Exact division, small numbers
        const divisor = getRandomInt(2, 10);
        const quotient = getRandomInt(1, 10);
        const dividend = divisor * quotient;
        operands = [dividend, divisor];
        answer = quotient;
      } else if (level === 'medio') {
        // Exact division, larger numbers
        const divisor = getRandomInt(2, 20);
        const quotient = getRandomInt(2, 20);
        const dividend = divisor * quotient;
        operands = [dividend, divisor];
        answer = quotient;
      } else {
        // Exact division, big numbers
        const divisor = getRandomInt(5, 50);
        const quotient = getRandomInt(5, 50);
        const dividend = divisor * quotient;
        operands = [dividend, divisor];
        answer = quotient;
      }
      break;
  }

  return { operands, operator, answer };
}

/**
 * Selects an operation based on user performance.
 * Prioritizes operations with lower accuracy or higher error counts.
 */
export function selectSmartOperation(stats: MathGameStats): OperationType {
  const operations: OperationType[] = ['sum', 'sub', 'mul', 'div'];
  
  // Calculate weights based on performance
  // Higher weight = higher chance of being selected
  const weights = operations.map(op => {
    const opStats = stats[op];
    if (opStats.totalAttempts === 0) return 10; // High priority for untested operations

    const accuracy = opStats.correctCount / opStats.totalAttempts;
    const errorRate = 1 - accuracy;
    
    // Base weight is 1. Add weight based on error rate.
    // If error rate is 100% (1.0), weight adds 10.
    // If error rate is 0% (0.0), weight adds 0.
    return 1 + (errorRate * 10);
  });

  // Weighted random selection
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < operations.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return operations[i];
    }
  }

  return 'sum'; // Fallback
}

/**
 * Determines the difficulty level for an operation based on performance.
 * Increases difficulty if accuracy is high.
 */
export function determineSmartLevel(op: OperationType, stats: MathGameStats): DifficultyLevel {
  const opStats = stats[op];
  
  if (opStats.totalAttempts < 5) return 'facil'; // Start easy

  const accuracy = opStats.correctCount / opStats.totalAttempts;

  // If accuracy is very high (> 90%) and we have enough data, increase difficulty
  if (accuracy > 0.9 && opStats.totalAttempts > 10) {
    if (opStats.lastLevel === 'facil') return 'medio';
    if (opStats.lastLevel === 'medio') return 'dificil';
    return 'dificil';
  }

  // If accuracy is low (< 60%), decrease difficulty
  if (accuracy < 0.6) {
    if (opStats.lastLevel === 'dificil') return 'medio';
    if (opStats.lastLevel === 'medio') return 'facil';
    return 'facil';
  }

  return opStats.lastLevel; // Maintain current level
}
