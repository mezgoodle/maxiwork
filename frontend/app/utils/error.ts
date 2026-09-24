/**
 * Safely extracts a readable error message from API errors (FetchError, Error, or unknown objects)
 * without unsafe type assertions.
 */
export function extractApiErrorMessage(
  err: unknown,
  fallbackMessage = 'An unexpected error occurred',
): string {
  if (!err) {
    return fallbackMessage;
  }

  if (typeof err === 'string') {
    return err;
  }

  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;

    // Check nested response data (Nuxt $fetch or NestJS ValidationPipe errors)
    if (errorObj.data && typeof errorObj.data === 'object') {
      const dataObj = errorObj.data as Record<string, unknown>;
      if (typeof dataObj.message === 'string') {
        return dataObj.message;
      }
      if (Array.isArray(dataObj.message) && dataObj.message.length > 0) {
        return dataObj.message.map((m) => String(m)).join(', ');
      }
    }

    // Check top-level message (standard JS Error)
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  return fallbackMessage;
}
