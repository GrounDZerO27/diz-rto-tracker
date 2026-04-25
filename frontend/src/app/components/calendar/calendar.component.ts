import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RtoService } from '../../services/rto.service';
import { MonthlyData, CalendarDay, RtoStats } from '../../models/rto.models';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements OnInit {
  today = new Date();
  selectedYear: number = this.today.getFullYear();
  selectedMonth: number = this.today.getMonth() + 1; // 1-based

  monthlyData: MonthlyData | null = null;
  calendarWeeks: CalendarDay[][] = [];
  stats: RtoStats = { expectedDays: 0, actualDays: 0, percentage: 0, approvedAbsences: 0 };

  loading = false;
  checkingIn = false;
  loggingLeave = false;
  errorMessage = '';
  successMessage = '';
  selectedDay: CalendarDay | null = null;
  modalLoading = false;

  years: number[] = [];
  monthNames = MONTH_NAMES;

  ngOnInit(): void {
    // Build year range: current year ± 2
    const y = this.today.getFullYear();
    this.years = [y - 2, y - 1, y, y + 1, y + 2];
    this.loadData();
  }

  constructor(private rtoService: RtoService) {}

  get currentMonthName(): string {
    return MONTH_NAMES[this.selectedMonth - 1];
  }

  get todayStr(): string {
    return this.formatDate(this.today);
  }

  get isCurrentMonth(): boolean {
    return this.selectedYear === this.today.getFullYear() &&
           this.selectedMonth === (this.today.getMonth() + 1);
  }

  get todayAlreadyCheckedIn(): boolean {
    if (!this.isCurrentMonth) return false;
    return this.calendarWeeks.some(week =>
      week.some(day => day.isToday && day.isInOffice)
    );
  }

  get todayAlreadyOnLeave(): boolean {
    if (!this.isCurrentMonth) return false;
    return this.calendarWeeks.some(week =>
      week.some(day => day.isToday && day.isApprovedAbsence)
    );
  }

  get todayIsRtoDay(): boolean {
    const dow = this.today.getDay();
    return dow === 2 || dow === 3 || dow === 4; // Tue–Thu
  }

  onMonthChange(): void {
    this.loadData();
  }

  prevMonth(): void {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.loadData();
  }

  nextMonth(): void {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.rtoService.getMonthlyData(this.selectedYear, this.selectedMonth).subscribe({
      next: (data) => {
        this.monthlyData = data;
        this.stats = data.stats;
        this.calendarWeeks = this.buildCalendar(data);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load data. Make sure the backend is running.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  checkInToday(): void {
    this.checkingIn = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.rtoService.checkIn(undefined, 'IN_OFFICE').subscribe({
      next: () => {
        this.successMessage = `✅ Check-in recorded for ${this.formatDisplayDate(this.today)}!`;
        this.checkingIn = false;
        this.loadData();
        setTimeout(() => (this.successMessage = ''), 4000);
      },
      error: (err) => {
        this.errorMessage = 'Check-in failed. Please try again.';
        this.checkingIn = false;
        console.error(err);
      },
    });
  }

  logLeaveToday(): void {
    this.loggingLeave = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.rtoService.checkIn(undefined, 'APPROVED_ABSENCE').subscribe({
      next: () => {
        this.successMessage = `🏖 Approved leave logged for ${this.formatDisplayDate(this.today)}!`;
        this.loggingLeave = false;
        this.loadData();
        setTimeout(() => (this.successMessage = ''), 4000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to log leave. Please try again.';
        this.loggingLeave = false;
        console.error(err);
      },
    });
  }

  /**
   * Opens the action modal for a day cell.
   */
  openDayModal(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.isWeekend || day.isHoliday) return;
    this.selectedDay = day;
  }

  closeDayModal(): void {
    this.selectedDay = null;
  }

  setDayStatus(status: 'IN_OFFICE' | 'APPROVED_ABSENCE'): void {
    if (!this.selectedDay) return;
    const day = this.selectedDay;
    this.modalLoading = true;
    this.rtoService.checkIn(day.date, status).subscribe({
      next: () => {
        this.loadData();
        this.modalLoading = false;
        this.closeDayModal();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update record.';
        this.modalLoading = false;
        console.error(err);
      },
    });
  }

  clearDay(): void {
    if (!this.selectedDay) return;
    const day = this.selectedDay;
    this.modalLoading = true;
    this.rtoService.removeAttendance(day.date).subscribe({
      next: () => {
        this.loadData();
        this.modalLoading = false;
        this.closeDayModal();
      },
      error: (err) => {
        this.errorMessage = 'Failed to remove record.';
        this.modalLoading = false;
        console.error(err);
      },
    });
  }

  getDayLabel(day: CalendarDay): string {
    const d = new Date(day.date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  getPercentageColor(): string {
    if (this.stats.percentage >= 90) return '#16a34a';
    if (this.stats.percentage >= 70) return '#d97706';
    return '#dc2626';
  }

  getPercentageLabel(): string {
    if (this.stats.percentage >= 90) return 'On Track';
    if (this.stats.percentage >= 70) return 'Needs Improvement';
    return 'At Risk';
  }

  // ────────────────────────────────────────────
  // Calendar builder
  // ────────────────────────────────────────────

  get approvedAbsencesCount(): number {
    return this.stats.approvedAbsences ?? 0;
  }

  private buildCalendar(data: MonthlyData): CalendarDay[][] {
    const inOfficeSet = new Set(data.attendance.filter(a => a.status === 'IN_OFFICE').map(a => a.date));
    const absenceSet = new Set(data.attendance.filter(a => a.status === 'APPROVED_ABSENCE').map(a => a.date));
    const holidayMap = new Map(data.holidays.map(h => [h.date, h.name]));
    // Expose approved absences count in stats
    this.stats = { ...data.stats, approvedAbsences: absenceSet.size };

    const year = data.year;
    const month = data.month;
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = this.formatDate(this.today);

    // Find first Monday on or before the 1st of the month
    const firstDay = new Date(year, month - 1, 1);
    // getDay(): 0=Sun,1=Mon,...,6=Sat
    // We display Mon–Fri, so start the calendar on the Monday of the week containing the 1st
    let startOffset = firstDay.getDay(); // 0=Sun
    // Convert to Mon-based: Mon=0, Tue=1, ... Sun=6
    const monBasedOffset = (startOffset + 6) % 7;

    const allDays: CalendarDay[] = [];

    // Pad with days from previous month (Mon–Fri only in display, but we build full weeks)
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    for (let i = monBasedOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(year, month - 2, d, 12);
      allDays.push(this.makeDay(date, false, todayStr, inOfficeSet, absenceSet, holidayMap));
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d, 12);
      allDays.push(this.makeDay(date, true, todayStr, inOfficeSet, absenceSet, holidayMap));
    }

    // Pad end to complete last week (7-day weeks)
    let nextD = 1;
    while (allDays.length % 7 !== 0) {
      const date = new Date(year, month, nextD++, 12);
      allDays.push(this.makeDay(date, false, todayStr, inOfficeSet, absenceSet, holidayMap));
    }

    // Split into weeks, keeping only Mon–Fri columns
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const week = allDays.slice(i, i + 7);
      // Only include Mon(0)–Fri(4) positions (mon-based offset)
      const weekdaysOnly = week.filter((_, idx) => idx < 5);
      weeks.push(weekdaysOnly);
    }
    return weeks;
  }

  private makeDay(
    date: Date,
    isCurrentMonth: boolean,
    todayStr: string,
    inOfficeSet: Set<string>,
    absenceSet: Set<string>,
    holidayMap: Map<string, string>
  ): CalendarDay {
    const dateStr = this.formatDate(date);
    const dow = date.getDay(); // 0=Sun
    const isWeekend = dow === 0 || dow === 6;
    const isRtoDay = dow === 2 || dow === 3 || dow === 4; // Tue–Thu
    const isHoliday = holidayMap.has(dateStr);
    return {
      date: dateStr,
      dayNumber: date.getDate(),
      dayOfWeek: dow,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isWeekend,
      isRtoDay,
      isInOffice: inOfficeSet.has(dateStr),
      isApprovedAbsence: absenceSet.has(dateStr),
      isHoliday,
      holidayName: holidayMap.get(dateStr),
      isPast: dateStr < todayStr,
    };
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
