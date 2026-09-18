export const D2R_ENABLED = process.env.NEXT_PUBLIC_D2R_ENABLED?.trim().toLowerCase() === "true";
export const PILOT_RELEASE_ENABLED =
  process.env.NEXT_PUBLIC_PILOT_RELEASE?.trim().toLowerCase() === "true";
export const STUDENT_ATTENTION_DASHBOARD_ENABLED =
  PILOT_RELEASE_ENABLED &&
  process.env.NEXT_PUBLIC_STUDENT_ATTENTION_DASHBOARD?.trim().toLowerCase() === "true";
export const TEACHER_GROUP_DASHBOARD_ENABLED =
  PILOT_RELEASE_ENABLED &&
  process.env.NEXT_PUBLIC_TEACHER_GROUP_DASHBOARD?.trim().toLowerCase() === "true";
export const RESEARCH_DASHBOARD_ENABLED =
  PILOT_RELEASE_ENABLED &&
  process.env.NEXT_PUBLIC_RESEARCH_DASHBOARD?.trim().toLowerCase() === "true";
export const CONSERVATIVE_INTERVENTIONS_ENABLED =
  PILOT_RELEASE_ENABLED &&
  process.env.NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS?.trim().toLowerCase() === "true";
