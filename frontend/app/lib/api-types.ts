export type UserProfileApi = {
  id?: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
};

export type CourseApi = {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  thumbnail?: string;
  owner: UserProfileApi;
};

export type CourseModuleApi = {
  id: number;
  title: string;
  order: number;
  duration_hours?: number;
  course: Pick<CourseApi, "id" | "title">;
};

export type CourseLessonApi = {
  id: number;
  title: string;
  order: number;
  module: CourseModuleApi;
};

export type QuizQuestion = {
  id?: string | number;
  question: string;
  options: string[];
  answer?: string;
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
};

export type MaterialMetadata = {
  file_name?: string;
  file_size?: number;
  file_type?: string;
  questions?: QuizQuestion[];
  passing_score?: number | string;
  [key: string]: unknown;
};

export type CourseMaterialApi = {
  id: number;
  title: string;
  description?: string;
  material_type: "pdf" | "video" | "test";
  url?: string;
  metadata?: MaterialMetadata;
  created_at?: string;
  lesson: CourseLessonApi;
};

export type EnrollmentDataApi = {
  attention_avg?: number;
  attention_last?: number;
  progress?: number;
  progress_percent?: number;
  completed_lessons?: number;
  total_lessons?: number;
  last_lesson_id?: number | null;
  last_attention_at?: string;
  attention_updated_at?: string;
  last_update_at?: string;
  last_quiz_score?: number;
  last_quiz_at?: string;
  [key: string]: unknown;
};

export type EnrollmentApi = {
  id: number;
  status: "active" | "completed" | "cancelled";
  course: CourseApi;
  user: UserProfileApi;
  enrollment_data: EnrollmentDataApi;
};

export type SessionApi = {
  id: number;
  created_at: string;
  mean_attention?: number;
  last_score?: number;
  attention_score?: number;
  course?: Pick<CourseApi, "id" | "title">;
};

export type QuizAttemptApi = {
  id: number;
  score: number | null;
  created_at?: string;
  session: SessionApi & { course: Pick<CourseApi, "id" | "title"> };
};

export type AiSourceApi = {
  type: "pdf" | "video" | "lesson" | "course" | "module";
  title: string;
  detail: string;
  status: string;
  reason: string;
};
