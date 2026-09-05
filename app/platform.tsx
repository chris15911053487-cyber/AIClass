'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Sparkles,
  Send,
  Plus,
  Save,
  Settings as SettingsIcon,
  ExternalLink,
  Clock,
  GraduationCap,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Course, Lesson, Skill, Resource, Settings } from '@/lib/types';
import { safeReturnTo } from '@/lib/evaluate';
type Data = {
  courses: Course[];
  skills: Skill[];
  resources: Resource[];
  settings: Settings;
  smsReady: boolean;
  aiReady: boolean;
};
type Feedback = {
  checks: { label: string; met: boolean }[];
  quizCorrect: boolean;
  passed: boolean;
  reviewStatus: string;
  message: string;
  teacherNote?: string;
};
type Submission = {
  id: string;
  course_id: string;
  lesson_id: string;
  version: number;
  answer: string;
  feedback: string;
  created_at: number;
  snapshot?: string;
};
type Me = {
  user: {
    id: string;
    name: string;
    phone: string;
    goal?: string;
    admin: boolean;
  } | null;
  progress: {
    course_id: string;
    lesson_id: string;
    read: number;
    passed: number;
  }[];
  submissions: Submission[];
  chats: { role: string; text: string; lesson_id: string }[];
};
type Payload = Data &
  Me & {
    error: string;
    revision: number;
    draft: Data | null;
    live: Data;
    feedback: Feedback;
    reference: string;
    answer: string;
    message: string;
  };
