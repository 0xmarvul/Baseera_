using System.Text.RegularExpressions;

namespace Application.Validators;

// Canonical password policy used by Register, ChangePassword, ResetPassword.
// Keep in sync with the live checklist on the frontend (Register.jsx,
// ChangePassword.jsx, ResetPassword.jsx).
//
// Policy:
//   - >= 8 characters
//   - at least one uppercase letter (A-Z)
//   - at least one lowercase letter (a-z)
//   - at least one digit (0-9)
//   - at least one special character (anything that is not a letter or digit)
public static class PasswordPolicy
{
    public const int MinLength = 8;
    public const string ErrorMessage =
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.";

    private static readonly Regex Upper = new(@"[A-Z]", RegexOptions.Compiled);
    private static readonly Regex Lower = new(@"[a-z]", RegexOptions.Compiled);
    private static readonly Regex Digit = new(@"\d", RegexOptions.Compiled);
    private static readonly Regex Special = new(@"[^A-Za-z0-9]", RegexOptions.Compiled);

    public static bool IsValid(string? password)
    {
        if (string.IsNullOrEmpty(password)) return false;
        if (password.Length < MinLength) return false;
        if (!Upper.IsMatch(password)) return false;
        if (!Lower.IsMatch(password)) return false;
        if (!Digit.IsMatch(password)) return false;
        if (!Special.IsMatch(password)) return false;
        return true;
    }
}
