/**
 * Métricas de negocio de The Practice.
 * Todo lo que se muestra en los dashboards sale de aquí, calculado sobre datos
 * reales de la base. Ninguna función inventa cifras: cuando no hay datos
 * suficientes devuelven cero o vacío, y las vistas lo comunican como tal.
 */
export * from "./revenue";
export * from "./occupancy";
export * from "./costs";
export * from "./practitioners";
export * from "./recommendations";
export * from "./periods";
