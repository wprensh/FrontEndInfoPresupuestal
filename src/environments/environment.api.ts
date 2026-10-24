// Desarrollo contra la API real (BackEndInfoPresupuestal en http://localhost:5080):
// `npm run start:api` sirve la app y reenvía /api con proxy.conf.json.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  useMockBackend: false,
};
