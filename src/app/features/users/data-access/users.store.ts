import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { normalizeText } from '../../../shared/utils/text.utils';
import { CreateUserDto, User } from '../models/user.model';
import { UsersApiService } from './users-api.service';

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  query: string;
}

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null,
  query: '',
};

/**
 * Estado de la feature de usuarios basado en Signals.
 * Se provee en `users.routes.ts`, así su ciclo de vida queda ligado a la ruta
 * y no contamina el inyector raíz.
 */
@Injectable()
export class UsersStore {
  private readonly api = inject(UsersApiService);
  private readonly state = signal<UsersState>(initialState);

  // Selectores de solo lectura
  readonly users = computed(() => this.state().users);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly query = computed(() => this.state().query);

  readonly filteredUsers = computed(() => {
    const query = normalizeText(this.query());
    if (!query) return this.users();
    return this.users().filter((u) =>
      normalizeText(`${u.firstName} ${u.lastName} ${u.email}`).includes(query),
    );
  });
  readonly total = computed(() => this.users().length);
  readonly activeCount = computed(() => this.users().filter((u) => u.active).length);

  setQuery(query: string): void {
    this.patch({ query });
  }

  async load(): Promise<void> {
    this.patch({ loading: true, error: null });
    try {
      const users = await firstValueFrom(this.api.getAll());
      this.patch({ users, loading: false });
    } catch (e) {
      this.fail(e);
    }
  }

  async create(dto: CreateUserDto): Promise<User | null> {
    this.patch({ loading: true, error: null });
    try {
      const user = await firstValueFrom(this.api.create(dto));
      this.patch({ users: [...this.users(), user], loading: false });
      return user;
    } catch (e) {
      this.fail(e);
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    this.patch({ loading: true, error: null });
    try {
      await firstValueFrom(this.api.delete(id));
      this.patch({ users: this.users().filter((u) => u.id !== id), loading: false });
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  private patch(partial: Partial<UsersState>): void {
    this.state.update((s) => ({ ...s, ...partial }));
  }

  private fail(e: unknown): void {
    this.patch({ loading: false, error: e instanceof Error ? e.message : 'Error inesperado' });
  }
}
