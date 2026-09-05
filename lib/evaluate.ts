export function evaluate(
  answer: string,
  choice: number,
  lesson: { answer: number; rubric: string[]; keywords: string[] },
) {
  const checks = lesson.rubric.map((label, i) => ({
    label,
    met: (lesson.keywords[i] || '')
      .split('|')
      .filter(Boolean)
      .some((k) => answer.toLowerCase().includes(k.toLowerCase())),
  }));
  const quizCorrect = choice === lesson.answer;
  return {
    checks,
    quizCorrect,
    passed: false,
    reviewStatus: '待老师复核',
    message: quizCorrect
      ? '概念题回答正确。下方为关键词预检，不能代替作品质量评定；作业已进入老师复核。'
      : '概念题还需再想一想。作品已保存，可参考下方提示修改后重交。',
    type: '规则预检',
  };
}
export function safeReturnTo(v: string) {
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')
    ? v
    : '/me';
}
export function validPhone(v: string) {
  return /^1[3-9]\d{9}$/.test(v);
}
