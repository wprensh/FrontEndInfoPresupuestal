import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { BudgetItem } from '../models/budget.model';

/** Acceso HTTP a `/budget`. No guarda estado: eso es responsabilidad de `BudgetStore`. */
@Injectable()
export class BudgetApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/budget`;

  getItems(): Observable<BudgetItem[]> {
    return this.http.get<BudgetItem[]>(`${this.baseUrl}/items`);
  }
}