async function readResponse(r: Response) {
  return (await r.json()) as Payload;
}
export async function api(op: string, body: Record<string, unknown> = {}) {
  const r = await fetch('/api/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, ...body }),
  });
  const d = await readResponse(r);
  if (!r.ok) throw new Error(d.error || '操作未完成');
  return d;
}
function Header({ data, me, route }: { data?: Data; me?: Me; route: string }) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brandmark">
          a<span>i</span>
        </span>
        <span>
          {data?.settings.name || 'AI 实践学堂'}
          <small>LEARN. MAKE. GROW.</small>
        </span>
      </a>
      <nav>
        {[
          ['/', '探索首页'],
          ['/courses', '学习课程'],
          ['/resources', '工具与 Skills'],
          ['/about', '关于学堂'],
        ].map(([href, title]) => (
          <a key={href} href={href} className={route === href ? 'active' : ''}>
            {title}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <a href="/assistant" className="assistant-link">
          <Sparkles size={17} /> AI 助教
        </a>
        <a href={me?.user ? '/me' : '/login'} className="button dark small">
          {me?.user ? '我的学习' : '登录 / 注册'} <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}
function FeedbackView({ f }: { f: Feedback }) {
  return (
    <div className="notice">
      <b>{f.reviewStatus}</b>
      <p>{f.message}</p>
      <ul>
        {f.checks.map((x, i) => (
          <li key={i}>
            {x.met ? '✓ 已识别相关表达' : '○ 请自行核对'}：{x.label}
          </li>
        ))}
      </ul>
      {f.teacherNote && (
        <p>
          <b>老师反馈：</b>
          {f.teacherNote}
        </p>
      )}
    </div>
  );
}
function Cards({ courses }: { courses: Course[] }) {
  return (
    <div className="course-grid">
      {courses.map((c, i) => (
        <a className="course-card" href={'/courses/' + c.id} key={c.id}>
          <div className={'course-cover ' + c.color}>
            <span className="cover-label">
              AI IN PRACTICE
              <br />
              <b>{String(i + 1).padStart(2, '0')}</b>
            </span>
            <span className="cover-symbol">{c.icon}</span>
            <span className="cover-bottom">
              {c.category} / {c.level}
              <ArrowUpRight size={17} />
            </span>
          </div>
          <div className="card-content">
            <div className="card-tags">
              <span>{c.category}</span>
              <span>附随堂练习</span>
            </div>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <div className="card-footer">
              <span>
                <BookOpen size={14} />
                {c.lessons.length} 课时 ·{' '}
                {c.lessons.reduce((n, l) => n + l.minutes, 0)} 分钟
              </span>
              <span>
                开始学习 <ArrowUpRight size={15} />
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
export default function Platform({
  route,
  id,
}: {
  route: string;
  id?: string;
}) {
  const [data, setData] = useState<Data>();
  const [me, setMe] = useState<Me>();
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/platform?op=me');
      const d = await readResponse(r);
      if (!r.ok) throw new Error(d.error);
      setMe(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    fetch('/api/platform')
      .then(async (r) => {
        const d = await readResponse(r);
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
    reload();
  }, [reload]);
  useEffect(() => {
    const ctx = (
      document as unknown as {
        modelContext?: {
          registerTool: (t: unknown, o: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx || !data) return;
    const ctrl = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: 'list_learning_courses',
          description: '列出当前已发布的课程和独立学习链接。',
          inputSchema: {
            type: 'object',
            properties: { category: { type: 'string' } },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: (input: unknown) => {
            const x = input as { category?: string };
            if (
              !x ||
              typeof x !== 'object' ||
              (x.category !== undefined && typeof x.category !== 'string')
            )
              throw new Error('category 必须为字符串');
            return data.courses
              .filter((c) => !x.category || c.category === x.category)
              .map((c) => ({
                title: c.title,
                category: c.category,
                url: '/courses/' + c.id,
              }));
          },
        },
        { signal: ctrl.signal },
      ),
    ).catch(() => {});
    return () => ctrl.abort();
  }, [data]);
  let content;
  if (!data)
    content = (
      <div className="empty">
        <BookOpen size={30} style={{ margin: 'auto' }} />
        <p>{error || '正在打开你的学习空间…'}</p>
        {error && (
          <button className="button" onClick={() => location.reload()}>
            重新加载
          </button>
        )}
      </div>
    );
  else if (route === '/courses' && !id) content = <CourseList data={data} />;
  else if (route === '/courses' && id) {
    const c = data.courses.find((x) => x.id === id);
    content = c ? <CourseDetail c={c} /> : <Empty title="课程不存在或已下架" />;
  } else if (route === '/learn') {
    const c = data.courses.find((x) => x.lessons.some((l) => l.id === id));
    const l = c?.lessons.find((x) => x.id === id);
    content =
      c && l ? (
        <Learn key={id} c={c} l={l} data={data} me={me} reload={reload} />
      ) : (
        <Empty title="课时不存在或已下架" />
      );
  } else if (route === '/resources') content = <Resources data={data} />;
  else if (route === '/about')
    content = (
      <>
        <Heading eyebrow="ABOUT THE ACADEMY" title="让学习，真正发生。" />
        <div className="panel narrow">
          <h2>{data.settings.name}</h2>
          <p className="reading" style={{ marginTop: 20 }}>
            {data.settings.about}
          </p>
        </div>
      </>
    );
  else if (route === '/login') content = <Login ready={data.smsReady} />;
  else if (route === '/me')
    content = <MyLearning data={data} me={me} reload={reload} />;
  else if (route === '/assistant')
    content = (
      <>
        <Heading
          eyebrow="YOUR LEARNING COMPANION"
          title="有问题，一起拆解。"
          subtitle="说说你想学习什么，或正在遇到的问题。"
        />
        <div className="panel narrow">
          <Assistant data={data} me={me} />
        </div>
      </>
    );
  else if (route === '/admin')
    content = <Admin data={data} me={me} onPublish={setData} />;
  return (
    <>
      <Header data={data} me={me} route={route} />
      <main className={'wrap ' + (route === '/learn' ? 'wide' : '')}>
        {content}
      </main>
      <footer>
        <span>{data?.settings.name || 'AI 实践学堂'} · 从理解到创造</span>
        <a href="/admin">
          内容管理 <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
function Empty({ title }: { title: string }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>从一堂感兴趣的课程开始。</p>
      <a className="button dark" href="/courses">
        探索课程 <ArrowRight size={17} />
      </a>
    </div>
  );
}
function CourseList({ data }: { data: Data }) {
  const [cat, setCat] = useState('全部');
  const [q, setQ] = useState('');
  useEffect(() => {
    setCat(new URLSearchParams(location.search).get('category') || '全部');
  }, []);
  const cats = ['全部', ...new Set(data.courses.map((c) => c.category))];
  const filtered = data.courses.filter(
    (c) =>
      (cat === '全部' || c.category === cat) &&
      (c.title + c.description).includes(q),
  );
  return (
    <>
      <Heading
        eyebrow="LEARN SOMETHING. MAKE SOMETHING."
        title="选择一个方向，开始实践。"
        subtitle="从入门到进阶，每一堂课都带你完成一个真实任务。"
      />
      <div className="row spaced">
        <div className="filter-row">
          {cats.map((x) => (
            <button
              key={x}
              className={'chip ' + (cat === x ? 'selected' : '')}
              onClick={() => setCat(x)}
            >
              {x === '全部' ? '全部课程' : x}
            </button>
          ))}
        </div>
        <label style={{ width: 230, marginBottom: 25 }}>
          <span className="sr-only">搜索课程</span>
          <input
            className="search-input"
            placeholder="搜索你想学的内容"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      {filtered.length ? (
        <Cards courses={filtered} />
      ) : (
        <Empty title="没有找到相关课程" />
      )}
      <div className="notice" style={{ margin: '30px 0' }}>
        当前课程为可编辑的图文示范课程。视频、短视频制作等方向可由老师在后台继续增加。
      </div>
    </>
  );
}
function CourseDetail({ c }: { c: Course }) {
  return (
    <>
      <div className="page-heading">
        <a className="back" href="/courses">
          <ArrowLeft size={15} /> 全部课程
        </a>
        <h1>{c.title}</h1>
        <p>{c.description}</p>
        <div className="row" style={{ marginTop: 20 }}>
          <span className="chip">{c.level}</span>
          <span className="muted">
            {c.lessons.length} 课时 ·{' '}
            {c.lessons.reduce((a, l) => a + l.minutes, 0)} 分钟 · 随堂实战
          </span>
        </div>
      </div>
      <div className="content-two">
        <section className="panel">
          <h2 style={{ marginBottom: 25 }}>课程目录</h2>
          <div className="lesson-list">
            {c.lessons.map((l, i) => (
              <a href={'/learn/' + l.id} key={l.id}>
                <b className="muted">{String(i + 1).padStart(2, '0')}</b>
                <span>
                  {l.title}
                  <small>图文讲解 · 实战任务 · {l.minutes} 分钟</small>
                </span>
                <ChevronRight size={18} />
              </a>
            ))}
          </div>
        </section>
        <aside className="panel">
          <span className="task-label">LEARNING BY DOING</span>
          <h2>学完，还要亲手做到。</h2>
          <p className="reading" style={{ margin: '20px 0' }}>
            这门课包含独立任务、概念测验和作品反馈。你可以多次修改提交，在自己的节奏里逐步掌握。
          </p>
          <a href={'/learn/' + c.lessons[0].id} className="button dark">
            开始第一课 <ArrowRight size={17} />
          </a>
        </aside>
      </div>
    </>
  );
}
function Learn({
  c,
  l,
  data,
  me,
  reload,
}: {
  c: Course;
  l: Lesson;
  data: Data;
  me?: Me;
  reload: () => Promise<void>;
}) {
  const [tab, setTab] = useState('learn');
  const [answer, setAnswer] = useState('');
  const [choice, setChoice] = useState('');
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [feedback, setFeedback] = useState<Feedback>();
  const [reference, setReference] = useState('');
  const progress = me?.progress.find((x) => x.lesson_id === l.id);
  const prior = me?.submissions.find((s) => s.lesson_id === l.id);
  async function submit() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api('submit', {
        lessonId: l.id,
        answer,
        choice: Number(choice),
      });
      setFeedback(r.feedback);
      setReference(r.reference);
      await reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div style={{ paddingTop: 25 }}>
        <a className="back" href={'/courses/' + c.id}>
          <ArrowLeft size={15} />
          {c.title}
        </a>
      </div>
      <div className="lesson-layout">
        <aside>
          <h3>课程目录</h3>
          <div className="lesson-nav">
            {c.lessons.map((x, i) => (
              <a
                key={x.id}
                className={x.id === l.id ? 'active' : ''}
                href={'/learn/' + x.id}
              >
                {String(i + 1).padStart(2, '0')}　{x.title}
              </a>
            ))}
          </div>
          <div className="notice">
            学习和实战分别记录。完成练习后，记得查看反馈。
          </div>
        </aside>
        <section>
          <div className="panel">
            <span className="task-label">
              {l.minutes} 分钟 ·{' '}
              {progress?.passed
                ? '实战已达标'
                : progress?.read
                  ? '已学完'
                  : '正在学习'}
            </span>
            <h1>{l.title}</h1>
            <Tabs
              className="tabs-wide"
              value={tab}
              onValueChange={(v) => setTab(String(v))}
            >
              <TabsList variant="line">
                <TabsTrigger value="learn">课程讲解</TabsTrigger>
                <TabsTrigger value="practice">随堂实战</TabsTrigger>
                <TabsTrigger value="history">提交记录</TabsTrigger>
              </TabsList>
              <TabsContent value="learn">
                {l.videoUrl && (
                  <video
                    controls
                    preload="metadata"
                    src={l.videoUrl}
                    style={{ width: '100%', marginBottom: 20 }}
                  />
                )}
                <div className="reading">{l.content}</div>
                <div className="row" style={{ marginTop: 28 }}>
                  <button
                    className="button dark"
                    onClick={async () => {
                      if (me?.user) {
                        try {
                          await api('read', { lessonId: l.id });
                          await reload();
                        } catch (e) {
                          setMsg((e as Error).message);
                        }
                      }
                      setTab('practice');
                    }}
                  >
                    我学会了，开始练习 <ArrowRight size={17} />
                  </button>
                </div>
              </TabsContent>
              <TabsContent value="practice">
                <h3>你的实战任务</h3>
                <p className="reading">{l.task}</p>
                <div className="notice">
                  <b>评价标准</b>
                  <ul>
                    {l.rubric.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <button className="text-link" onClick={() => setHint(!hint)}>
                  <Sparkles size={16} />
                  {hint ? '收起提示' : '卡住了？给我一点提示'}
                </button>
                {hint && <div className="message">{l.hint}</div>}
                <fieldset style={{ marginTop: 25 }}>
                  <legend style={{ fontWeight: 600, marginBottom: 12 }}>
                    {l.question}
                  </legend>
                  <RadioGroup
                    value={choice}
                    onValueChange={(v) => setChoice(String(v))}
                  >
                    {l.options.map((o, i) => (
                      <label className="choice row" key={i}>
                        <RadioGroupItem value={String(i)} aria-label={o} />
                        {o}
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
                <label className="field">
                  提交你的实操作品
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={12000}
                    placeholder="在这里写下你的提示词、文案或任务成果。至少 20 字。"
                  />
                </label>
                {!me?.user ? (
                  <a
                    className="button dark"
                    href={
                      '/login?returnTo=' + encodeURIComponent('/learn/' + l.id)
                    }
                  >
                    登录后提交并保存 <Lock size={15} />
                  </a>
                ) : (
                  <button
                    className="button dark"
                    disabled={
                      busy || choice === '' || answer.trim().length < 20
                    }
                    onClick={submit}
                  >
                    {busy ? '正在保存…' : '提交练习，获取反馈'}
                    <ArrowRight size={17} />
                  </button>
                )}
                <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                  概念题自动检查；作品提供规则预检，最终达标由老师复核。
                </p>
                {feedback && <FeedbackView f={feedback} />}{' '}
                {reference && (
                  <details style={{ marginTop: 20 }}>
                    <summary>查看参考思路</summary>
                    <p className="reading">{reference}</p>
                  </details>
                )}
              </TabsContent>
              <TabsContent value="history">
                {me?.submissions
                  .filter((s) => s.lesson_id === l.id)
                  .map((s) => (
                    <div className="panel" key={s.id}>
                      <small className="muted">
                        {new Date(s.created_at).toLocaleString('zh-CN')} ·
                        课程版本 {s.version}
                      </small>
                      <p className="reading">{s.answer}</p>
                      <FeedbackView f={JSON.parse(s.feedback)} />
                    </div>
                  ))}
                {!prior && (
                  <p className="muted">
                    还没有提交记录。完成随堂实战后，你的作品会保存在这里。
                  </p>
                )}
              </TabsContent>
            </Tabs>
            {msg && (
              <div className="notice error" role="alert">
                {msg}
              </div>
            )}
          </div>
        </section>
        <aside className="lesson-assistant">
          <div className="panel">
            <h3 className="row">
              <Sparkles size={18} /> 你的 AI 助教
            </h3>
            <Assistant key={l.id} data={data} me={me} lesson={l} />
          </div>
        </aside>
      </div>
    </>
  );
}
function Assistant({
  data,
  me,
  lesson,
}: {
  data: Data;
  me?: Me;
  lesson?: Lesson;
}) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setMessages(
      me?.chats.filter((c) => c.lesson_id === (lesson?.id || 'general')) || [],
    );
  }, [me, lesson?.id]);
  async function send() {
    setBusy(true);
    setError('');
    try {
      const r = await api('chat', { message: question, lessonId: lesson?.id });
      setMessages((x) => [
        ...x,
        { role: 'user', text: question },
        { role: 'assistant', text: r.answer },
      ]);
      setQuestion('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.8 }}>
        {lesson
          ? '围绕这节课，把不明白的地方说出来。'
          : '告诉我你的基础和目标，从适合你的课程开始。'}
      </p>
      {!data.aiReady && (
        <div className="notice">
          AI 自由问答待开通。
          {lesson
            ? '先试试下方的课时提示。'
            : '你可以先浏览课程，选择想完成的任务。'}
        </div>
      )}
      {lesson && !data.aiReady && (
        <div className="message">
          <b>本课提示</b>
          <p>{lesson.hint}</p>
        </div>
      )}
      <div aria-live="polite">
        {messages.map((m, i) => (
          <div className={'message ' + m.role} key={i}>
            <small className="muted">
              {m.role === 'user' ? '你' : 'AI 助教'}
            </small>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <label className="field">
        你的问题
        <textarea
          style={{ minHeight: 95 }}
          value={question}
          maxLength={3000}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：这个步骤可以举个例子吗？"
        />
      </label>
      {!me?.user ? (
        <a href="/login" className="button">
          登录后提问 <Lock size={15} />
        </a>
      ) : (
        <button
          className="button dark"
          onClick={send}
          disabled={busy || !question.trim() || !data.aiReady}
        >
          {busy ? '思考中…' : '发送问题'}
          <Send size={15} />
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
function Resources({ data }: { data: Data }) {
  return (
    <>
      <Heading
        eyebrow="YOUR PRACTICE TOOLKIT"
        title="把好用的方法，留在手边。"
        subtitle="精选工具与可复用的 Skills，配合课程一起实践。"
      />
      <Tabs defaultValue="skills" className="tabs-wide">
        <TabsList variant="line">
          <TabsTrigger value="skills">Skills 技能库</TabsTrigger>
          <TabsTrigger value="tools">AI 工具导航</TabsTrigger>
        </TabsList>
        <TabsContent value="skills">
          <div className="course-grid">
            {data.skills.map((s) => (
              <div className="panel" key={s.id}>
                <Sparkles size={25} color="#3b7854" />
                <h3 style={{ margin: '18px 0 12px' }}>{s.name}</h3>
                <p className="reading" style={{ fontSize: 14 }}>
                  {s.description}
                </p>
                <p className="muted" style={{ fontSize: 12, margin: '16px 0' }}>
                  v{s.version} · 课程助教技能
                </p>
                <a
                  className="text-link"
                  href={
                    '/courses/' +
                    (data.courses.find((c) =>
                      c.lessons.some((l) => l.skillId === s.id),
                    )?.id || 'skills')
                  }
                >
                  去关联课程实践 <ArrowRight size={16} />
                </a>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="tools">
          {data.resources.length ? (
            <div className="course-grid">
              {data.resources.map((r) => (
                <a
                  className="panel"
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="row spaced">
                    <h3>{r.name}</h3>
                    <ExternalLink size={18} />
                  </div>
                  <p
                    className="reading"
                    style={{ fontSize: 14, marginTop: 15 }}
                  >
                    {r.description}
                  </p>
                  <span className="chip">{r.category}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>精选工具正在整理</h2>
              <p>老师可在后台添加实际使用过的工具和官网链接。</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
function Login({ ready }: { ready: boolean }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  async function send() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api('send-code', { phone });
      setMsg(r.message);
      setWait(60);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    setBusy(true);
    setMsg('');
    try {
      await api('verify-code', { phone, code });
      location.href = safeReturnTo(
        new URLSearchParams(location.search).get('returnTo') || '/me',
      );
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ maxWidth: 480, margin: '55px auto' }}>
      <div className="panel">
        <span className="eyebrow">WELCOME TO YOUR NEXT STEP</span>
        <h1 style={{ fontSize: 30 }}>开始你的 AI 学习之旅</h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.8 }}>
          使用手机号登录，首次验证后自动注册。学习进度和作品将保存在你的账号中。
        </p>
        {!ready && (
          <div className="notice">
            短信服务尚未开通，暂时无法注册或登录。公开课程仍可浏览，练习内容暂不能保存。
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <label className="field">
            中国大陆手机号
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={11}
              value={phone}
              placeholder="请输入 11 位手机号"
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="field">
            短信验证码
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6 位验证码"
              />
              <button
                type="button"
                className="button small"
                disabled={!ready || busy || wait > 0 || phone.length !== 11}
                onClick={send}
              >
                {wait ? wait + ' 秒后重发' : '获取验证码'}
              </button>
            </div>
          </label>
          <button
            className="button dark"
            style={{ width: '100%', marginTop: 10 }}
            disabled={
              !ready || busy || phone.length !== 11 || code.length !== 6
            }
            type="submit"
          >
            {busy ? '正在处理…' : '登录 / 注册'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p
          className="muted"
          style={{ fontSize: 12, lineHeight: 1.8, marginTop: 16 }}
        >
          手机号用于身份验证。作业、对话和学习记录仅供本人及教学管理使用。请勿提交敏感工作资料。
        </p>
        {msg && (
          <div className="notice" role="status">
            {msg}
          </div>
        )}
        <a className="text-link" style={{ marginTop: 22 }} href="/courses">
          先逛逛公开课程 <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}
function MyLearning({
  data,
  me,
  reload,
}: {
  data: Data;
  me?: Me;
  reload: () => Promise<void>;
}) {
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  useEffect(() => {
    if (me?.user) {
      setName(me.user.name);
      setGoal(me.user.goal || '');
    }
  }, [me?.user?.id]);
  if (!me?.user)
    return (
      <>
        <Heading eyebrow="MY LEARNING SPACE" title="每一步，都为你保存。" />
        <div className="empty">
          <Lock size={28} style={{ margin: 'auto' }} />
          <p>登录后查看课程进度、实操作品和老师反馈。</p>
          <a className="button dark" href="/login">
            手机号登录 / 注册
          </a>
        </div>
      </>
    );
  const ids = new Set(me.progress.map((p) => p.course_id));
  return (
    <>
      <Heading
        eyebrow="MY LEARNING SPACE"
        title={'你好，' + me.user.name}
        subtitle="继续上次的探索，让新知识变成你的能力。"
      />
      <div className="stats">
        {[
          [me.progress.filter((x) => x.read).length, '已学完课时'],
          [me.progress.filter((x) => x.passed).length, '实战已达标'],
          [me.submissions.length, '累计提交作品'],
        ].map(([n, t]) => (
          <div className="panel stat" key={t}>
            <strong>{n}</strong>
            <span className="muted">{t}</span>
          </div>
        ))}
      </div>
      <Tabs defaultValue="courses" className="tabs-wide">
        <TabsList variant="line">
          <TabsTrigger value="courses">我的课程</TabsTrigger>
          <TabsTrigger value="works">作业与反馈</TabsTrigger>
          <TabsTrigger value="profile">账号设置</TabsTrigger>
        </TabsList>
        <TabsContent value="courses">
          {ids.size ? (
            data.courses
              .filter((c) => ids.has(c.id))
              .map((c) => {
                const read = me.progress.filter(
                  (p) => p.course_id === c.id && p.read,
                ).length;
                return (
                  <div className="panel" key={c.id}>
                    <div className="row spaced">
                      <h3>{c.title}</h3>
                      <a
                        className="text-link"
                        href={
                          '/learn/' +
                          (
                            c.lessons.find(
                              (l) =>
                                !me.progress.some(
                                  (p) => p.lesson_id === l.id && p.read,
                                ),
                            ) || c.lessons[0]
                          ).id
                        }
                      >
                        继续学习 <ArrowRight size={16} />
                      </a>
                    </div>
                    <p className="muted" style={{ margin: '16px 0' }}>
                      已学 {read} / {c.lessons.length} 课时
                    </p>
                    <Progress
                      value={(read / c.lessons.length) * 100}
                      aria-label={c.title + '学习进度'}
                    />
                  </div>
                );
              })
          ) : (
            <Empty title="从你的第一堂课开始" />
          )}
        </TabsContent>
        <TabsContent value="works">
          {me.submissions.length ? (
            me.submissions.map((s) => (
              <div className="panel" key={s.id}>
                <a href={'/learn/' + s.lesson_id} className="text-link">
                  {data.courses
                    .flatMap((c) => c.lessons)
                    .find((l) => l.id === s.lesson_id)?.title || '历史课程作品'}
                  <ArrowUpRight size={16} />
                </a>
                <p className="reading">{s.answer}</p>
                <FeedbackView f={JSON.parse(s.feedback)} />
              </div>
            ))
          ) : (
            <Empty title="你的第一件作品，正在路上" />
          )}
        </TabsContent>
        <TabsContent value="profile">
          <div className="panel narrow">
            <p className="muted">
              {me.user.admin ? '当前为老师账号' : me.user.phone}
            </p>
            {!me.user.admin && (
              <>
                <label className="field">
                  昵称
                  <input
                    value={name}
                    maxLength={40}
                    placeholder={me.user.name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  学习目标
                  <textarea
                    value={goal}
                    maxLength={500}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </label>
                <button
                  className="button dark"
                  onClick={async () => {
                    try {
                      await api('profile', {
                        name: name || me.user?.name,
                        goal,
                      });
                      setMsg('资料已保存');
                      reload();
                    } catch (e) {
                      setMsg((e as Error).message);
                    }
                  }}
                >
                  保存资料
                </button>
              </>
            )}
            <div style={{ marginTop: 20 }}>
              {me.user.admin ? (
                <a
                  className="button"
                  target="_top"
                  href="/signout-with-chatgpt?return_to=/"
                >
                  退出老师账号
                </a>
              ) : (
                <button
                  className="button"
                  onClick={async () => {
                    await api('logout');
                    location.href = '/';
                  }}
                >
                  退出登录
                </button>
              )}
            </div>
            {msg && <div className="notice">{msg}</div>}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
function Admin({
  data,
  me,
  onPublish,
}: {
  data: Data;
  me?: Me;
  onPublish: (x: Data) => void;
}) {
  const [draft, setDraft] = useState<Data>(data);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(data.courses[0]?.id || '');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [reviews, setReviews] = useState<Submission[]>([]);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!me?.user?.admin) return;
    fetch('/api/platform?op=admin')
      .then(async (r) => {
        const d = await readResponse(r);
        if (!r.ok) throw new Error(d.error);
        setDraft({ ...data, ...(d.draft || d.live) });
        setRevision(d.revision);
        setReviews(d.submissions);
        setLoaded(true);
      })
      .catch((e) => setMsg(e.message));
  }, [me?.user?.admin]);
  const course = draft.courses.find((c) => c.id === selected);
  const lesson = course?.lessons[lessonIndex];
  function updateCourse(p: Partial<Course>) {
    setDraft((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.id === selected ? { ...c, ...p } : c)),
    }));
  }
  function updateLesson(p: Partial<Lesson>) {
    if (!course) return;
    updateCourse({
      lessons: course.lessons.map((l, i) =>
        i === lessonIndex ? { ...l, ...p } : l,
      ),
    });
  }
  function addLesson() {
    if (!course) return;
    const l: Lesson = {
      id: 'lesson-' + crypto.randomUUID().slice(0, 8),
      title: '新课时',
      minutes: 15,
      content: '在这里编写课程讲解。',
      task: '请在这里填写实战任务。',
      hint: '请在这里填写第一步提示。',
      question: '请在这里填写概念题。',
      options: ['选项一', '选项二'],
      answer: 0,
      rubric: ['请填写评价标准'],
      keywords: ['关键词'],
      reference: '请填写参考思路。',
      skillId: draft.skills[0]?.id || '',
    };
    updateCourse({ lessons: [...course.lessons, l] });
    setLessonIndex(course.lessons.length);
  }
  async function save(publish: boolean) {
    setBusy(true);
    setMsg('');
    try {
      const r = await api(publish ? 'publish' : 'save-draft', {
        data: {
          courses: draft.courses,
          skills: draft.skills,
          resources: draft.resources,
          settings: draft.settings,
        },
        revision,
      });
      setRevision(r.revision);
      setMsg(
        publish
          ? '已发布，课程和资源页面会显示最新内容。'
          : '草稿已保存，学员看到的内容没有变化。',
      );
      if (publish) {
        const r2 = await fetch('/api/platform');
        const d = await readResponse(r2);
        if (r2.ok) onPublish(d);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!me?.user?.admin)
    return (
      <>
        <Heading
          eyebrow="CONTENT STUDIO"
          title="学堂内容工作室"
          subtitle="在这里更新课程、设计练习、管理 Skills，并查看学员作业。"
        />
        <div className="empty">
          <Lock size={30} style={{ margin: 'auto' }} />
          <p>此页面仅对站点所有者开放。学员账号没有管理权限。</p>
          <a
            className="button dark"
            href="/signin-with-chatgpt?return_to=%2Fadmin"
            target="_top"
          >
            使用老师账号登录 <ArrowRight size={17} />
          </a>
        </div>
      </>
    );
  return (
    <>
      <Heading
        eyebrow="CONTENT STUDIO"
        title="让你的学堂，持续生长。"
        subtitle="先保存草稿、预览内容，再发布给学员。"
      />
      <div className="row spaced" style={{ marginBottom: 25 }}>
        <div className="row">
          <span className="chip">
            短信：{data.smsReady ? '已配置' : '待接通'}
          </span>
          <span className="chip">
            AI 模型：{data.aiReady ? '已配置' : '待接通'}
          </span>
        </div>
        <div className="row">
          <button className="button" onClick={() => setPreview(!preview)}>
            {preview ? '返回编辑' : '预览草稿'}
          </button>
          <button
            className="button"
            disabled={busy || !loaded}
            onClick={() => save(false)}
          >
            <Save size={16} />
            保存草稿
          </button>
          <button
            className="button dark"
            disabled={busy || !loaded}
            onClick={() => save(true)}
          >
            {busy ? '处理中…' : '发布内容'}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      {msg && (
        <div className="notice" role="status">
          {msg}
        </div>
      )}
      {preview ? (
        <>
          <div className="notice">
            草稿预览 · 展示当前编辑内容，尚未发布给学员。
          </div>
          <h2 style={{ marginBottom: 20 }}>{draft.settings.name}</h2>
          <Cards courses={draft.courses.filter((c) => c.published)} />
          {course && (
            <div className="panel" style={{ marginTop: 25 }}>
              <h2>{course.title}</h2>
              {course.lessons.map((l) => (
                <section key={l.id} style={{ marginTop: 25 }}>
                  <h3>{l.title}</h3>
                  <div className="reading">{l.content}</div>
                  <div className="notice">实战任务：{l.task}</div>
                  <p>{l.question}</p>
                  <ol>
                    {l.options.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <Tabs defaultValue="courses" className="tabs-wide">
          <TabsList variant="line">
            <TabsTrigger value="courses">课程与练习</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="resources">工具导航</TabsTrigger>
            <TabsTrigger value="reviews">作业复核</TabsTrigger>
            <TabsTrigger value="settings">学堂设置</TabsTrigger>
          </TabsList>
          <TabsContent value="courses">
            <div className="admin-grid">
              <aside className="panel">
                <h3>课程目录</h3>
                <div className="lesson-nav">
                  {draft.courses.map((c) => (
                    <a
                      href="#course-editor"
                      key={c.id}
                      className={selected === c.id ? 'active' : ''}
                      onClick={() => {
                        setSelected(c.id);
                        setLessonIndex(0);
                      }}
                    >
                      {c.title}
                      <small style={{ display: 'block' }}>
                        {c.published ? '发布时可见' : '暂不上架'}
                      </small>
                    </a>
                  ))}
                </div>
                <button
                  className="button small"
                  onClick={() => {
                    const id = 'course-' + crypto.randomUUID().slice(0, 8);
                    const base = draft.courses[0];
                    const c = {
                      ...base,
                      id,
                      title: '新课程',
                      description: '请填写课程简介',
                      published: false,
                      version: 1,
                      lessons: [
                        {
                          ...base.lessons[0],
                          id: 'lesson-' + crypto.randomUUID().slice(0, 8),
                          title: '第一课',
                        },
                      ],
                    };
                    setDraft((d) => ({ ...d, courses: [...d.courses, c] }));
                    setSelected(id);
                    setLessonIndex(0);
                  }}
                >
                  <Plus size={16} />
                  新增课程
                </button>
              </aside>
              {course && (
                <div id="course-editor">
                  <div className="panel">
                    <h3>课程信息</h3>
                    <label className="field">
                      课程标题
                      <input
                        value={course.title}
                        onChange={(e) =>
                          updateCourse({ title: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      简介
                      <textarea
                        value={course.description}
                        onChange={(e) =>
                          updateCourse({ description: e.target.value })
                        }
                      />
                    </label>
                    <div className="row">
                      <label className="field" style={{ flex: 1 }}>
                        分类
                        <input
                          value={course.category}
                          onChange={(e) =>
                            updateCourse({ category: e.target.value })
                          }
                        />
                      </label>
                      <label className="field" style={{ flex: 1 }}>
                        难度
                        <input
                          value={course.level}
                          onChange={(e) =>
                            updateCourse({ level: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="row" style={{ fontSize: 14 }}>
                      <Checkbox
                        checked={course.published}
                        onCheckedChange={(v) =>
                          updateCourse({ published: !!v })
                        }
                      />
                      发布时上架此课程
                    </label>
                  </div>
                  <div className="panel">
                    <div className="row spaced">
                      <h3>课时与随堂实战</h3>
                      <button className="button small" onClick={addLesson}>
                        <Plus size={15} />
                        新增课时
                      </button>
                    </div>
                    <div className="filter-row" style={{ marginTop: 20 }}>
                      {course.lessons.map((l, i) => (
                        <button
                          key={l.id}
                          className={
                            'chip ' + (i === lessonIndex ? 'selected' : '')
                          }
                          onClick={() => setLessonIndex(i)}
                        >
                          第 {i + 1} 课
                        </button>
                      ))}
                    </div>
                    {lesson && (
                      <>
                        <label className="field">
                          课时标题
                          <input
                            value={lesson.title}
                            onChange={(e) =>
                              updateLesson({ title: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          预计学习分钟数
                          <input
                            type="number"
                            min={1}
                            max={600}
                            value={lesson.minutes}
                            onChange={(e) =>
                              updateLesson({ minutes: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="field">
                          课程讲解（支持分段文字）
                          <textarea
                            style={{ minHeight: 240 }}
                            value={lesson.content}
                            onChange={(e) =>
                              updateLesson({ content: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          视频链接（选填，HTTPS 直链）
                          <input
                            type="url"
                            value={lesson.videoUrl || ''}
                            onChange={(e) =>
                              updateLesson({ videoUrl: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          实战任务与练习材料
                          <textarea
                            value={lesson.task}
                            onChange={(e) =>
                              updateLesson({ task: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          学员卡住时的提示
                          <textarea
                            value={lesson.hint}
                            onChange={(e) =>
                              updateLesson({ hint: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          概念测验题目
                          <input
                            value={lesson.question}
                            onChange={(e) =>
                              updateLesson({ question: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          选项（每行一个，至少两个）
                          <textarea
                            value={lesson.options.join('\n')}
                            onChange={(e) =>
                              updateLesson({
                                options: e.target.value.split('\n'),
                              })
                            }
                          />
                        </label>
                        <label className="field">
                          正确选项序号（从 1 开始）
                          <input
                            type="number"
                            min={1}
                            max={lesson.options.length}
                            value={lesson.answer + 1}
                            onChange={(e) =>
                              updateLesson({
                                answer: Number(e.target.value) - 1,
                              })
                            }
                          />
                        </label>
                        <label className="field">
                          评价标准（每行一条）
                          <textarea
                            value={lesson.rubric.join('\n')}
                            onChange={(e) =>
                              updateLesson({
                                rubric: e.target.value.split('\n'),
                              })
                            }
                          />
                        </label>
                        <label className="field">
                          对应预检关键词（与标准逐行对应，同一行可用 | 分隔）
                          <textarea
                            value={lesson.keywords.join('\n')}
                            onChange={(e) =>
                              updateLesson({
                                keywords: e.target.value.split('\n'),
                              })
                            }
                          />
                        </label>
                        <label className="field">
                          提交后可看的参考思路
                          <textarea
                            value={lesson.reference}
                            onChange={(e) =>
                              updateLesson({ reference: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          关联 Skill 标识
                          <input
                            value={lesson.skillId}
                            list="skill-ids"
                            onChange={(e) =>
                              updateLesson({ skillId: e.target.value })
                            }
                          />
                          <datalist id="skill-ids">
                            {draft.skills.map((s) => (
                              <option value={s.id} key={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </datalist>
                        </label>
                        <div className="row">
                          <button
                            className="button small"
                            disabled={lessonIndex === 0}
                            onClick={() => {
                              const ls = [...course.lessons];
                              [ls[lessonIndex - 1], ls[lessonIndex]] = [
                                ls[lessonIndex],
                                ls[lessonIndex - 1],
                              ];
                              updateCourse({ lessons: ls });
                              setLessonIndex(lessonIndex - 1);
                            }}
                          >
                            课时上移
                          </button>
                          <button
                            className="button small"
                            disabled={lessonIndex === course.lessons.length - 1}
                            onClick={() => {
                              const ls = [...course.lessons];
                              [ls[lessonIndex + 1], ls[lessonIndex]] = [
                                ls[lessonIndex],
                                ls[lessonIndex + 1],
                              ];
                              updateCourse({ lessons: ls });
                              setLessonIndex(lessonIndex + 1);
                            }}
                          >
                            课时下移
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="skills">
            <button
              className="button"
              style={{ marginBottom: 20 }}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  skills: [
                    ...d.skills,
                    {
                      id: 'skill-' + crypto.randomUUID().slice(0, 8),
                      name: '新技能',
                      description: '请填写用途',
                      instructions: '请填写执行步骤和限制',
                      enabled: false,
                      version: 1,
                    },
                  ],
                }))
              }
            >
              <Plus size={16} />
              新增 Skill
            </button>
            {draft.skills.map((s, i) => (
              <div className="panel" key={s.id}>
                <div className="row spaced">
                  <small className="muted">标识：{s.id}</small>
                  <label className="row">
                    <Checkbox
                      checked={s.enabled}
                      onCheckedChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          skills: d.skills.map((x, j) =>
                            j === i ? { ...x, enabled: !!v } : x,
                          ),
                        }))
                      }
                    />
                    启用
                  </label>
                </div>
                {(['name', 'description', 'instructions'] as const).map(
                  (key, k) => (
                    <label className="field" key={key}>
                      {['名称', '用途说明', '执行方法与约束'][k]}
                      <textarea
                        value={s[key]}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            skills: d.skills.map((x, j) =>
                              j === i ? { ...x, [key]: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="resources">
            <button
              className="button"
              style={{ marginBottom: 20 }}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  resources: [
                    ...d.resources,
                    {
                      id: crypto.randomUUID(),
                      name: '新工具',
                      description: '请填写用途和使用说明',
                      category: '办公',
                      url: '',
                    },
                  ],
                }))
              }
            >
              <Plus size={16} />
              添加工具
            </button>
            {draft.resources.map((r, i) => (
              <div className="panel" key={r.id}>
                {(['name', 'category', 'description', 'url'] as const).map(
                  (key, k) => (
                    <label className="field" key={key}>
                      {['名称', '分类', '用途说明', '官网链接（HTTPS）'][k]}
                      <input
                        value={r[key]}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            resources: d.resources.map((x, j) =>
                              i === j ? { ...x, [key]: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="reviews">
            {reviews.length ? (
              reviews.map((s) => <Review key={s.id} s={s} />)
            ) : (
              <div className="empty">
                <h2>还没有待复核的作业</h2>
                <p>学员提交后，会显示作品、提交时的题目版本和评价标准。</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings">
            <div className="panel narrow">
              {(['name', 'tagline', 'about'] as const).map((key, k) => (
                <label className="field" key={key}>
                  {['学堂名称', '首页主标题', '主理人与学堂介绍'][k]}
                  <textarea
                    value={draft.settings[key]}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        settings: { ...d.settings, [key]: e.target.value },
                      }))
                    }
                  />
                </label>
              ))}
              <div className="notice">
                短信服务需要配置签名、模板和服务密钥；AI
                问答需要配置模型服务。密钥在托管设置中管理，不会保存在课程内容里。
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
function Review({ s }: { s: Submission }) {
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const snap = s.snapshot ? JSON.parse(s.snapshot) : {};
  async function review(passed: boolean) {
    setBusy(true);
    try {
      await api('review', { id: s.id, note, passed });
      setMsg(passed ? '已标记实战达标' : '已反馈需要修改');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <h3>{snap.title || s.lesson_id}</h3>
      <p className="muted" style={{ fontSize: 13, margin: '12px 0' }}>
        课程版本 {s.version} · {new Date(s.created_at).toLocaleString('zh-CN')}
      </p>
      <details>
        <summary>查看提交时的任务与标准</summary>
        <p className="reading">{snap.task}</p>
        <ul>
          {snap.rubric?.map((r: string) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
      <p className="reading" style={{ marginTop: 18 }}>
        {s.answer}
      </p>
      <FeedbackView f={JSON.parse(s.feedback)} />
      <label className="field">
        老师反馈
        <textarea
          value={note}
          maxLength={4000}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="row">
        <button
          className="button dark"
          disabled={busy || !note.trim()}
          onClick={() => review(true)}
        >
          实战达标
        </button>
        <button
          className="button"
          disabled={busy || !note.trim()}
          onClick={() => review(false)}
        >
          需要修改
        </button>
      </div>
      {msg && <div className="notice">{msg}</div>}
    </div>
  );
}
