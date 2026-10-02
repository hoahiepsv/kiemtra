import { ExamConfig, Question, SubmissionRecord } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  schoolName: 'TRƯỜNG THCS VÕ VĂN KIỆT',
  examName: 'KIỂM TRA THƯỜNG XUYÊN',
  subject: 'TIN HỌC 6',
  durationMinutes: 15,
  copyrightText: 'Lê Hoà Hiệp - 0983.676.470',
  data1Url: 'https://script.google.com/macros/s/AKfycbxdxVRbNGgLoTtofRU9BeB8NLxQyU3z2dAmiGndNwOjJ8T9NzioN0VsVTaipKwg8KBOpw/exec',
  data2Url: 'https://script.google.com/macros/s/AKfycbw2ArWfvmE9lJQQRrUNIv6y_EXS8yOzdVRF7AILq3MXjRiNjgwooOsco_4TeCoC2O3o/exec',
};

export const DEFAULT_QUESTIONS: Question[] = [];

export const INITIAL_LEADERBOARD: SubmissionRecord[] = [];
