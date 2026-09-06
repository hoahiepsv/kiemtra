export type QuestionType = 'Trắc nghiệm 1 đáp án' | 'Tự luận';

export interface Question {
  id: number;
  orderNumber: number; // Câu số
  type: QuestionType; // Loại câu hỏi
  content: string; // Nội dung chính
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string; // A, B, C, D hoặc giá trị số tự luận như "1000"
  points: number; // Điểm (0.5, 1.0...)
  category: string; // Nhận biết, Thông hiểu, Vận dụng, Tính toán
  explanation?: string; // Giải thích chi tiết
}

export interface ExamConfig {
  schoolName: string; // TRƯỜNG THCS VÕ VĂN KIỆT
  examName: string; // KIỂM TRA ĐỊNH KỲ / KIỂM TRA THƯỜNG XUYÊN
  subject: string; // MÔN: TIN HỌC 6
  durationMinutes: number; // THỜI GIAN LÀM BÀI: 15
  copyrightText: string; // Lê Hoà Hiệp - 0983.676.470
  data1Url?: string;
  data2Url?: string;
}

export interface StudentAnswer {
  questionId: number;
  selectedOption?: string; // 'A' | 'B' | 'C' | 'D'
  essayAnswer?: string;
  isFlagged?: boolean; // Đánh dấu xem lại
}

export interface StudentInfo {
  fullName: string;
  className: string;
}

export interface SubmissionRecord {
  stt: number;
  studentName: string;
  className: string;
  totalScore: number;
  maxScore: number;
  scoreString: string; // e.g., "1:0.5 2:0.5 3:1 ..."
  startTime: string; // e.g., "8:00 04/09/2026"
  endTime: string; // e.g., "8:15 04/09/2026"
  totalDuration: string; // e.g., "00:15"
  ipAddress?: string; // IP thuê bao: là IP thiết bị HS sử dụng (dạng IPv4: 113.169.89.135...)
  timestamp: number;
  syncedToData2: boolean;
  questionResults: {
    questionId: number;
    orderNumber: number;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    earnedPoints: number;
    maxPoints: number;
    category: string;
  }[];
}

export interface SkillStat {
  name: string;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  status: 'good' | 'average' | 'weak';
  recommendation: string;
}

export interface DraftExam {
  studentInfo: StudentInfo;
  answers: Record<number, StudentAnswer>;
  startTime: string;
  startTimestamp: number;
  remainingSeconds: number;
  currentQuestionIndex: number;
  lastSavedAt: string;
}

export type AdminRole = 'superadmin' | 'subadmin';

export interface AdminAuthSession {
  role: AdminRole;
  name: string;
  permissions: {
    canEditExam: boolean; // Tạo & chỉnh sửa đề thi
    canExportImage: boolean; // Xuất báo cáo ảnh
    canExportExcel: boolean; // Xuất báo cáo xlsx
    canManageAppsScript: boolean; // Cấu hình Google Sheets & Apps Script
  };
}
