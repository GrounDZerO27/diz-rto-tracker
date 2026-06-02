export interface AttendanceRecord {
  date: string;   // YYYY-MM-DD
  status: 'IN_OFFICE' | 'APPROVED_ABSENCE';
}

export interface Holiday {
  date: string;   // YYYY-MM-DD
  name: string;
  isShared?: boolean;
}

export interface RtoStats {
  expectedDays: number;
  actualDays: number;
  percentage: number;
  approvedAbsences?: number;
}

export interface MonthlyData {
  year: number;
  month: number;
  attendance: AttendanceRecord[];
  holidays: Holiday[];
  stats: RtoStats;
}

export interface YtdData {
  year: number;
  month: number;
  ytdActualDays: number;
  ytdExpectedDays: number;
  ytdPercentage: number;
}

export interface CalendarDay {
  date: string;          // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: number;     // 0=Sun … 6=Sat
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isRtoDay: boolean;     // Tue–Thu
  isInOffice: boolean;
  isApprovedAbsence: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isSharedHoliday?: boolean;
  isPast: boolean;
}

export interface AuthResponse {
  token: string;
  fullName: string;
  employeeNo: string;
}

export interface RegisterPayload {
  fullName: string;
  employeeNo: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  employeeNo: string;
  password: string;
}
