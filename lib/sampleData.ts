import { AttendanceRecord, UploadedMonth } from './types';

export function generateSampleDataset(): {
  month: UploadedMonth;
  records: AttendanceRecord[];
} {
  const officeCode = 'MUMBAI';
  const year = '2026';
  const monthStr = '09';
  const monthKey = `${year}-${monthStr}_${officeCode}`;

  const month: UploadedMonth = {
    key: monthKey,
    label: 'September 2026 (MUMBAI Sample)',
    officeCode,
    month: monthStr,
    year,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleStaff = [
    { code: 'EMP101', name: 'Aarav Sharma', dept: 'Engineering' },
    { code: 'EMP102', name: 'Diya Patel', dept: 'Engineering' },
    { code: 'EMP103', name: 'Rohan Gupta', dept: 'Engineering' },
    { code: 'EMP104', name: 'Pooja Iyer', dept: 'Engineering' },
    { code: 'EMP105', name: 'Vikram Joshi', dept: 'Engineering' },
    { code: 'EMP201', name: 'Sanjay Deshmukh', dept: 'Operations' },
    { code: 'EMP202', name: 'Ananya Nair', dept: 'Operations' },
    { code: 'EMP203', name: 'Karan Malhotra', dept: 'Operations' },
    { code: 'EMP204', name: 'Neha Kulkarni', dept: 'Operations' },
    { code: 'EMP205', name: 'Rajesh Sen', dept: 'Operations' },
    { code: 'EMP301', name: 'Priya Verma', dept: 'Sales' },
    { code: 'EMP302', name: 'Arjun Mehta', dept: 'Sales' },
    { code: 'EMP303', name: 'Tanvi Chawla', dept: 'Sales' },
    { code: 'EMP304', name: 'Rahul Roy', dept: 'Sales' },
    { code: 'EMP305', name: 'Sneha Bansal', dept: 'Sales' },
  ];

  const records: AttendanceRecord[] = [];
  const daysInMonth = 30;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = `${year}-${monthStr}-${dayStr}`;
    const dateObj = new Date(Date.UTC(2026, 8, day)); // Sept 2026
    const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const emp of sampleStaff) {
      if (isWeekend) {
        records.push({
          date,
          employeeCode: emp.code,
          employeeName: emp.name,
          department: emp.dept,
          inTime: '',
          outTime: '',
          status: 'WO',
          duration: '00:00',
          lateBy: '00:00',
          earlyBy: '00:00',
          officeCode,
        });
        continue;
      }

      // Friday/Monday sandwich sample case on day 18 (Fri) & 21 (Mon) for EMP103
      if (emp.code === 'EMP103' && (day === 18 || day === 21)) {
        records.push({
          date,
          employeeCode: emp.code,
          employeeName: emp.name,
          department: emp.dept,
          inTime: '',
          outTime: '',
          status: 'PL',
          duration: '00:00',
          lateBy: '00:00',
          earlyBy: '00:00',
          officeCode,
        });
        continue;
      }

      // Late mark simulation for EMP302 on day 8 and 15
      const isLate = (emp.code === 'EMP302' && (day === 8 || day === 15)) || (emp.code === 'EMP201' && day === 12);
      const inTime = isLate ? '09:42' : '09:12';
      const outTime = '18:30';
      const lateBy = isLate ? '00:27' : '00:00';
      const duration = isLate ? '08:48' : '09:18';

      records.push({
        date,
        employeeCode: emp.code,
        employeeName: emp.name,
        department: emp.dept,
        inTime,
        outTime,
        status: 'P',
        duration,
        lateBy,
        earlyBy: '00:00',
        officeCode,
        punchCount: 2,
      });
    }
  }

  return { month, records };
}
