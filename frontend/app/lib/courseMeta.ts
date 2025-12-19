type CourseMeta = {
  thumbnail?: string;
  modules?: Array<{ name: string; lessons: number; tests: number }>;
};

export function parseCourseMeta(description?: string | null): {
  meta: CourseMeta;
  cleanDescription: string;
} {
  if (!description) {
    return { meta: {}, cleanDescription: "" };
  }

  const marker = "[meta]:";
  const idx = description.indexOf(marker);
  if (idx === -1) {
    return { meta: {}, cleanDescription: description.trim() };
  }

  const cleanDescription = description.slice(0, idx).trim();
  const metaText = description.slice(idx + marker.length).trim();

  try {
    const meta = JSON.parse(metaText) as CourseMeta;
    return { meta, cleanDescription };
  } catch {
    return { meta: {}, cleanDescription };
  }
}
