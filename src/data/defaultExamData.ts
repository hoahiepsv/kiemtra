import { ExamConfig, Question, SubmissionRecord } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  schoolName: 'TRƯỜNG THCS VÕ VĂN KIỆT',
  examName: 'KIỂM TRA THƯỜNG XUYÊN',
  subject: 'TIN HỌC 6',
  durationMinutes: 15,
  copyrightText: 'Lê Hoà Hiệp - 0983.676.470',
  data1Url: 'https://script.google.com/macros/s/AKfycbxdxVRbNGgLoTtofRU9BeB8NLxQyU3z2dAmiGndNwOjJ8T9NzioN0VsVTaipKwg8KBOpw/exec',
  data2Url: 'https://script.google.com/macros/s/AKfycby75dcZbrgLbtg2tymL47LqvmkItG1RD4Tab7dPStqMxyw8k2MGtP_zur7qwkAI_OJU/exec',
};

export const DEFAULT_QUESTIONS: Question[] = [];

export const INITIAL_LEADERBOARD: SubmissionRecord[] = [];
