/**
 * Utility functions for building and parsing the detailed question score structure:
 * <Số câu : số điểm : "Đáp án HS chọn / đã gõ">
 * Ví dụ: <1 : 0,5 : "A"> <2 : 1 : "Liên kết"> <3 : 0 : "">
 */

export interface ParsedScoreDetail {
  orderNumber: number;
  earnedPoints: number;
  studentAnswer: string;
  isCorrect: boolean;
}

export interface ParsedScoreStringResult {
  items: ParsedScoreDetail[];
  scoreMap: Map<number, number>;
  answerMap: Map<number, string>;
  correctCount: number;
}

/**
 * Format a single question's score and student answer:
 * <1 : 0,5 : "A">
 */
export function formatScoreItem(
  orderNumber: number,
  earnedPoints: number,
  studentAnswer: string
): string {
  // Format score with comma for decimals, e.g. 0.5 -> 0,5
  const ptsFormatted = String(earnedPoints).replace('.', ',');
  // Escape any double quotes in answer text
  const cleanAnswer = (studentAnswer || '').replace(/"/g, "'").trim();
  return `<${orderNumber} : ${ptsFormatted} : "${cleanAnswer}">`;
}

/**
 * Build the full scoreString from a list of question results
 */
export function buildScoreString(
  results: { orderNumber: number; earnedPoints: number; studentAnswer: string }[]
): string {
  return results
    .map((r) => formatScoreItem(r.orderNumber, r.earnedPoints, r.studentAnswer))
    .join(' ');
}

/**
 * Parse scoreString supporting both new structure `<1 : 0,5 : "A">` and legacy `1:0.5 2:1`
 */
export function parseScoreStringDetailed(scoreStr: string): ParsedScoreStringResult {
  const items: ParsedScoreDetail[] = [];
  const scoreMap = new Map<number, number>();
  const answerMap = new Map<number, string>();
  let correctCount = 0;

  const trimmed = (scoreStr || '').trim();
  if (!trimmed) {
    return { items, scoreMap, answerMap, correctCount };
  }

  // Check if string contains the new bracket format `<...>`
  if (trimmed.includes('<') && trimmed.includes('>')) {
    const regex = /<(\d+)\s*:\s*([^:]+?)\s*:\s*"([\s\S]*?)">/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(trimmed)) !== null) {
      const orderNumber = parseInt(match[1], 10);
      const rawPts = match[2].trim().replace(',', '.');
      const earnedPoints = rawPts === '-' ? 0 : parseFloat(rawPts) || 0;
      const studentAnswer = match[3] ?? '';
      const isCorrect = earnedPoints > 0;

      items.push({ orderNumber, earnedPoints, studentAnswer, isCorrect });
      scoreMap.set(orderNumber, earnedPoints);
      answerMap.set(orderNumber, studentAnswer);
      if (isCorrect) {
        correctCount++;
      }
    }
  }

  // Fallback if no items were matched (legacy format e.g. "1:0.5 2:1 3:-")
  if (items.length === 0) {
    const parts = trimmed.split(/\s+/);
    parts.forEach((p) => {
      const colonIdx = p.indexOf(':');
      if (colonIdx > 0) {
        const orderStr = p.substring(0, colonIdx);
        const ptsStr = p.substring(colonIdx + 1);
        const orderNumber = parseInt(orderStr, 10);
        if (!isNaN(orderNumber)) {
          const rawPts = ptsStr.replace(',', '.');
          const earnedPoints = rawPts === '-' ? 0 : parseFloat(rawPts) || 0;
          const isCorrect = earnedPoints > 0;
          items.push({
            orderNumber,
            earnedPoints,
            studentAnswer: '',
            isCorrect,
          });
          scoreMap.set(orderNumber, earnedPoints);
          answerMap.set(orderNumber, '');
          if (isCorrect) {
            correctCount++;
          }
        }
      }
    });
  }

  return { items, scoreMap, answerMap, correctCount };
}
