import { Question, SkillStat, SubmissionRecord } from '../types';

export function analyzeStudentSkills(
  submission: SubmissionRecord,
  questions: Question[]
): {
  skills: SkillStat[];
  weakAreas: string[];
  strongAreas: string[];
  personalizedFeedback: string;
} {
  const categoryMap: Record<
    string,
    { earned: number; total: number; count: number; correctCount: number }
  > = {};

  // Build category totals
  questions.forEach(q => {
    const cat = q.category || (q.type === 'Tự luận' ? 'Tự luận & Tính toán' : 'Trắc nghiệm cơ bản');
    if (!categoryMap[cat]) {
      categoryMap[cat] = { earned: 0, total: 0, count: 0, correctCount: 0 };
    }
    categoryMap[cat].total += q.points;
    categoryMap[cat].count += 1;
  });

  // Calculate earned
  submission.questionResults.forEach(qr => {
    const cat = qr.category || 'Trắc nghiệm cơ bản';
    if (categoryMap[cat]) {
      categoryMap[cat].earned += qr.earnedPoints;
      if (qr.isCorrect) {
        categoryMap[cat].correctCount += 1;
      }
    }
  });

  const skills: SkillStat[] = Object.keys(categoryMap).map(catName => {
    const data = categoryMap[catName];
    const percentage = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 100;

    let status: 'good' | 'average' | 'weak' = 'good';
    let recommendation = 'Đã nắm rất vững kiến thức phần này!';

    if (percentage < 60) {
      status = 'weak';
      recommendation = 'Cần xem lại lý thuyết trong SGK và làm thêm 5 bài tập cùng dạng.';
    } else if (percentage < 85) {
      status = 'average';
      recommendation = 'Đã hiểu cơ bản, cần chú ý đọc kỹ các câu hỏi gài bẫy và luyện tính toán nhanh.';
    }

    return {
      name: catName,
      earnedPoints: Number(data.earned.toFixed(1)),
      totalPoints: Number(data.total.toFixed(1)),
      percentage,
      status,
      recommendation,
    };
  });

  const weakAreas = skills.filter(s => s.status === 'weak').map(s => s.name);
  const strongAreas = skills.filter(s => s.status === 'good').map(s => s.name);

  // Sinh nhận xét tổng quan
  let personalizedFeedback = '';
  if (submission.totalScore >= 9.0) {
    personalizedFeedback = `Xuất sắc! Em đã nắm rất chắc kiến thức của đợt kiểm tra này với điểm số ${submission.totalScore}/${submission.maxScore}. Hãy tiếp tục phát huy tinh thần tự giác học tập nhé!`;
  } else if (submission.totalScore >= 7.0) {
    personalizedFeedback = `Khá tốt! Em đạt ${submission.totalScore}/${submission.maxScore} điểm. Đã hoàn thành tốt phần trắc nghiệm nhận biết, nhưng cần rèn luyện thêm ở ${weakAreas.length > 0 ? weakAreas.join(', ') : 'các câu vận dụng nâng cao'}.`;
  } else if (submission.totalScore >= 5.0) {
    personalizedFeedback = `Đạt yêu cầu (${submission.totalScore}/${submission.maxScore} điểm). Em cần dành thêm thời gian ôn tập lại các phần kiến thức còn hổng, đặc biệt là ${weakAreas.join(', ') || 'các câu hỏi tính toán'}.`;
  } else {
    personalizedFeedback = `Cần cố gắng hơn! Điểm số ${submission.totalScore}/${submission.maxScore} cho thấy em cần xem lại bài giảng và nhờ thầy/cô hoặc bạn bè hướng dẫn lại các chủ đề: ${weakAreas.join(', ') || 'toàn bộ kiến thức bài học'}.`;
  }

  return {
    skills,
    weakAreas,
    strongAreas,
    personalizedFeedback,
  };
}

export interface RoadmapStep {
  stepNumber: number;
  title: string;
  duration: string;
  badge: string;
  description: string;
  items: string[];
}

export function generatePersonalizedRoadmap(
  submission: SubmissionRecord,
  weakAreas: string[]
): RoadmapStep[] {
  const incorrectQuestions = submission.questionResults.filter(q => !q.isCorrect);

  const step1Items: string[] = [];
  if (incorrectQuestions.length > 0) {
    incorrectQuestions.slice(0, 3).forEach(iq => {
      step1Items.push(`Đọc lại kiến thức Câu ${iq.orderNumber}: Chủ đề "${iq.category}" (Đáp án đúng là: ${iq.correctAnswer})`);
    });
  } else {
    step1Items.push('Ôn lại tóm tắt nội dung bài học trong SGK và ghi chú của giáo viên');
    step1Items.push('Hệ thống hóa các định nghĩa, thuật ngữ cốt lõi qua sơ đồ tư duy');
  }

  return [
    {
      stepNumber: 1,
      title: 'Khắc phục & Lấp lỗ hổng kiến thức',
      duration: 'Ngày 1 - 2',
      badge: 'Cốt lõi',
      description: 'Tập trung xem lại các câu trả lời chưa chính xác và đọc lại phần lý thuyết liên quan.',
      items: step1Items,
    },
    {
      stepNumber: 2,
      title: 'Luyện tập chuyên đề cùng dạng',
      duration: 'Ngày 3 - 5',
      badge: 'Thực hành',
      description: 'Làm lại các bài tập tương tự để biến kiến thức lý thuyết thành phản xạ tự nhiên.',
      items: [
        weakAreas.includes('Tự luận & Tính toán')
          ? 'Luyện giải 5 bài tập đổi đơn vị đo lường (Bit, Byte, KB, MB, GB)'
          : 'Làm thêm 10 câu trắc nghiệm dạng nhận biết và thông hiểu',
        'Tự tóm tắt bài học bằng một sơ đồ tư duy nhỏ trên giấy hoặc ứng dụng Mindmap',
        'Bấm giờ tự làm lại bài thi này một lần nữa để nâng cao tốc độ phản xạ',
      ],
    },
    {
      stepNumber: 3,
      title: 'Tự tin bứt phá điểm tối đa (10/10)',
      duration: 'Tuần tiếp theo',
      badge: 'Mục tiêu điểm 10',
      description: 'Tham gia thi thử các đề kiểm tra định kỳ mở rộng và trao đổi với bạn bè.',
      items: [
        'Tham gia thảo luận nhóm và giải thích lại bài cho các bạn cùng lớp để ghi nhớ sâu',
        'Thử sức với các câu hỏi tình huống thực tế và câu hỏi mở',
        'Sẵn sàng cho đợt Kiểm Tra Thường Xuyên tiếp theo với sự tự tin cao nhất!',
      ],
    },
  ];
}
