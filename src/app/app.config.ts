import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideMaterialSymbols } from './core/config/icons.config';
import { providePaginatorIntl } from './core/config/paginator-intl';
import { errorInterceptor } from './core/http/error.interceptor';
import { mockBackendInterceptor } from './core/http/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, mockBackendInterceptor])),
    provideAnimationsAsync(),
    provideMaterialSymbols(),
    providePaginatorIntl(),
  ],
};
