/**
 * Las páginas públicas nunca deben caerse por un problema de DB:
 * degradan a contenido vacío y se registra el error.
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[safe-query] DB error:", err);
    return fallback;
  }
}
