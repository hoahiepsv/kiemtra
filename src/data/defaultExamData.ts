import { ExamConfig, Question, SubmissionRecord } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  schoolName: 'TRƯỜNG THCS VÕ VĂN KIỆT',
  examName: 'KIỂM TRA THƯỜNG XUYÊN',
  subject: 'TIN HỌC 6',
  durationMinutes: 15,
  copyrightText: 'Lê Hoà Hiệp - 0983.676.470',
  data1Url: 'https://script.google.com/macros/s/AKfycbz9zQcN3CuaLsjyHEQeNiR5vJv_gfWhwBKDFL35k-q5VVQQwr0yBqBPCbyE1OF1A86jsw/exec',
  data2Url: 'https://script.google.com/macros/s/AKfycbxxT7uc08D92XLmNaTvbXJvrrDBYN257-ByspJ00BtOJvankVLbdqfHKddfDm-7BG2s/exec',
};

export const DEFAULT_QUESTIONS: Question[] = [];

export const INITIAL_LEADERBOARD: SubmissionRecord[] = [];
