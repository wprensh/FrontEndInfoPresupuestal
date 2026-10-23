import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base de la API REST. Se inyecta con `inject(API_BASE_URL)`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
