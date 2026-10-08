export const API_URL = 'http://127.0.0.1:8000/' //'https://api.govoy.es/';
export const API_URL_DEV = 'https://developer.govoy.es/';
export const API_URL_LOCAL = 'http://127.0.0.1:8000/';

// Teselas de los mapas. Sin subdominios ({s}.): OSM ya no los recomienda.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
// OSM bloquea las peticiones con el User-Agent genérico de la librería: tiene que decir qué app las hace.
export const USER_AGENT_MAPAS = 'CheluGovoy (com.govoy.chelu)';
