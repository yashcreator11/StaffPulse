'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Building,
  UserX,
  ArrowRight,
  TrendingUp,
  Search,
} from 'lucide-react';

interface DayMetrics {
  date: string;
  totalExpected: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  wfhCount: number;
  lateArrivalsCount: number;
  earlyDeparturesCount: number;
  isHolidayOrWeekend: boolean;
  holidayName?: string;
  latePunches: Array<{
    employeeCode: string;
    employeeName: string;
    group: string;
    firstInTime: string;
    minutesLate: number;
  }>;
  arrivalTimeline: Array<{
    timeSlot: string;
    count: number;
  }>;
}

export default function RichDayView({ groupLabel = 'Department' }: { groupLabel?: string }) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [metrics, setMetrics] = useState<DayMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDayMetrics(selectedDate);
  }, [selectedDate]);

  async function loadDayMetrics(dateStr: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/day-view?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setDateShortcut(type: 'today' | 'yesterday' | 'prev_workday') {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    } else if (type === 'prev_workday') {
      const day = d.getDay();
      const diff = day === 1 ? 3 : day === 0 ? 2 : 1; // if Monday, go to Friday
      d.setDate(d.getDate() - diff);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  const attendancePercent =
    metrics && metrics.totalExpected > 0
      ? Math.round((metrics.presentCount / metrics.totalExpected) * 100)
      : 0;

  const filteredLatePunches = (metrics?.latePunches || []).filter(
    (p) =>
      p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Date Bar & Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDateShortcut('today')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedDate === new Date().toISOString().split('T')[0]
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateShortcut('yesterday')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setDateShortcut('prev_workday')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Previous Working Day
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      ) : metrics?.isHolidayOrWeekend ? (
        /* Holiday / Weekend Banner State */
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Coffee className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {metrics.holidayName ? `Holiday: ${metrics.holidayName}` : 'Weekly Off / Non-Working Day'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No standard office attendance is expected on {selectedDate}. System calculations are normalized
            without marking automated absences.
          </p>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Expected */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Expected Workforce</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {metrics?.totalExpected || 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Total active headcount</div>
            </div>

            {/* Present Today */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Present In Office</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {metrics?.presentCount || 0}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                {attendancePercent}% attendance rate
              </div>
            </div>

            {/* Approved Leave / WFH */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">On Leave / WFH</span>
                <Building className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {(metrics?.onLeaveCount || 0) + (metrics?.wfhCount || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {metrics?.onLeaveCount || 0} Leave · {metrics?.wfhCount || 0} WFH
              </div>
            </div>

            {/* Unexcused Absences */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Unexcused Absences</span>
                <UserX className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {metrics?.absentCount || 0}
              </div>
              <div className="mt-1 text-[11px] text-rose-600 font-medium">Pending regularization</div>
            </div>

            {/* Late Marks */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Late Arrivals</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {metrics?.lateArrivalsCount || 0}
              </div>
              <div className="mt-1 text-[11px] text-amber-600 font-medium">&gt; 9:30 AM punch in</div>
            </div>
          </div>

          {/* Arrival Distribution Timeline */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Punch In Arrival Time Distribution
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(metrics?.arrivalTimeline || []).map((slot, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-4"
                >
                  <div className="text-xs font-medium text-slate-500">{slot.timeSlot}</div>
                  <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                    {slot.count}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">check-ins recorded</div>
                </div>
              ))}
            </div>
          </div>

          {/* Late Arrivals Detailed List */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Late In-Punches ({metrics?.lateArrivalsCount || 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Staff members who arrived after standard grace period on {selectedDate}.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredLatePunches.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No late arrivals recorded for this date.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">{groupLabel}</th>
                      <th className="py-3 px-4">Punch In Time</th>
                      <th className="py-3 px-4 text-right">Minutes Late</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLatePunches.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {item.employeeName}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">{item.employeeCode}</td>
                        <td className="py-3 px-4">{item.group}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                          {item.firstInTime}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-rose-600">
                          +{item.minutesLate}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
