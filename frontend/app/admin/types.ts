export type AdminView = "inicio" | "usuarios" | "cursos" | "analytics";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "estudiante" | "profesor" | "admin";
  status: "active" | "inactive";
  courses: number;
}

export interface AdminCourse {
  id: number;
  title: string;
  instructor: string;
  students: number;
  status: "active" | "inactive";
  category: string;
}

export interface FacultyMetric {
  id: number;
  name: string;
  students: number;
  professors: number;
  courses: number;
  avgAttention: number;
  avgGrade: number;
  completionRate: number;
  dropoutRisk: number;
  trend: string;
}

export interface InstitutionalTrend {
  month: string;
  students: number;
  attention: number;
  graduation: number;
}

export interface DropoutCase {
  id: number;
  student: string;
  faculty: string;
  riskLevel: "critical" | "high" | "medium";
  riskScore: number;
  factors: string[];
  recommendation: string;
}

export interface ResearchPermission {
  id: number;
  researcher: string;
  institution: string;
  project: string;
  data_requested: string;
  status: "pending" | "approved" | "rejected";
  date?: string;
  ethics_approval: boolean;
  requested_at?: string;
}

export interface PrivacyPolicySetting {
  id: number;
  name: string;
  description: string;
  current_value: string;
  options: string[];
  updated_at?: string;
}

export interface AdminAnalyticsData {
  faculty_metrics: FacultyMetric[];
  institutional_trend: InstitutionalTrend[];
  dropout_prediction: DropoutCase[];
  research_permissions: ResearchPermission[];
  privacy_policies: PrivacyPolicySetting[];
}
