import { ExamConfig, Question, SubmissionRecord } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  schoolName: 'TRƯỜNG THCS VÕ VĂN KIỆT - P. PHÚ MỸ',
  examName: 'KIỂM TRA THƯỜNG XUYÊN',
  subject: 'TIN HỌC 6',
  durationMinutes: 20,
  examDateRange: '29/09/2026 - 12/10/2026', // D3
  copyrightText: 'Lê Hoà Hiệp - 0983.676.470',
  data1Url: 'https://script.google.com/macros/s/AKfycbym0FDt9-Gg1-ZhAbmu_TQhr3qvXSz0oQ7J2FbIb0Q3znm1X2VfF0spC6-JzRa8Q9o/exec',
  data2Url: 'https://script.google.com/macros/s/AKfycbzgbFVgpy_E2v6UxvNuCMHwB6ELkINqNnl1JPkVeTICL_nd8380rBuCzzi6BbeD-xHX/exec',
  shuffleQuestions: true,
  shuffleOptions: true,
  enableIpBlocking: true, // E1
  maxSubmissionsPerIp: 3, // F1: Cho phép 3 lần làm
  mcShuffleMode: 'BAT_BAT', // G1: BẬT - BẬT
  shuffleTrueFalse: true, // H1: BẬT
  shuffleEssay: false, // I1: TẮT
  isExamActive: true, // J1: Bật
  blockedIps: [],
};

export const DEFAULT_QUESTIONS: Question[] = [];

export const INITIAL_LEADERBOARD: SubmissionRecord[] = [];
