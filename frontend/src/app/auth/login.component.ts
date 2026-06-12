import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-box">
      <h2>Login to STREAKWALL</h2>
      <input type="email" placeholder="Email" [(ngModel)]="email" />
      <input type="password" placeholder="Password" [(ngModel)]="password" />
      @if (error) { <p class="error">{{ error }}</p> }
      <button (click)="login()">Login</button>
      <p>No account? <a routerLink="/signup">Sign up</a></p>
    </div>
  `,
  styleUrls: ['./auth.css']
})
export class LoginComponent {
  email = ''; password = ''; error = '';

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  login(): void {
    this.http.post<{ token: string }>(`${environment.apiUrl}/api/auth/login`,
      { email: this.email, password: this.password }
    ).subscribe({
      next: ({ token }) => { this.auth.setToken(token); this.router.navigate(['/']); },
      error: (e) => { this.error = e.error?.error ?? 'Login failed'; }
    });
  }
}
