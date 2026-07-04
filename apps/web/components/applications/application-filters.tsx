"use client";

import { Filter, ListFilter, RotateCcw, Search } from "lucide-react";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";
import type { ApplicationPriority } from "@/lib/types";
import type {
  ApplicationFiltersState,
  ApplicationSortKey,
} from "@/lib/application-utils";
import { defaultApplicationFilters } from "@/lib/application-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const priorities: (ApplicationPriority | "All")[] = ["All", "High", "Medium", "Low"];

const sortOptions: { label: string; value: ApplicationSortKey }[] = [
  { label: "Deadline soonest", value: "deadlineSoonest" },
  { label: "Date applied newest", value: "dateAppliedNewest" },
  { label: "Date applied oldest", value: "dateAppliedOldest" },
  { label: "Company A-Z", value: "companyAz" },
  { label: "Priority high to low", value: "priorityHigh" },
];

export function ApplicationFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sortKey,
  onSortChange,
  sources,
  resumes,
  filterOpen,
  sortOpen,
  onFilterOpenChange,
  onSortOpenChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: ApplicationFiltersState;
  onFiltersChange: (filters: ApplicationFiltersState) => void;
  sortKey: ApplicationSortKey;
  onSortChange: (sortKey: ApplicationSortKey) => void;
  sources: string[];
  resumes: string[];
  filterOpen: boolean;
  sortOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  onSortOpenChange: (open: boolean) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="pl-9 pr-16"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search company, role, source, resume, tags"
            value={search}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
            Ctrl K
          </span>
        </div>
        <div className="relative">
          <Button
            onClick={() => {
              onFilterOpenChange(!filterOpen);
              onSortOpenChange(false);
            }}
            type="button"
          >
            <Filter className="size-4" />
            Filter
          </Button>
          {filterOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-700/45 bg-[#202336]/98 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Filters</div>
                <button
                  className="text-xs text-slate-500 transition hover:text-cyan-200"
                  onClick={() => onFiltersChange(defaultApplicationFilters)}
                  type="button"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-3">
                <FilterSelect
                  label="Status"
                  onChange={(value) =>
                    onFiltersChange({ ...filters, status: value as ApplicationFiltersState["status"] })
                  }
          options={["All", ...APPLICATION_STATUSES]}
                  value={filters.status}
                />
                <FilterSelect
                  label="Priority"
                  onChange={(value) =>
                    onFiltersChange({ ...filters, priority: value as ApplicationFiltersState["priority"] })
                  }
                  options={priorities}
                  value={filters.priority}
                />
                <FilterSelect
                  label="Source"
                  onChange={(value) => onFiltersChange({ ...filters, source: value })}
                  options={["All", ...sources]}
                  value={filters.source}
                />
                <FilterSelect
                  label="Resume used"
                  onChange={(value) => onFiltersChange({ ...filters, resumeUsed: value })}
                  options={["All", ...resumes]}
                  value={filters.resumeUsed}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative">
          <Button
            onClick={() => {
              onSortOpenChange(!sortOpen);
              onFilterOpenChange(false);
            }}
            type="button"
          >
            <ListFilter className="size-4" />
            Sort
          </Button>
          {sortOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-700/45 bg-[#202336]/98 p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
              {sortOptions.map((option) => (
                <button
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.055] ${
                    sortKey === option.value ? "text-cyan-100" : "text-slate-400"
                  }`}
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    onSortOpenChange(false);
                  }}
                  type="button"
                >
                  {option.label}
                  {sortKey === option.value ? <span className="size-1.5 rounded-full bg-cyan-300" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          onClick={() => {
            onSearchChange("");
            onFiltersChange(defaultApplicationFilters);
            onSortChange("deadlineSoonest");
          }}
          type="button"
          variant="ghost"
        >
          <RotateCcw className="size-4" />
          Reset view
        </Button>
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <select
        className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
