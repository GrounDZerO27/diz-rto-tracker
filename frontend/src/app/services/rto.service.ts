import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MonthlyData, Holiday } from '../models/rto.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RtoService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  getMonthlyData(year: number, month: number): Observable<MonthlyData> {
    return this.http.get<MonthlyData>(
      `${this.api}/attendance?year=${year}&month=${month}`,
      { headers: this.headers }
    );
  }

  checkIn(date?: string, status: 'IN_OFFICE' | 'APPROVED_ABSENCE' = 'IN_OFFICE'): Observable<{ success: boolean; date: string; status: string }> {
    const body: Record<string, string> = { status };
    if (date) body['date'] = date;
    return this.http.post<{ success: boolean; date: string; status: string }>(
      `${this.api}/attendance/checkin`,
      body,
      { headers: this.headers }
    );
  }

  removeAttendance(date: string): Observable<{ success: boolean; date: string }> {
    return this.http.delete<{ success: boolean; date: string }>(
      `${this.api}/attendance/${date}`,
      { headers: this.headers }
    );
  }

  getHolidays(year: number): Observable<Holiday[]> {
    return this.http.get<Holiday[]>(
      `${this.api}/holidays?year=${year}`,
      { headers: this.headers }
    );
  }
}

