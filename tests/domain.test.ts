import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, safeReturnTo, validPhone } from '../lib/evaluate.ts';
import { seedCourses } from '../lib/seed.ts';
test('phone validation rejects malformed numbers', () => {
  assert.equal(validPhone('13800138000'), true);
  for (const p of ['123', '+8613800138000', '13800138000x', '00000000000'])
    assert.equal(validPhone(p), false);
});
test('return URL cannot escape the current site', () => {
  for (const p of ['//evil.test', 'https://evil.test', '/\\evil.test'])
    assert.equal(safeReturnTo(p), '/me');
  assert.equal(safeReturnTo('/learn/prompt-1'), '/learn/prompt-1');
});
test('keyword presence never awards practical mastery', () => {
  const l = seedCourses[0].lessons[0];
  const r = evaluate(l.keywords.join(' '), l.answer, l);
  assert.ok(r.checks.every((x) => x.met));
  assert.equal(r.quizCorrect, true);
  assert.equal(r.passed, false);
  assert.equal(r.reviewStatus, '待老师复核');
});
test('course tasks have independent answer keys', () => {
  const prompt = seedCourses[0].lessons[0],
    office = seedCourses[1].lessons[0];
  assert.equal(evaluate('测试', 1, prompt).quizCorrect, true);
  assert.equal(evaluate('测试', 1, office).quizCorrect, false);
  assert.notEqual(prompt.task, office.task);
});
test('lesson identifiers are globally unique', () => {
  const ids = seedCourses.flatMap((c) => c.lessons.map((l) => l.id));
  assert.equal(new Set(ids).size, ids.length);
});
