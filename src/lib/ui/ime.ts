export function isComposingEvent(event: unknown): boolean {
  const native =
    typeof event === 'object' &&
    event !== null &&
    'nativeEvent' in (event as Record<string, unknown>)
      ? (event as { nativeEvent?: unknown }).nativeEvent
      : event;

  if (native && typeof native === 'object') {
    const composing = (native as { isComposing?: boolean }).isComposing;
    if (typeof composing === 'boolean') {
      return composing;
    }
    const keyCode = (native as { keyCode?: number }).keyCode;
    if (keyCode === 229) {
      return true;
    }
  }

  return false;
}
