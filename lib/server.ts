import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { seedCourses, seedSkills, seedResources, seedSettings } from './seed';
import type { Course, Skill, Resource, Settings } from './types';
export const config = () => env as unknown as Record<string, string>;
export const db = () => env.DB;
export async function sha(v: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
export type User = {
  id: string;
  name: string;
  phone: string;
  goal?: string;
  admin: boolean;
};
export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get('academy_session')?.value;
  if (token) {
    const row = await db()
      .prepare(
        'SELECT students.id,students.name,students.phone,students.goal FROM sessions JOIN students ON students.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires>?',
      )
      .bind(await sha(token), Date.now())
      .first<{ id: string; name: string; phone: string }>();
    if (row) return { ...row, admin: false };
  }
  const owner = await getChatGPTUser();
  const email = config().ADMIN_EMAIL;
  if (owner && email && owner.email.toLowerCase() === email.toLowerCase())
    return {
      id: 'owner:' + owner.userId,
      name: owner.displayName,
      phone: '',
      admin: true,
    };
  return null;
}
export async function readContent<T>(key: string, fallback: T) {
  const r = await db()
    .prepare('SELECT value,revision FROM content WHERE key=?')
    .bind(key)
    .first<{ value: string; revision: number }>();
  return {
    value: r ? (JSON.parse(r.value) as T) : fallback,
    revision: r?.revision || 0,
  };
}
export async function catalog() {
  const [courses, skills, resources, settings] = await Promise.all([
    readContent<Course[]>('courses', seedCourses),
    readContent<Skill[]>('skills', seedSkills),
    readContent<Resource[]>('resources', seedResources),
    readContent<Settings>('settings', seedSettings),
  ]);
  return {
    courses: courses.value,
    skills: skills.value,
    resources: resources.value,
    settings: settings.value,
  };
}
export async function throttle(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const row = await db()
    .prepare(
      'INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count',
    )
    .bind(key, now + windowMs, now, now)
    .first<{ count: number }>();
  if (!row || row.count > max) throw new Error('操作较频繁，请稍后再试。');
}
export function smsReady() {
  const c = config();
  return Boolean(
    c.ALIYUN_ACCESS_KEY_ID &&
    c.ALIYUN_ACCESS_KEY_SECRET &&
    c.SMS_SIGN_NAME &&
    c.SMS_TEMPLATE_CODE &&
    c.OTP_SECRET,
  );
}
export function aiReady() {
  return Boolean(config().AI_API_KEY && config().AI_MODEL);
}
const percent = (v: string) =>
  encodeURIComponent(v).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
export async function sendSms(phone: string, code: string) {
  const e = config();
  const p: Record<string, string> = {
    AccessKeyId: e.ALIYUN_ACCESS_KEY_ID,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: 'cn-hangzhou',
    SignName: e.SMS_SIGN_NAME,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: e.SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  };
  const query = Object.keys(p)
    .sort()
    .map((k) => percent(k) + '=' + percent(p[k]))
    .join('&');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(e.ALIYUN_ACCESS_KEY_SECRET + '&'),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode('POST&%2F&' + percent(query)),
  );
  const signed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const response = await fetch('https://dysmsapi.aliyuncs.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'Signature=' + percent(signed) + '&' + query,
    signal: AbortSignal.timeout(12000),
  });
  const result = (await response.json()) as { Code: string };
  if (!response.ok || result.Code !== 'OK')
    throw new Error('短信发送失败，请稍后再试或联系老师。');
}
export function normalizeCatalog(input: unknown): {
  courses: Course[];
  skills: Skill[];
  resources: Resource[];
  settings: Settings;
} {
  const d = input as ReturnType<typeof normalizeCatalog>;
  if (
    !d ||
    !Array.isArray(d.courses) ||
    !Array.isArray(d.skills) ||
    !Array.isArray(d.resources) ||
    !d.settings
  )
    throw new Error('内容格式不完整');
  if (
    d.courses.length > 100 ||
    d.skills.length > 100 ||
    d.resources.length > 200
  )
    throw new Error('单次内容数量超出限制');
  const str = (v: unknown, max = 20000) =>
    typeof v === 'string' && v.length <= max;
  const ids = new Set<string>();
  for (const c of d.courses) {
    if (
      !str(c.id, 80) ||
      !/^[-a-z0-9]+$/.test(c.id) ||
      ids.has(c.id) ||
      !str(c.title, 120) ||
      !c.title.trim() ||
      !str(c.description, 1000) ||
      !str(c.category, 30) ||
      !str(c.color, 30) ||
      !str(c.icon, 20) ||
      !str(c.level, 30) ||
      typeof c.published !== 'boolean' ||
      !Array.isArray(c.lessons) ||
      !c.lessons.length ||
      c.lessons.length > 100
    )
      throw new Error('课程字段不完整或标识重复');
    ids.add(c.id);
    for (const l of c.lessons) {
      if (
        !str(l.id, 80) ||
        !/^[-a-z0-9]+$/.test(l.id) ||
        ids.has(l.id) ||
        !str(l.title, 120) ||
        !l.title.trim() ||
        !str(l.content) ||
        !str(l.task) ||
        !str(l.hint) ||
        !str(l.reference) ||
        !str(l.question, 1000) ||
        !str(l.skillId, 80) ||
        !Array.isArray(l.options) ||
        l.options.length < 2 ||
        l.options.length > 8 ||
        !l.options.every((x) => str(x, 500)) ||
        !Number.isInteger(l.answer) ||
        l.answer < 0 ||
        l.answer >= l.options.length ||
        !Array.isArray(l.rubric) ||
        !Array.isArray(l.keywords) ||
        l.rubric.length !== l.keywords.length ||
        !l.rubric.length ||
        l.rubric.length > 15 ||
        !l.rubric.every((x) => str(x, 500)) ||
        !l.keywords.every((x) => str(x, 200)) ||
        !Number.isFinite(l.minutes) ||
        l.minutes <= 0
      )
        throw new Error('课时内容、题目选项或评分标准不完整');
      if (
        l.videoUrl &&
        (!str(l.videoUrl, 2000) || !l.videoUrl.startsWith('https://'))
      )
        throw new Error('视频链接必须使用 HTTPS');
      ids.add(l.id);
    }
  }
  const sids = new Set<string>();
  for (const s of d.skills) {
    if (
      !str(s.id, 80) ||
      !s.id ||
      sids.has(s.id) ||
      !str(s.name, 120) ||
      !str(s.description, 1000) ||
      !str(s.instructions) ||
      typeof s.enabled !== 'boolean'
    )
      throw new Error('Skill 字段不完整');
    sids.add(s.id);
  }
  const rids = new Set<string>();
  for (const r of d.resources) {
    if (
      !str(r.id, 80) ||
      rids.has(r.id) ||
      !str(r.name, 120) ||
      !str(r.category, 30) ||
      !str(r.description, 1000) ||
      !str(r.url, 2000)
    )
      throw new Error('资源字段不完整');
    const u = new URL(r.url);
    if (u.protocol !== 'https:') throw new Error('资源链接必须使用 HTTPS');
    rids.add(r.id);
  }
  if (
    !str(d.settings.name, 60) ||
    !d.settings.name.trim() ||
    !str(d.settings.tagline, 200) ||
    !str(d.settings.about)
  )
    throw new Error('学堂介绍不完整');
  return d;
}
