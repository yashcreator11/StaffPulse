export interface DemoEmployee {
  employee_code: string;
  full_name: string;
  email: string;
  department: string;
  office: string;
  role: 'employee' | 'lead' | 'manager' | 'hr';
  job_title: string;
}

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  { employee_code: 'DEMO001', full_name: 'Aarav Patel', email: 'aarav.patel@example.com', department: 'Engineering', office: 'MUM', role: 'manager', job_title: 'Engineering Director' },
  { employee_code: 'DEMO002', full_name: 'Diya Sharma', email: 'diya.sharma@example.com', department: 'Engineering', office: 'MUM', role: 'lead', job_title: 'Tech Lead' },
  { employee_code: 'DEMO003', full_name: 'Vihaan Rao', email: 'vihaan.rao@example.com', department: 'Engineering', office: 'MUM', role: 'employee', job_title: 'Senior Frontend Dev' },
  { employee_code: 'DEMO004', full_name: 'Ananya Iyer', email: 'ananya.iyer@example.com', department: 'Engineering', office: 'PUN', role: 'employee', job_title: 'Backend Engineer' },
  { employee_code: 'DEMO005', full_name: 'Rohan Mehta', email: 'rohan.mehta@example.com', department: 'Product', office: 'MUM', role: 'lead', job_title: 'Principal PM' },
  { employee_code: 'DEMO006', full_name: 'Ishaan Verma', email: 'ishaan.verma@example.com', department: 'Product', office: 'PUN', role: 'employee', job_title: 'Associate PM' },
  { employee_code: 'DEMO007', full_name: 'Sanya Gupta', email: 'sanya.gupta@example.com', department: 'Design', office: 'MUM', role: 'lead', job_title: 'Lead Product Designer' },
  { employee_code: 'DEMO008', full_name: 'Kabir Joshi', email: 'kabir.joshi@example.com', department: 'Design', office: 'PUN', role: 'employee', job_title: 'UI Designer' },
  { employee_code: 'DEMO009', full_name: 'Meera Nair', email: 'meera.nair@example.com', department: 'Operations', office: 'MUM', role: 'manager', job_title: 'Operations Manager' },
  { employee_code: 'DEMO010', full_name: 'Arjun Das', email: 'arjun.das@example.com', department: 'Operations', office: 'PUN', role: 'employee', job_title: 'Logistics Coordinator' },
];

/**
 * Generates sample biometric attendance rows for demo employees across the specified year & month.
 */
export function generateDemoAttendance(
  orgId: string,
  employees: DemoEmployee[],
  year: number,
  month: number
) {
  const monthStr = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const records: any[] = [];

  for (const emp of employees) {
    for (let day = 1; day <= Math.min(daysInMonth, 22); day++) {
      const dayStr = String(day).padStart(2, '0');
      const date = `${year}-${monthStr}-${dayStr}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();

      // Skip Sundays (0) and Saturdays (6)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Realistic variation: mostly present, occasionally late, rarely absent
      const rand = (day * 13 + emp.employee_code.charCodeAt(6)) % 100;
      let status = 'Present';
      let inTime = '09:25';
      let outTime = '18:35';
      let lateBy = '0:00';
      let duration = '9:10';

      if (rand < 5) {
        status = 'Absent';
        inTime = '';
        outTime = '';
        duration = '0:00';
      } else if (rand < 15) {
        status = 'Present';
        inTime = '10:05';
        lateBy = '0:35';
        duration = '8:30';
      } else if (rand < 20) {
        status = 'Missed Punch Out';
        inTime = '09:20';
        outTime = '';
        duration = '0:00';
      }

      records.push({
        org_id: orgId,
        month_key: `${year}_${monthStr}_${emp.office}`,
        employee_code: emp.employee_code,
        employee_name: emp.full_name,
        department: emp.department,
        office_code: emp.office,
        date,
        in_time: inTime || null,
        out_time: outTime || null,
        status,
        late_by: lateBy,
        early_by: '0:00',
        duration,
        punch_count: inTime ? (outTime ? 2 : 1) : 0,
      });
    }
  }

  return records;
}
