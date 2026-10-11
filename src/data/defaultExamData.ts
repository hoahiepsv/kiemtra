import { ExamConfig, Question, SubmissionRecord } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  schoolName: 'TRƯỜNG THCS VÕ VĂN KIỆT',
  examName: 'KIỂM TRA THƯỜNG XUYÊN',
  subject: 'TIN HỌC 6',
  durationMinutes: 15,
  copyrightText: 'Lê Hoà Hiệp - 0983.676.470',
  data1Url: 'https://script.google.com/macros/s/AKfycbzNg9PzMUEAXXcvHhOFhtNr_1TgehE4carQ335h7oDno1FyrddqsH0sBA5yw2d5IOohCQ/exec',
  data2Url: 'https://script.google.com/macros/s/AKfycbzgbFVgpy_E2v6UxvNuCMHwB6ELkINqNnl1JPkVeTICL_nd8380rBuCzzi6BbeD-xHX/exec',
  shuffleQuestions: true,
  shuffleOptions: true,
  enableIpBlocking: true, // E1
  maxSubmissionsPerIp: 1, // F1: Mặc định cho phép 1 lần làm
  mcShuffleMode: 'BAT_BAT', // G1: BẬT - BẬT
  shuffleTrueFalse: true, // H1: BẬT
  shuffleEssay: false, // I1: TẮT
  blockedIps: [],
};

export const DEFAULT_QUESTIONS: Question[] = [];

export const INITIAL_LEADERBOARD: SubmissionRecord[] = [];
