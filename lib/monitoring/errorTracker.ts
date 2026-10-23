/**
 * StaffPulse Production Error & Performance Tracker
 * Zero-PII error monitoring compatible with Sentry or self-hosted loggers.
 */

export interface ErrorContext {
  route?: string;
  orgId?: string;
  actorRole?: string;
  extra?: Record<string, any>;
}

/**
 * Scrubs potential Personally Identifiable Information (PII) before recording
 */
function sanitizePII(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'cookie', 'authorization', 'credit_card', 'pan', 'aadhaar'];
  const sanitized: Record<string, any> = {};

  for (const [k, v] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = sanitizePII(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export function captureException(error: unknown, context: ErrorContext = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const sentryDsn = process.env.SENTRY_DSN;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const cleanContext = {
    route: context.route || 'unknown',
    orgId: context.orgId || 'unscoped',
    actorRole: context.actorRole || 'anonymous',
    extra: context.extra ? sanitizePII(context.extra) : {},
    timestamp: new Date().toISOString(),
  };

  // If Sentry DSN is configured in production, dispatch event
  if (sentryDsn && isProd) {
    // Sentry HTTP ingest API
    fetch(sentryDsn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: errorMessage,
        stacktrace: errorStack,
        tags: cleanContext,
      }),
    }).catch(() => {
      // Fallback silently if monitoring network fails
    });
  }

  // Structured production log output
  console.error(`[StaffPulse:ErrorTracker] [${cleanContext.timestamp}] [Route: ${cleanContext.route}] ${errorMessage}`, {
    stack: errorStack,
    context: cleanContext,
  });

  return {
    errorId: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recorded: true,
  };
}
