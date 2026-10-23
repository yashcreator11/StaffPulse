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
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-500" />
            {groupLabel} Performance Rankings &amp; Scale
          </h3>
          <p className="text-xs text-slate-500">
            Top &amp; bottom {groupLabel.toLowerCase()}s by attendance rate with small group rate suppression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Filter ${groupLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{team.teamName}</span>
                    <span className="ml-2 text-[11px] text-slate-400">({team.headcount} staff)</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
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
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{team.teamName}</span>
                    <span className="ml-2 text-[11px] text-slate-400">({team.headcount} staff)</span>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                    {team.attendanceRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded All Teams Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">{groupLabel}</th>
                <th className="py-3 px-4">Headcount</th>
                <th className="py-3 px-4">Present</th>
                <th className="py-3 px-4">Late Marks</th>
                <th className="py-3 px-4 text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedDescending.map((team, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {team.teamName}
                  </td>
                  <td className="py-3 px-4">{team.headcount}</td>
                  <td className="py-3 px-4">{team.presentCount}</td>
                  <td className="py-3 px-4 text-amber-600 font-semibold">{team.lateCount}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
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
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-xs">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">
              Small Group Statistical Rate Suppression:
            </span>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
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
