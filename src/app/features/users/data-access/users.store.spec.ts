import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { User } from '../models/user.model';
import { UsersApiService } from './users-api.service';
import { UsersStore } from './users.store';

const ana: User = {
  id: '1',
  firstName: 'Ana',
  lastName: 'Torres',
  email: 'ana@test.pe',
  role: 'admin',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('UsersStore', () => {
  let store: UsersStore;
  let api: jasmine.SpyObj<UsersApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<UsersApiService>('UsersApiService', ['getAll', 'create', 'delete']);
    TestBed.configureTestingModule({
      providers: [UsersStore, { provide: UsersApiService, useValue: api }],
    });
    store = TestBed.inject(UsersStore);
  });

  it('loads users and filters them ignoring accents and case', async () => {
    api.getAll.and.returnValue(of([ana, { ...ana, id: '2', firstName: 'Luis', lastName: 'Ramírez', active: false }]));

    await store.load();
    store.setQuery('RAMIREZ');

    expect(store.total()).toBe(2);
    expect(store.activeCount()).toBe(1);
    expect(store.filteredUsers().map((u) => u.id)).toEqual(['2']);
  });

  it('appends the created user', async () => {
    api.create.and.returnValue(of(ana));

    await store.create({ firstName: 'Ana', lastName: 'Torres', email: 'ana@test.pe', role: 'admin', active: true });

    expect(store.users()).toEqual([ana]);
    expect(store.loading()).toBeFalse();
  });

  it('exposes the error message when the API fails', async () => {
    api.getAll.and.returnValue(throwError(() => new Error('Error 500')));

    await store.load();

    expect(store.error()).toBe('Error 500');
    expect(store.loading()).toBeFalse();
  });
});
