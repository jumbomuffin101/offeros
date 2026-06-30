import type {
  Application,
  ApplicationPriority,
  ApplicationStatus,
} from "@/lib/types";

export type ApplicationFiltersState = {
  status: ApplicationStatus | "All";
  priority: ApplicationPriority | "All";
  source: string;
  resumeUsed: string;
};

export type ApplicationSortKey =
  | "deadlineSoonest"
  | "dateAppliedNewest"
  | "dateAppliedOldest"
  | "companyAz"
  | "priorityHigh";

export const defaultApplicationFilters: ApplicationFiltersState = {
  status: "All",
  priority: "All",
  source: "All",
  resumeUsed: "All",
};

export const priorityOrder: Record<ApplicationPriority, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

export function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function filterApplications(
  applications: Application[],
  search: string,
  filters: ApplicationFiltersState,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return applications.filter((application) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        application.company,
        application.role,
        application.location,
        application.source,
        application.resumeUsed,
        application.notes,
        ...application.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

    const matchesStatus =
      filters.status === "All" || application.status === filters.status;
    const matchesPriority =
      filters.priority === "All" || application.priority === filters.priority;
    const matchesSource =
      filters.source === "All" || application.source === filters.source;
    const matchesResume =
      filters.resumeUsed === "All" || application.resumeUsed === filters.resumeUsed;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesSource &&
      matchesResume
    );
  });
}

export function sortApplications(
  applications: Application[],
  sortKey: ApplicationSortKey,
) {
  return [...applications].sort((a, b) => {
    if (sortKey === "companyAz") {
      return a.company.localeCompare(b.company);
    }

    if (sortKey === "priorityHigh") {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }

    if (sortKey === "dateAppliedNewest") {
      return dateValue(b.dateApplied) - dateValue(a.dateApplied);
    }

    if (sortKey === "dateAppliedOldest") {
      return dateValue(a.dateApplied) - dateValue(b.dateApplied);
    }

    return deadlineValue(a.deadline) - deadlineValue(b.deadline);
  });
}

export function uniqueValues(
  applications: Application[],
  key: "source" | "resumeUsed",
) {
  return Array.from(new Set(applications.map((application) => application[key]).filter(Boolean))).sort();
}

function dateValue(value: string) {
  if (!value) {
    return 0;
  }

  const date = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(date) ? 0 : date;
}

function deadlineValue(value: string) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(date) ? Number.POSITIVE_INFINITY : date;
}
