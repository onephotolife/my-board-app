// ==== [API] minimal otel span shim (STRICT120 v2) ====

export type SpanAttributes = Record<string, string | number | boolean | null | undefined>;

export async function withSpan<T>(
  name: string,
  attrs: SpanAttributes,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    // Integrate OpenTelemetry here in future if needed
    return result;
  } catch (error) {
    // Could log structured span failure here
    throw error;
  } finally {
    const duration = Date.now() - started;
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(JSON.stringify({ event: 'span', name, durationMs: duration, ...attrs }));
    }
  }
}
