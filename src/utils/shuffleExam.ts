import { Question } from '../types';

export interface ShuffledOption {
  key: 'A' | 'B' | 'C' | 'D'; // Vị trí hiển thị trên giao diện học sinh
  originalKey: 'A' | 'B' | 'C' | 'D'; // Vị trí gốc trong đề của giáo viên
  text: string;
}

export interface ShuffledQuestion extends Question {
  displayOrderNumber: number; // Thứ tự hiển thị trên bài làm của học sinh (1..N)
  shuffledOptions?: ShuffledOption[];
}

/**
 * Thuật toán xáo trộn mảng Fisher-Yates (Knuth shuffle)
 * Tốc độ cực nhanh O(N), chạy trong RAM không tốn tài nguyên
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sinh ra đề thi được xáo trộn ngẫu nhiên cho học sinh làm bài
 * Luôn gắn kèm mã ánh xạ đáp án gốc (originalKey) để khi chấm điểm và lưu vào Google Sheet
 * toàn bộ kết quả luôn được quy đổi chuẩn xác về Đề Gốc của giáo viên.
 *
 * @param masterQuestions Danh sách câu hỏi đề gốc
 * @param shuffleQuestions Có xáo trộn thứ tự các câu hỏi không
 * @param shuffleOptions Có xáo trộn thứ tự các đáp án A, B, C, D của câu trắc nghiệm không
 */
export function generateShuffledExam(
  masterQuestions: Question[],
  shuffleQuestions = true,
  shuffleOptions = true
): ShuffledQuestion[] {
  if (!masterQuestions || masterQuestions.length === 0) return [];

  // 1. Hoán vị các câu hỏi trắc nghiệm cùng loại, giữ nguyên vị trí câu tự luận
  let questionsToProcess: Question[] = [...masterQuestions];
  if (shuffleQuestions) {
    // Thu thập riêng từng loại câu hỏi trắc nghiệm và xáo trộn trong nhóm
    const mcQuestions = masterQuestions.filter((q) => q.type === 'Trắc nghiệm 1 đáp án');
    const tfQuestions = masterQuestions.filter((q) => q.type === 'Đúng / Sai');
    const shuffledMC = shuffleArray(mcQuestions);
    const shuffledTF = shuffleArray(tfQuestions);

    let mcIdx = 0;
    let tfIdx = 0;
    questionsToProcess = masterQuestions.map((q) => {
      if (q.type === 'Trắc nghiệm 1 đáp án') {
        return shuffledMC[mcIdx++];
      }
      if (q.type === 'Đúng / Sai') {
        return shuffledTF[tfIdx++];
      }
      return q; // Giữ nguyên câu tự luận ở đúng vị trí
    });
  }

  const displayOptionKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  // 2. Duyệt qua từng câu hỏi và xáo trộn đáp án trắc nghiệm nếu được bật
  return questionsToProcess.map((q, index) => {
    const displayOrderNumber = index + 1;

    // Câu tự luận: chỉ thay đổi số thứ tự hiển thị, không có phương án trắc nghiệm
    if (q.type === 'Tự luận') {
      return {
        ...q,
        displayOrderNumber,
      };
    }

    // Câu Đúng / Sai: Luôn cố định A: Đúng, B: Sai (chuẩn sư phạm, không xáo đảo vị trí Đúng/Sai để tránh nhầm lẫn)
    if (q.type === 'Đúng / Sai') {
      return {
        ...q,
        displayOrderNumber,
        shuffledOptions: [
          { key: 'A', originalKey: 'A', text: q.optionA || 'Đúng' },
          { key: 'B', originalKey: 'B', text: q.optionB || 'Sai' },
        ],
      };
    }

    // Câu trắc nghiệm: thu thập 4 đáp án từ đề gốc kèm nhãn gốc (A, B, C, D)
    const rawOptions: { originalKey: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
      { originalKey: 'A', text: q.optionA || '' },
      { originalKey: 'B', text: q.optionB || '' },
      { originalKey: 'C', text: q.optionC || '' },
      { originalKey: 'D', text: q.optionD || '' },
    ];

    // Xáo trộn vị trí của 4 đáp án nếu được bật
    const processedOptions = shuffleOptions ? shuffleArray(rawOptions) : rawOptions;

    // Gán lại nhãn hiển thị mới A, B, C, D cho học sinh bấm chọn
    const shuffledOptions: ShuffledOption[] = processedOptions.map((opt, optIdx) => ({
      key: displayOptionKeys[optIdx] || 'A',
      originalKey: opt.originalKey,
      text: opt.text,
    }));

    return {
      ...q,
      displayOrderNumber,
      shuffledOptions,
    };
  });
}
