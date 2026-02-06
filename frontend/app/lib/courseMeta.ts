type CourseMeta = {
  thumbnail?: string;
  modules?: Array<{ name: string; lessons: number; tests: number }>;
  level?: string;
  field?: string;
};

export function parseCourseMeta(description: string | null): {
  meta: CourseMeta;
  cleanDescription: string;
} {
  if (!description) {
    return { meta: { thumbnail: "", modules: [] }, cleanDescription: "" };
  }

  const marker = "[meta]:";
  const idx = description.indexOf(marker);
  if (idx === -1) {
    return { meta: { thumbnail: "", modules: [] }, cleanDescription: description.trim() };
  }

  const cleanDescription = description.slice(0, idx).trim();
  const metaText = description.slice(idx + marker.length).trim();

  try {
    const meta = JSON.parse(metaText) as CourseMeta;
    return { meta, cleanDescription };
  } catch {
    return { meta: { thumbnail: "", modules: [] }, cleanDescription };
  }
}
