export type ApiDataResponse<T> = { data: T };

export type ApiAnalyticsOverview = {
  total_applications: number;
  application_statuses: Record<string, number>;
  total_resumes: number;
  completed_coding_problems: number;
  completed_behavioral_questions: number;
  completed_system_design_prompts: number;
};

export type ApiApplication = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  location: string;
  status: "wishlist" | "applying" | "applied" | "oa" | "interview" | "final_round" | "offer" | "rejected";
  date_applied: string | null;
  deadline: string | null;
  source: string;
  resume_used: string;
  job_url: string | null;
  recruiter_name: string;
  recruiter_email: string | null;
  salary_range: string;
  priority: "low" | "medium" | "high";
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ApiResume = {
  id: string;
  user_id: string;
  name: string;
  target_role: string;
  description: string;
  status: "active" | "draft";
  keyword_match_score: number;
  tags: string[];
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  suggested_improvement: string;
  notes: string;
  file_name: string;
  created_at: string;
  updated_at: string;
};

export type ApiPrepStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type ApiCodingProblem = {
  id: string;
  user_id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  target_time_minutes: number;
  status: ApiPrepStatus;
  notes: string;
  link: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiBehavioralQuestion = {
  id: string;
  user_id: string;
  question: string;
  category: string;
  star_situation: string;
  star_task: string;
  star_action: string;
  star_result: string;
  confidence_score: number;
  status: ApiPrepStatus;
  created_at: string;
  updated_at: string;
};

export type ApiSystemDesignPrompt = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  concepts: string[];
  status: ApiPrepStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};
