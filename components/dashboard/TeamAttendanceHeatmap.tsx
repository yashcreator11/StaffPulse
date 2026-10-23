'use client';

import React, { useState } from 'react';
import { Calendar, Users, AlertCircle, Info } from 'lucide-react';

export interface HeatmapCell {
  date: string;
  isHolidayOrWeekend: boolean;
  totalExpected: number;
  present: number;
  absent: number;
  onLeave: number;
}

export interface TeamHeatmapRow {
  teamName: string;
  headcount: number;
  dates: Record<string, HeatmapCell>;
}

interface TeamAttendanceHeatmapProps {
  teams: TeamHeatmapRow[];
  dateRange: string[]; // YYYY-MM-DD
  minGroupSize?: number;
  onSelectCell?: (team: string, date: string) => void;
}

export default function TeamAttendanceHeatmap({
  teams,
  dateRange,
  minGroupSize = 3,
  onSelectCell,
}: TeamAttendanceHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    team: string;
    date: string;
    data: HeatmapCell;
    x: number;
    y: number;
  } | null>(null);

  if (!teams || teams.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-center text-xs text-[var(--text-muted)]">
        No team structure defined for this view.
      </div>
    );
  }

  const getCellColor = (cell?: HeatmapCell, headcount: number = 0) => {
    if (!cell) return 'bg-slate-100 dark:bg-slate-800/40 text-slate-400';
    if (cell.isHolidayOrWeekend) {
      return 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700';
    }
    if (headcount < minGroupSize) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-amber-500/30';
    }
    if (cell.totalExpected === 0) {
      return 'bg-slate-100 dark:bg-slate-800/50 text-slate-400';
    }

    const rate = (cell.present / cell.totalExpected) * 100;
    if (rate >= 90) {
      return 'bg-emerald-500 text-white font-medium shadow-sm hover:brightness-110';
    }
    if (rate >= 75) {
      return 'bg-amber-500 text-white font-medium shadow-sm hover:brightness-110';
    }
    return 'bg-rose-500 text-white font-medium shadow-sm hover:brightness-110';
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Team Attendance Heatmap
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Attendance rate distribution by team across date window
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> ≥90%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 75–89%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> &lt;75%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 border border-dashed border-slate-400 inline-block" /> Off
          </span>
        </div>
      </div>

      {/* Heatmap Grid (Scrollable) */}
      <div className="overflow-x-auto pb-2">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--bg-card)] text-left py-2 px-3 font-semibold text-[var(--text-secondary)] border-b border-[var(--border)] min-w-[140px]">
                Team ({teams.length})
              </th>
              {dateRange.map((d) => {
                const dayNum = d.slice(8);
                const monthStr = new Date(`${d}T00:00:00Z`).toLocaleString('en-US', { month: 'short' });
                return (
                  <th
                    key={d}
                    className="py-2 px-1 text-center font-mono text-[10px] text-[var(--text-muted)] border-b border-[var(--border)] min-w-[34px]"
                  >
                    <div>{dayNum}</div>
                    <div className="text-[9px] uppercase tracking-tighter opacity-70">{monthStr}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {teams.map((t) => {
              const isSmall = t.headcount < minGroupSize;
              return (
                <tr key={t.teamName} className="hover:bg-[var(--bg-secondary)]/40 transition">
                  <td className="sticky left-0 z-10 bg-[var(--bg-card)] py-2 px-3 font-medium text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[120px]">{t.teamName}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        ({t.headcount})
                      </span>
                      {isSmall && (
                        <span title={`Headcount under ${minGroupSize} — rate suppressed`}>
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>

                  {dateRange.map((d) => {
                    const cell = t.dates[d];
                    const colorClass = getCellColor(cell, t.headcount);
                    const rate =
                      cell && cell.totalExpected > 0
                        ? Math.round((cell.present / cell.totalExpected) * 100)
                        : null;

                    return (
                      <td key={d} className="p-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectCell?.(t.teamName, d)}
                          onMouseEnter={(e) => {
                            if (cell) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                team: t.teamName,
                                date: d,
                                data: cell,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-7 h-7 rounded-md transition flex items-center justify-center text-[10px] cursor-pointer ${colorClass}`}
                        >
                          {cell?.isHolidayOrWeekend ? (
                            '–'
                          ) : isSmall ? (
                            '•'
                          ) : rate !== null ? (
                            `${rate}`
                          ) : (
                            '–'
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs min-w-[180px] border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: hoveredCell.x, top: hoveredCell.y - 8 }}
        >
          <div className="font-bold text-xs pb-1 mb-1 border-b border-slate-800 flex justify-between">
            <span>{hoveredCell.team}</span>
            <span className="font-mono text-slate-400">{hoveredCell.date}</span>
          </div>

          {hoveredCell.data.isHolidayOrWeekend ? (
            <p className="text-slate-400 italic">Holiday / Weekly Off — No attendance expected</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Present:</span>
                <span className="font-semibold text-emerald-400">{hoveredCell.data.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Absent (unauthorized):</span>
                <span className="font-semibold text-rose-400">{hoveredCell.data.absent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">On Approved Leave:</span>
                <span className="font-semibold text-sky-400">{hoveredCell.data.onLeave}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-300">Expected:</span>
                <span className="font-bold">{hoveredCell.data.totalExpected}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
