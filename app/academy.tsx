'use client';
import type { Course, Settings, Lesson } from '@/lib/types';
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  BookOpen,
  Code2,
  PenLine,
  Video,
  Search,
  Layers,
  Check,
  Compass,
  Bot,
  Menu,
  X,
  GraduationCap,
  FolderOpen,
  BriefcaseBusiness,
  Play,
  ChevronRight,
} from 'lucide-react';
const directions = [
  ['全部课程', '全部'],
  ['AI 零基础', '入门'],
  ['办公提效', '办公'],
  ['内容创作', '创作'],
  ['AI 编程', '编程'],
  ['Skills & Agent', 'Skills'],
];
export default function Academy({
  courses: demo,
  settings,
}: {
  courses: (Omit<Course, 'lessons'> & {
    lessons: Pick<Lesson, 'id' | 'minutes'>[];
  })[];
  settings: Settings;
}) {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brandmark">
            a<span>i</span>
          </span>
          <span>
            {settings.name}
            <small>LEARN. MAKE. GROW.</small>
          </span>
        </a>
        <nav>
          <a className="active" href="/">
            探索首页
          </a>
          <a href="/courses">学习课程</a>
          <a href="/resources">工具与 Skills</a>
          <a href="/about">关于学堂</a>
        </nav>
        <div className="header-actions">
          <a className="assistant-link" href="/assistant">
            <Sparkles size={17} /> AI 助教
          </a>
          <a className="button dark small" href="/me">
            我的学习 <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <main className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> 给每一个想开始的人
            </div>
            <h1>
              {settings.tagline === '从认识 AI，到做出自己的作品。' ? (
                <>
                  从认识 AI，
                  <br />
                  到做出<span className="green">自己的作品。</span>
                </>
              ) : (
                settings.tagline
              )}
            </h1>
            <p>
              不止看懂，更要亲手做到。
              <br />
              在真实任务中学习，让 AI 成为你的日常能力。
            </p>
            <div className="hero-actions">
              <a className="button dark" href="/courses?category=入门">
                从零开始学习 <ArrowRight size={18} />
              </a>
              <a className="text-link" href="/courses">
                探索全部课程 <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="hero-foot">
              <span>
                <Check size={15} /> 零基础也能开始
              </span>
              <span>
                <Check size={15} /> 每课都有实战
              </span>
              <span>
                <Check size={15} /> 按自己的节奏
              </span>
            </div>
          </div>
          <div className="learning-map">
            <div className="map-top">
              <span>你的 AI 成长路线</span>
              <span className="tag">LEARNING PATH</span>
            </div>
            <div className="path-item">
              <span className="path-num">01</span>
              <div>
                <b>先理解，再动手</b>
                <small>认识 AI · 学会提问</small>
              </div>
              <BookOpen size={22} />
            </div>
            <div className="path-line" />
            <div className="path-item">
              <span className="path-num">02</span>
              <div>
                <b>选一个想解决的问题</b>
                <small>办公 · 创作 · 编程</small>
              </div>
              <Compass size={22} />
            </div>
            <div className="path-line" />
            <div className="path-item featured">
              <span className="path-num">
                <Check size={19} />
              </span>
              <div>
                <b>完成你的第一件作品</b>
                <small>随堂实操 → 提交 → 反馈 → 改进</small>
              </div>
              <ArrowUpRight size={24} />
            </div>
            <div className="map-bottom">
              <Sparkles size={16} /> 学到的方法，马上用起来。
            </div>
          </div>
        </section>
        <section className="explore">
          <div className="section-head">
            <div>
              <div className="eyebrow">FIND YOUR NEXT STEP</div>
              <h2>今天，你想用 AI 做什么？</h2>
            </div>
            <a href="/courses" className="text-link">
              查看全部课程 <ArrowRight size={16} />
            </a>
          </div>
          <div className="filter-row">
            {directions.map(([label, cat], i) => (
              <a
                className={'chip ' + (!i ? 'selected' : '')}
                href={
                  '/courses' + (i ? '?category=' + encodeURIComponent(cat) : '')
                }
                key={cat}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="course-grid">
            {demo.map((c, i) => (
              <a className="course-card" href={'/courses/' + c.id} key={c.id}>
                <div className={'course-cover ' + c.color}>
                  <span className="cover-label">
                    {c.category === '入门' ? 'START WITH AI' : 'AI IN PRACTICE'}
                    <br />
                    <b>{String(i + 1).padStart(2, '0')}</b>
                  </span>
                  <span className="cover-symbol">{c.icon}</span>
                  <span className="cover-bottom">
                    {c.category} / 实战入门 <ArrowUpRight size={17} />
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
                      <BookOpen size={14} /> {c.lessons.length} 课时 · 图文实战
                    </span>
                    <span>
                      开始学习 <ArrowUpRight size={15} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
        <section className="bottom-callout">
          <div>
            <span className="eyebrow">LEARNING BY DOING</span>
            <h2>把“我看懂了”，变成“我做到了”。</h2>
            <p>每一次提交、反馈和修改，都是你真正掌握 AI 的一步。</p>
          </div>
          <a className="button dark" href="/courses/first-prompt">
            体验第一堂实战课 <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          AI 实践学堂
        </a>
        <span>从理解到创造，保持好奇，持续实践。</span>
        <a href="/admin">
          内容管理 <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
