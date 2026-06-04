// Canonical password policy — mirror of backend/Application/Validators/PasswordPolicy.cs.
// Keep both in sync if you change the rules.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_ERROR_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.";

// Returns a checklist of booleans for live UI feedback.
export function passwordChecks(password) {
  const p = password || "";
  return {
    length: p.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    digit: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
}

export function isPasswordValid(password) {
  const c = passwordChecks(password);
  return c.length && c.upper && c.lower && c.digit && c.special;
}
