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
      <h2>Join STREAKWALL</h2>
      <input type="email" placeholder="Email" [(ngModel)]="email" />
      <input type="password" placeholder="Password" [(ngModel)]="password" />
      @if (error) { <p class="error">{{ error }}</p> }
      <button (click)="signup()">Sign Up</button>
      <p>Have an account? <a routerLink="/login">Login</a></p>
    </div>
  `,
  styleUrls: ['./auth.css']
})
export class SignupComponent {
  email = ''; password = ''; error = '';

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  signup(): void {
    this.http.post<{ token: string }>(`${environment.apiUrl}/api/auth/signup`,
      { email: this.email, password: this.password }
    ).subscribe({
      next: ({ token }) => { this.auth.setToken(token); this.router.navigate(['/']); },
      error: (e) => { this.error = e.error?.error ?? 'Signup failed'; }
    });
  }
}
