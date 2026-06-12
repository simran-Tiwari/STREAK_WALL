import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(localStorage.getItem('sw_theme') !== 'light');

  toggle(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    localStorage.setItem('sw_theme', next ? 'dark' : 'light');
    document.body.setAttribute('data-theme', next ? 'dark' : 'light');
  }

  init(): void {
    document.body.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
  }
}
