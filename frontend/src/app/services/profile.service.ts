import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IProfile } from './habit.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private base = `${environment.apiUrl}/api/profile`;
  constructor(private http: HttpClient) {}
  get() { return this.http.get<IProfile>(this.base); }
  updateUsername(username: string) { return this.http.put<{ username: string }>(`${this.base}/username`, { username }); }
}
