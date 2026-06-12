import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IHabit, IDayEntry, HabitService, Streaks } from '../services/habit.service';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';

interface DayCell { date: string; label: number; isCurrentMonth: boolean; isFuture: boolean; isToday: boolean; }

const INTENSITIES = ['😴', '🙂', '💪', '🔥'];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './wall.component.html',
  styleUrls: ['./wall.component.css']
})
export class WallComponent implements OnInit {
  habits = signal<IHabit[]>([]);
  activeIdx = signal(0);
  cells = signal<DayCell[]>([]);
  streaks = signal<Streaks>({ current: 0, longest: 0 });
  toast = signal('');
  intensities = INTENSITIES;
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth(); // 0-indexed

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    this.cells.set(this.buildCells());
  }

  nextMonth(): void {
    const now = new Date();
    if (this.viewYear === now.getFullYear() && this.viewMonth === now.getMonth()) return;
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    this.cells.set(this.buildCells());
  }

  isCurrentMonthView(): boolean {
    const now = new Date();
    return this.viewYear === now.getFullYear() && this.viewMonth === now.getMonth();
  }

  // note/intensity modal
  showModal = false;
  modalDate = '';
  modalNote = '';
  modalIntensity = '🙂';

  // new habit
  showNewHabit = false;
  newHabitName = '';

  // edit name
  editingName = false;
  nameInput = '';

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  get habit(): IHabit | undefined { return this.habits()[this.activeIdx()]; }

  constructor(
    public habitService: HabitService,
    public auth: AuthService,
    public theme: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.habitService.getAll().subscribe({
      next: (habits) => {
        this.habits.set(habits);
        this.cells.set(this.buildCells());
        this.updateStreaks();
      },
      error: () => this.logout()
    });
  }

  private buildCells(): DayCell[] {
    const today = new Date().toISOString().slice(0, 10);
    const year = this.viewYear, month = this.viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: DayCell[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: '', label: 0, isCurrentMonth: false, isFuture: false, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date, label: d, isCurrentMonth: true, isFuture: date > today, isToday: date === today });
    }
    return cells;
  }

  updateStreaks(): void {
    if (!this.habit) return;
    this.streaks.set(this.habitService.computeStreaks(this.habit.doneDates, this.habit.freezesUsed));
  }

  getEntry(date: string): IDayEntry | undefined {
    return this.habit?.doneDates.find(d => d.date === date);
  }

  cellClass(cell: DayCell): string {
    if (!cell.isCurrentMonth) return 'cell empty';
    const entry = this.getEntry(cell.date);
    let cls = 'cell';
    if (cell.isToday) cls += ' today';
    if (cell.isFuture) cls += ' future';
    if (entry) cls += ` done intensity-${this.intensities.indexOf(entry.intensity)}`;
    return cls;
  }

  onCellClick(cell: DayCell): void {
    if (!cell.isCurrentMonth || cell.isFuture || !this.habit) return;
    const existing = this.getEntry(cell.date);
    if (existing) {
      // toggle off
      this.doToggle(cell.date, '', existing.intensity);
    } else {
      // show modal to capture note + intensity
      this.modalDate = cell.date;
      this.modalNote = '';
      this.modalIntensity = '🙂';
      this.showModal = true;
    }
  }

  confirmToggle(): void {
    this.showModal = false;
    this.doToggle(this.modalDate, this.modalNote, this.modalIntensity);
  }

  private doToggle(date: string, note: string, intensity: string): void {
    if (!this.habit) return;
    this.habitService.toggleDay(this.habit._id, date, note, intensity).subscribe(({ doneDates, celebratedMilestones }) => {
      const updated = this.habits().map((h, i) =>
        i === this.activeIdx() ? { ...h, doneDates, celebratedMilestones } : h
      );
      this.habits.set(updated);
      this.updateStreaks();

      const newMs = this.habitService.getNewMilestones(this.streaks().current, celebratedMilestones);
      newMs.forEach(m => {
        this.habitService.celebrateMilestone(this.habit!._id, m).subscribe(({ celebratedMilestones: cm }) => {
          const h2 = this.habits().map((h, i) => i === this.activeIdx() ? { ...h, celebratedMilestones: cm } : h);
          this.habits.set(h2);
        });
        this.showToast(`🎉 ${m}-day streak on "${this.habit!.name}"!`);
      });
    });
  }

  applyFreeze(): void {
    if (!this.habit) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    this.habitService.applyFreeze(this.habit._id, yesterday).subscribe({
      next: ({ freezesUsed }) => {
        const updated = this.habits().map((h, i) => i === this.activeIdx() ? { ...h, freezesUsed } : h);
        this.habits.set(updated);
        this.updateStreaks();
        this.showToast('🧊 Streak freeze applied for yesterday!');
      },
      error: (e) => this.showToast(e.error?.error ?? 'Freeze failed')
    });
  }

  saveName(): void {
    if (!this.nameInput.trim() || !this.habit) return;
    this.habitService.updateName(this.habit._id, this.nameInput.trim()).subscribe(({ name }) => {
      const updated = this.habits().map((h, i) => i === this.activeIdx() ? { ...h, name } : h);
      this.habits.set(updated);
      this.editingName = false;
    });
  }

  createHabit(): void {
    if (!this.newHabitName.trim()) return;
    this.habitService.create(this.newHabitName.trim()).subscribe({
      next: (habit) => {
        this.habits.set([...this.habits(), habit]);
        this.activeIdx.set(this.habits().length - 1);
        this.updateStreaks();
        this.showNewHabit = false;
        this.newHabitName = '';
      },
      error: (e) => this.showToast(e.error?.error ?? 'Failed to create habit')
    });
  }

  confirmReset(): void {
    if (!this.habit || !confirm(`Reset all data for "${this.habit.name}"?`)) return;
    this.habitService.reset(this.habit._id).subscribe(() => {
      const updated = this.habits().map((h, i) =>
        i === this.activeIdx() ? { ...h, doneDates: [], celebratedMilestones: [], freezesUsed: [] } : h
      );
      this.habits.set(updated);
      this.streaks.set({ current: 0, longest: 0 });
    });
  }

  export(fmt: 'json' | 'csv'): void {
    if (this.habit) this.habitService.exportHabit(this.habit._id, fmt);
  }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3500);
  }
}
