import Academy from './academy';
import { catalog } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const d = await catalog();
  const courses = d.courses
    .filter((c) => c.published)
    .map((c) => ({
      ...c,
      lessons: c.lessons.map((l) => ({ id: l.id, minutes: l.minutes })),
    }));
  return <Academy courses={courses} settings={d.settings} />;
}
