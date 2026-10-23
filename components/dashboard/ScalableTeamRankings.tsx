'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building,
} from 'lucide-react';

export interface TeamAttendanceStat {
  teamName: string;
  headcount: number;
  attendanceRate: number; // 0 to 100
  presentCount: number;
  lateCount: number;
}

interface ScalableTeamRankingsProps {
  teams: TeamAttendanceStat[];
  defaultN?: number;
  minGroupSizeThreshold?: number;
  groupLabel?: string;
}

export default function ScalableTeamRankings({
  teams,
  defaultN = 5,
  minGroupSizeThreshold = 3,
  groupLabel = 'Department',
}: ScalableTeamRankingsProps) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTeams = teams.filter((t) =>
    t.teamName.toLowerCase().includes(search.toLowerCase())
  );

  // Separate valid teams from suppressed small teams
  const eligibleTeams = filteredTeams.filter((t) => t.headcount >= minGroupSizeThreshold);
  const suppressedTeams = filteredTeams.filter((t) => t.headcount < minGroupSizeThreshold);

  // Sort descending by attendance rate
  const sortedDescending = [...eligibleTeams].sort((a, b) => b.attendanceRate - a.attendanceRate);
  const sortedAscending = [...eligibleTeams].sort((a, b) => a.attendanceRate - b.attendanceRate);

  const topN = sortedDescending.slice(0, defaultN);
  const bottomN = sortedAscending.slice(0, defaultN);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Building className="h-4 w-4 text-[var(--accent)]" />
            {groupLabel} Performance Rankings &amp; Scale
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Top &amp; bottom {groupLabel.toLowerCase()}s by attendance rate with small group rate suppression.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={`Filter ${groupLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-auto pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] transition shrink-0"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show Top {defaultN}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show All ({filteredTeams.length})
              </>
            )}
          </button>
        </div>
      </div>

      {!showAll ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Performing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              Highest Attendance Rates (Top {Math.min(defaultN, topN.length)})
            </div>

            <div className="space-y-2">
              {topN.map((team, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-[var(--text-primary)] block sm:inline truncate">{team.teamName}</span>
                    <span className="text-[11px] text-[var(--text-muted)] sm:ml-2">({team.headcount} staff)</span>
                  </div>
                  <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    {team.attendanceRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Attention Needed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
              Attention Required (Bottom {Math.min(defaultN, bottomN.length)})
            </div>

            <div className="space-y-2">
              {bottomN.map((team, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-[var(--text-primary)] block sm:inline truncate">{team.teamName}</span>
                    <span className="text-[11px] text-[var(--text-muted)] sm:ml-2">({team.headcount} staff)</span>
                  </div>
                  <span className="shrink-0 font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                    {team.attendanceRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded All Teams Table */
        <div className="responsive-table-wrapper rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-left text-xs text-[var(--text-secondary)]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="py-3 px-4">{groupLabel}</th>
                <th className="py-3 px-4">Headcount</th>
                <th className="py-3 px-4">Present</th>
                <th className="py-3 px-4">Late Marks</th>
                <th className="py-3 px-4 text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedDescending.map((team, i) => (
                <tr key={i} className="hover:bg-[var(--bg-elevated)] transition">
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {team.teamName}
                  </td>
                  <td className="py-3 px-4">{team.headcount}</td>
                  <td className="py-3 px-4">{team.presentCount}</td>
                  <td className="py-3 px-4 text-amber-500 font-semibold">{team.lateCount}</td>
                  <td className="py-3 px-4 text-right font-bold text-[var(--text-primary)]">
                    {team.attendanceRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Small Group Rate Suppression Notice */}
      {suppressedTeams.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3 text-xs">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Small Group Statistical Rate Suppression:
            </span>
            <p className="mt-0.5 text-[var(--text-muted)]">
              {suppressedTeams.length} {groupLabel.toLowerCase()}(s) have fewer than{' '}
              {minGroupSizeThreshold} members ({suppressedTeams.map((s) => s.teamName).join(', ')}).
              Attendance percentage rates are suppressed to avoid statistical skew.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
