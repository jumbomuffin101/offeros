export type ApiDataResponse<T> = { data: T };

export type ApiAnalyticsOverview = {
  total_applications: number;
  application_statuses: Record<string, number>;
  total_resumes: number;
  completed_coding_problems: number;
  completed_behavioral_questions: number;
  completed_system_design_prompts: number;
};

export type ApiWorkspaceSummary = {
  applications: ApiApplication[];
  resumes: ApiResume[];
  coding_problems: ApiCodingProblem[];
  behavioral_questions: ApiBehavioralQuestion[];
  system_design_prompts: ApiSystemDesignPrompt[];
  upcoming_events?: ApiUpcomingEvent[];
  focus?: ApiFocus | null;
  as_of: string;
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
  external_job_id?: string | null;
  captured_at?: string | null;
  next_action?: string | null;
  next_action_due_at?: string | null;
  next_event_type?: string | null;
  resume_used: string;
  resume_version_id: string | null;
  resume_analysis_id: string | null;
  job_description: string;
  selected_resume_name: string | null;
  selected_resume_target_role: string | null;
  analysis_status: "completed" | "failed" | "pending" | null;
  analysis_overall_score: number | null;
  analysis_keyword_score: number | null;
  analysis_missing_keyword_count: number;
  analysis_last_analyzed_at: string | null;
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

export type ApiApplicationEvent = { id: string; application_id: string; event_type: string; title: string; description: string; scheduled_at: string; completed_at: string | null; status: "upcoming" | "completed" | "canceled"; source: "manual" | "application" | "calendar" | "future_email"; external_calendar_event_id: string | null; created_at: string; updated_at: string };
export type ApiUpcomingEvent = ApiApplicationEvent & { company: string; role: string };
export type ApiFocus = { type: string; application_id: string; title: string; subtitle: string; due_at: string | null; priority: number; prep_readiness: number | null; prep_next_action: string | null };

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
  suggested_improvement: string | null;
  notes: string;
  file_name: string;
  original_file_name: string;
  extracted_text: string;
  text_extraction_status: "not_started" | "manual" | "parsed" | "failed";
  text_extraction_error: string;
  extracted_at: string | null;
  extraction_character_count: number;
  last_analyzed_at: string | null;
  latest_analysis_id: string | null;
  latest_overall_score: number | null;
  latest_analysis_target_role: string;
  latest_analysis_company: string;
  analysis_status: string;
  created_at: string;
  updated_at: string;
};

export type ApiResumeUploadResponse = {
  resume: ApiResume;
  extraction: {
    text: string;
    page_count: number | null;
    character_count: number;
    status: "completed" | "failed";
    warnings: string[];
  };
};

export type ApiResumeAnalysis = {
  id: string;
  user_id: string;
  resume_version_id: string;
  analysis_request_id?: string | null;
  company_name: string | null;
  target_role: string;
  job_description: string;
  input_resume_hash: string;
  overall_score: number;
  keyword_score: number;
  impact_score: number;
  clarity_score: number;
  technical_depth_score: number;
  experience_match_score: number | null;
  required_skills_match: Array<{ skill: string; status: "strong" | "partial" | "missing"; evidence: string | null }>;
  preferred_skills_match: Array<{ skill: string; status: "strong" | "partial" | "missing"; evidence: string | null }>;
  missing_keywords: string[];
  strong_keywords: string[];
  weak_bullets: Array<{ original: string; issue: string; suggestion: string }>;
  suggested_bullet_rewrites: Array<{ original: string; rewrite: string; why_better: string; grounded_in_resume?: boolean; rationale?: string }>;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  recruiter_summary: string | null;
  summary: string;
  provider: string;
  model: string;
  status: "completed" | "failed" | "pending";
  error_message: string;
  created_at: string;
  updated_at: string;
};

export type ApiResumeAnalyzeResponse = {
  analysis: ApiResumeAnalysis;
  resume: ApiResume;
};

export type ApiApplicationAnalyzeResponse = {
  application: ApiApplication;
  analysis: ApiResumeAnalysis;
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
