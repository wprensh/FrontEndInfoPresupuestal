import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideMaterialSymbols } from './core/config/icons.config';
import { errorInterceptor } from './core/http/error.interceptor';
import { mockBackendInterceptor } from './core/http/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor, mockBackendInterceptor])),
    provideAnimationsAsync(),
    provideMaterialSymbols(),
  ],
};
