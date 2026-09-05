import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const content = sqliteTable('content', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: integer('updated_at').notNull(),
});
export const students = sqliteTable(
  'students',
  {
    id: text('id').primaryKey(),
    phone: text('phone').notNull(),
    name: text('name').notNull(),
    goal: text('goal').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('idx_students_phone').on(t.phone)],
);
export const sessions = sqliteTable('sessions', {
  hash: text('hash').primaryKey(),
  userId: text('user_id').notNull(),
  expires: integer('expires').notNull(),
});
export const otp = sqliteTable('otp', {
  phone: text('phone').primaryKey(),
  hash: text('hash').notNull(),
  expires: integer('expires').notNull(),
  attempts: integer('attempts').notNull(),
  sentAt: integer('sent_at').notNull(),
});
export const limits = sqliteTable('limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expires: integer('expires').notNull(),
});
export const progress = sqliteTable(
  'progress',
  {
    key: text('key').primaryKey(),
    userId: text('user_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    courseId: text('course_id').notNull(),
    read: integer('read').notNull().default(0),
    passed: integer('passed').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('idx_progress_user').on(t.userId)],
);
export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    courseId: text('course_id').notNull(),
    version: integer('version').notNull(),
    answer: text('answer').notNull(),
    feedback: text('feedback').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('idx_submissions_user_time').on(t.userId, t.createdAt)],
);
export const chats = sqliteTable(
  'chats',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    role: text('role').notNull(),
    text: text('text').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('idx_chats_user_lesson').on(t.userId, t.lessonId)],
);
