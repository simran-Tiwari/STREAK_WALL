import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IDayEntry { date: string; note: string; intensity: string; }
export interface IHabit {
  _id: string; name: string;
  doneDates: IDayEntry[];
  celebratedMilestones: number[];
  freezesUsed: string[];
  createdAt: string;
}
export interface IStats {
  current: number; longest: number;
  weeklyTotal: number; weeklyPct: number;
  monthlyTotal: number; monthlyPct: number;
}
export interface IProfile {
  email: string; username: string; joinDate: string;
  totalDaysLogged: number; habitCount: number;
}
export interface Streaks { current: number; longest: number; }

const MILESTONES = [3, 7, 14, 30];

@Injectable({ providedIn: 'root' })
export class HabitService {
  private base = `${environment.apiUrl}/api/habits`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<IHabit[]> { return this.http.get<IHabit[]>(this.base); }
  create(name: string): Observable<IHabit> { return this.http.post<IHabit>(this.base, { name }); }
  updateName(id: string, name: string): Observable<{ name: string }> {
    return this.http.put<{ name: string }>(`${this.base}/${id}/name`, { name });
  }
  toggleDay(id: string, date: string, note: string, intensity: string): Observable<Pick<IHabit, 'doneDates' | 'celebratedMilestones'>> {
    return this.http.post<Pick<IHabit, 'doneDates' | 'celebratedMilestones'>>(`${this.base}/${id}/toggle-day`, { date, note, intensity });
  }
  applyFreeze(id: string, date: string): Observable<{ freezesUsed: string[] }> {
    return this.http.post<{ freezesUsed: string[] }>(`${this.base}/${id}/freeze`, { date });
  }
  celebrateMilestone(id: string, milestone: number): Observable<{ celebratedMilestones: number[] }> {
    return this.http.post<{ celebratedMilestones: number[] }>(`${this.base}/${id}/celebrate-milestone`, { milestone });
  }
  getStats(id: string): Observable<IStats> { return this.http.get<IStats>(`${this.base}/${id}/stats`); }
  exportHabit(id: string, format: 'json' | 'csv'): void {
    this.http.get(`${this.base}/${id}/export?format=${format}`, { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `habit.${format}`; a.click();
      URL.revokeObjectURL(url);
    });
  }
  reset(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.base}/${id}/reset`); }
  delete(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.base}/${id}`); }

  computeStreaks(entries: IDayEntry[], freezes: string[]): Streaks {
    const dates = entries.map(e => e.date);
    if (!dates.length) return { current: 0, longest: 0 };
    const sorted = [...new Set(dates)].sort();

    let longest = 1, cur = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 864e5;
      cur = diff === 1 ? cur + 1 : (diff === 2 && freezes.includes(sorted[i - 1]) ? cur + 1 : 1);
      if (cur > longest) longest = cur;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const anchor = sorted[sorted.length - 1];
    if (anchor !== todayStr && anchor !== yesterday) return { current: 0, longest };

    let current = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const diff = (new Date(sorted[i + 1]).getTime() - new Date(sorted[i]).getTime()) / 864e5;
      if (diff === 1) current++;
      else if (diff === 2 && freezes.includes(sorted[i])) current++;
      else break;
    }
    return { current, longest };
  }

  getNewMilestones(current: number, celebrated: number[]): number[] {
    return MILESTONES.filter(m => current >= m && !celebrated.includes(m));
  }
}
