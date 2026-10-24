// Build optimizado para la demo pública (Render) mientras no hay API desplegada:
// usa el backend simulado en memoria, igual que en desarrollo.
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  useMockBackend: true,
};
