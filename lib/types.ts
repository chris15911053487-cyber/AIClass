export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  content: string;
  task: string;
  hint: string;
  question: string;
  options: string[];
  answer: number;
  rubric: string[];
  keywords: string[];
  reference: string;
  skillId: string;
  videoUrl?: string;
};
export type Course = {
  id: string;
  title: string;
  category: string;
  description: string;
  color: string;
  icon: string;
  level: string;
  published: boolean;
  version: number;
  lessons: Lesson[];
};
export type Skill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  version: number;
};
export type Resource = {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
};
export type Settings = { name: string; tagline: string; about: string };
