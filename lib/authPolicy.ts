export type AuthProviderType = 'google' | 'azure' | 'password' | 'sso';

export interface AuthPolicy {
  allowed_providers?: AuthProviderType[];
  min_password_length?: number;
  require_special_char?: boolean;
  require_number?: boolean;
  require_uppercase?: boolean;
  session_timeout_hours?: number;
  enforce_mfa?: boolean;
}

export const DEFAULT_AUTH_POLICY: Required<AuthPolicy> = {
  allowed_providers: ['google', 'azure', 'password'],
  min_password_length: 8,
  require_special_char: true,
  require_number: true,
  require_uppercase: true,
  session_timeout_hours: 72,
  enforce_mfa: false,
};

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a password against tenant authentication & security policies.
 */
export function validatePasswordStrength(
  password: string,
  policy: AuthPolicy = DEFAULT_AUTH_POLICY
): PasswordValidationResult {
  const errors: string[] = [];
  const minLength = policy.min_password_length ?? DEFAULT_AUTH_POLICY.min_password_length;

  if (!password || password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (policy.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (policy.require_number && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  if (policy.require_special_char && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push('Password must contain at least one special symbol');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks whether an authentication provider is allowed by an organization's policy.
 */
export function isProviderAllowed(
  provider: AuthProviderType,
  policy: AuthPolicy = DEFAULT_AUTH_POLICY
): boolean {
  const allowed = policy.allowed_providers ?? DEFAULT_AUTH_POLICY.allowed_providers;
  return allowed.includes(provider);
}

/**
 * Determines whether an employee is currently deactivated or offboarded.
 */
export function isEmployeeDeactivated(employee: {
  deactivated_at?: string | null;
  employment_status?: string | null;
  is_deleted?: boolean | null;
}): boolean {
  if (!employee) return true;
  if (employee.deactivated_at) return true;
  if (employee.is_deleted) return true;

  const status = (employee.employment_status || '').toLowerCase();
  return status === 'resigned' || status === 'terminated' || status === 'inactive';
}
