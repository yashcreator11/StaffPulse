import { describe, it, expect, vi } from 'vitest';
import {
  getDashboardConfig,
  getSingleDayMetrics,
} from '../../lib/dashboard/dashboardConfigService';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: (table: string) => {
        if (table === 'dashboard_configs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    org_id: 'org_test_1',
                    group_label: 'Squad',
                    default_view: 'today',
                    enabled_widgets: { kpiCards: true, trendChart: true },
                    min_group_size: 4,
                    max_comparison_groups: 6,
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'employees') {
          return {
            select: () => ({
              eq: () => ({
                neq: async () => ({
                  data: [
                    { id: '1', employee_code: 'E01', name: 'Alice', department: 'Squad Alpha' },
                    { id: '2', employee_code: 'E02', name: 'Bob', department: 'Squad Beta' },
                  ],
                }),
              }),
            }),
          };
        }
        if (table === 'holidays') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [], // not a holiday
                }),
              }),
            }),
          };
        }
        if (table === 'attendance_records') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      employee_code: 'E01',
                      first_in: '09:15:00',
                      last_out: '18:00:00',
                      status: 'Present',
                      is_late: false,
                    },
                    {
                      employee_code: 'E02',
                      first_in: '09:55:00',
                      last_out: '18:30:00',
                      status: 'Present',
                      is_late: true,
                    },
                  ],
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        };
      },
    }),
  };
});

describe('Section N: Dashboard Adaptability & Rich Day View', () => {
  it('loads tenant custom group label and widget configurations', async () => {
    const config = await getDashboardConfig('org_test_1');
    expect(config.groupLabel).toBe('Squad');
    expect(config.defaultView).toBe('today');
    expect(config.minGroupSize).toBe(4);
    expect(config.maxComparisonGroups).toBe(6);
  });

  it('computes accurate single-day attendance metrics and late punches', async () => {
    const metrics = await getSingleDayMetrics('org_test_1', '2026-10-23');
    expect(metrics.date).toBe('2026-10-23');
    expect(metrics.totalExpected).toBe(2);
    expect(metrics.presentCount).toBe(2);
    expect(metrics.lateArrivalsCount).toBe(1);
    expect(metrics.latePunches[0].employeeCode).toBe('E02');
    expect(metrics.isHolidayOrWeekend).toBe(false);
    expect(metrics.arrivalTimeline).toBeDefined();
    expect(metrics.arrivalTimeline.length).toBeGreaterThan(0);
  });
});
