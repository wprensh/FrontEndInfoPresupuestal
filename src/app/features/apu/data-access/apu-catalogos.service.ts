import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ApuCatalogos } from '../models/apu.model';
import { APU_CATALOGOS_MOCK } from './apu-catalogos.mock';

/** Fuente de los catálogos del APU. Hoy entrega los datos simulados. */
@Injectable()
export class ApuCatalogosService {
  getCatalogos(): Observable<ApuCatalogos> {
    return of(APU_CATALOGOS_MOCK);
  }
}
