export interface TemplateHoliday {
  name: string;
  date: string; // YYYY-MM-DD format for current/upcoming year
  type: 'national' | 'state' | 'festival';
}

export interface HolidayPreset {
  id: string;
  name: string;
  region: string;
  description: string;
  holidays: { name: string; month: number; day: number; type: 'national' | 'state' | 'festival' }[];
}

export const HOLIDAY_PRESETS: Record<string, HolidayPreset> = {
  india_central: {
    id: 'india_central',
    name: 'India Central Gazetted (Statutory Standard)',
    region: 'All India',
    description: 'Mandatory national holidays plus major national gazetted festive days.',
    holidays: [
      { name: 'Republic Day', month: 1, day: 26, type: 'national' },
      { name: 'Maha Shivratri', month: 3, day: 8, type: 'festival' },
      { name: 'Holi', month: 3, day: 25, type: 'festival' },
      { name: 'Good Friday', month: 3, day: 29, type: 'festival' },
      { name: 'Eid ul-Fitr', month: 4, day: 11, type: 'festival' },
      { name: 'Buddha Purnima', month: 5, day: 23, type: 'festival' },
      { name: 'Muharram', month: 7, day: 17, type: 'festival' },
      { name: 'Independence Day', month: 8, day: 15, type: 'national' },
      { name: 'Milad un-Nabi', month: 9, day: 16, type: 'festival' },
      { name: 'Mahatma Gandhi Jayanti', month: 10, day: 2, type: 'national' },
      { name: 'Dussehra / Vijayadashami', month: 10, day: 12, type: 'festival' },
      { name: 'Diwali (Deepavali)', month: 11, day: 1, type: 'festival' },
      { name: 'Guru Nanak Jayanti', month: 11, day: 15, type: 'festival' },
      { name: 'Christmas Day', month: 12, day: 25, type: 'festival' },
    ],
  },
  india_maharashtra: {
    id: 'india_maharashtra',
    name: 'Maharashtra State & Mumbai Corporate',
    region: 'Maharashtra (Mumbai / Pune)',
    description: 'Central holidays plus Maharashtra Day, Gudi Padwa, and Ganesh Chaturthi.',
    holidays: [
      { name: 'Republic Day', month: 1, day: 26, type: 'national' },
      { name: 'Chhatrapati Shivaji Maharaj Jayanti', month: 2, day: 19, type: 'state' },
      { name: 'Gudi Padwa', month: 4, day: 9, type: 'state' },
      { name: 'Dr. B.R. Ambedkar Jayanti', month: 4, day: 14, type: 'national' },
      { name: 'Maharashtra Day / May Day', month: 5, day: 1, type: 'state' },
      { name: 'Independence Day', month: 8, day: 15, type: 'national' },
      { name: 'Ganesh Chaturthi', month: 9, day: 7, type: 'state' },
      { name: 'Mahatma Gandhi Jayanti', month: 10, day: 2, type: 'national' },
      { name: 'Dussehra', month: 10, day: 12, type: 'festival' },
      { name: 'Diwali (Laxmi Pujan)', month: 11, day: 1, type: 'festival' },
      { name: 'Diwali (Balipratipada)', month: 11, day: 2, type: 'festival' },
      { name: 'Christmas Day', month: 12, day: 25, type: 'festival' },
    ],
  },
  india_karnataka: {
    id: 'india_karnataka',
    name: 'Karnataka State & Bengaluru IT',
    region: 'Karnataka (Bengaluru)',
    description: 'Central holidays plus Karnataka Rajyotsava, Ugadi, and Ayudha Puja.',
    holidays: [
      { name: 'Republic Day', month: 1, day: 26, type: 'national' },
      { name: 'Maha Shivaratri', month: 3, day: 8, type: 'festival' },
      { name: 'Ugadi', month: 4, day: 9, type: 'state' },
      { name: 'Dr. B.R. Ambedkar Jayanti', month: 4, day: 14, type: 'national' },
      { name: 'May Day', month: 5, day: 1, type: 'festival' },
      { name: 'Independence Day', month: 8, day: 15, type: 'national' },
      { name: 'Ganesh Chaturthi', month: 9, day: 7, type: 'festival' },
      { name: 'Gandhi Jayanti', month: 10, day: 2, type: 'national' },
      { name: 'Mahanavami / Ayudha Puja', month: 10, day: 11, type: 'state' },
      { name: 'Vijayadashami', month: 10, day: 12, type: 'festival' },
      { name: 'Karnataka Rajyotsava', month: 11, day: 1, type: 'state' },
      { name: 'Deepavali', month: 11, day: 2, type: 'festival' },
      { name: 'Christmas', month: 12, day: 25, type: 'festival' },
    ],
  },
};

export function getResolvedHolidaysForYear(presetId: string, year: number): { name: string; date: string }[] {
  const preset = HOLIDAY_PRESETS[presetId] || HOLIDAY_PRESETS.india_central;
  return preset.holidays.map(h => {
    const mm = String(h.month).padStart(2, '0');
    const dd = String(h.day).padStart(2, '0');
    return {
      name: h.name,
      date: `${year}-${mm}-${dd}`,
    };
  });
}
