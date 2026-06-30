import { Search } from "lucide-react";
import type { ResumeSortKey, ResumeStatusFilter } from "@/lib/resume-utils";
import { Input } from "@/components/ui/input";

const tabs: ResumeStatusFilter[] = ["All", "Active", "Draft"];

export function ResumeFilters({ search, status, sort, counts, onSearch, onStatus, onSort }: {
  search: string;
  status: ResumeStatusFilter;
  sort: ResumeSortKey;
  counts: Record<ResumeStatusFilter, number>;
  onSearch: (value: string) => void;
  onStatus: (value: ResumeStatusFilter) => void;
  onSort: (value: ResumeSortKey) => void;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-2" aria-label="Resume status filter">
        {tabs.map((tab) => <button className={`rounded-xl border px-3 py-2 text-sm transition ${status === tab ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.025] text-slate-400 hover:bg-white/5 hover:text-white"}`} key={tab} onClick={() => onStatus(tab)} type="button">{tab} <span className="ml-1 text-xs opacity-60">{counts[tab]}</span></button>)}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-72"><span className="sr-only">Search resumes</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" /><Input className="pl-9" onChange={(event) => onSearch(event.target.value)} placeholder="Search resumes" value={search} /></label>
        <label><span className="sr-only">Sort resumes</span><select className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 sm:w-56" onChange={(event) => onSort(event.target.value as ResumeSortKey)} value={sort}><option value="updated">Last updated newest</option><option value="keyword">Keyword match highest</option><option value="applications">Applications used highest</option><option value="name">Name A-Z</option></select></label>
      </div>
    </div>
  );
}
