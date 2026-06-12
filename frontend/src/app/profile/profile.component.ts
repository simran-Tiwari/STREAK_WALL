import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { IProfile } from '../services/habit.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="profile-container">
      <a routerLink="/" class="back">← Back</a>
      @if (profile()) {
        <h2>👤 Profile</h2>
        <div class="info-row"><span>Email</span><strong>{{ profile()!.email }}</strong></div>
        <div class="info-row">
          <span>Username</span>
          @if (!editing) {
            <strong (click)="editing = true; input = profile()!.username">{{ profile()!.username || '(click to set)' }}</strong>
          } @else {
            <input [(ngModel)]="input" (keyup.enter)="save()" (blur)="save()" autofocus />
          }
        </div>
        <div class="info-row"><span>Joined</span><strong>{{ profile()!.joinDate }}</strong></div>
        <div class="info-row"><span>Habits</span><strong>{{ profile()!.habitCount }}</strong></div>
        <div class="info-row"><span>Total days logged</span><strong>{{ profile()!.totalDaysLogged }}</strong></div>
      }
    </div>
  `,
  styles: [`
    .profile-container { max-width: 400px; margin: 40px auto; padding: 0 16px; }
    .back { color: var(--accent); text-decoration: none; font-size: 14px; }
    h2 { margin: 16px 0; color: var(--text); }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--muted); }
    .info-row strong { color: var(--text); cursor: pointer; }
    .info-row input { background: var(--bg2); border: 1px solid var(--accent); border-radius: 6px; color: var(--text); padding: 4px 8px; font-size: 14px; }
  `]
})
export class ProfileComponent implements OnInit {
  profile = signal<IProfile | null>(null);
  editing = false;
  input = '';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.get().subscribe(p => this.profile.set(p));
  }

  save(): void {
    if (!this.input.trim()) { this.editing = false; return; }
    this.profileService.updateUsername(this.input.trim()).subscribe(({ username }) => {
      this.profile.set({ ...this.profile()!, username });
      this.editing = false;
    });
  }
}
