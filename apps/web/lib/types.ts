export type ApplicationStatus =
  | "Wishlist"
  | "Applying"
  | "Applied"
  | "OA"
  | "Interview"
  | "Final Round"
  | "Offer"
  | "Rejected";

export type ApplicationPriority = "Low" | "Medium" | "High";

export type Application = {
  id: string;
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  dateApplied: string;
  deadline: string;
  source: string;
  resumeUsed: string;
  jobUrl: string;
  recruiterName: string;
  recruiterEmail: string;
  salaryRange: string;
  priority: ApplicationPriority;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category: "Big Tech" | "Finance" | "Fintech" | "Startup" | "Data";
};

export type ResumeVersion = {
  id: string;
  name: string;
  lastUpdated: string;
  applicationsUsedFor: number;
  keywordMatchScore: number;
  status: "Active" | "Draft";
  focus: string;
};

export type PrepTask = {
  id: string;
  title: string;
  type: "Coding" | "Behavioral" | "System Design";
  difficulty?: "Easy" | "Medium" | "Hard";
  topic: string;
  targetTime: string;
  status: "Not Started" | "In Progress" | "Complete";
};

export type Activity = {
  id: string;
  label: string;
  detail: string;
  time: string;
  tone: "info" | "success" | "warning" | "danger";
};

export type Deadline = {
  id: string;
  company: string;
  title: string;
  due: string;
  urgency: "Low" | "Medium" | "High";
};

export type AnalyticsMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  change: string;
  tone: "cyan" | "green" | "amber" | "red" | "purple";
};
