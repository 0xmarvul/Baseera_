namespace Application.Services;

// Builds the branded HTML email card used by AuthService for verification
// and password-reset emails. Single source of truth for branding so all
// transactional emails look consistent.
//
// Constraints we deliberately respect (these are real email-client gotchas):
//   - Tables for layout (Outlook ignores flexbox).
//   - Inline CSS only (Gmail strips <style> blocks).
//   - 600px max width (Apple Mail / Outlook clip wider).
//   - Hosted logo URL only (inline-base64 trips spam filters).
//   - Solid colors only (Outlook ignores background-image).
//   - System-font stack (Outlook can't load web fonts).
public static class EmailTemplate
{
    // Brand palette mirrors the website (index.css :root vars).
    private const string Navy = "#0a1929";
    private const string Card = "#0d2137";
    private const string Border = "#1e3a5f";
    private const string TextHigh = "#f1f5f9";
    private const string TextMuted = "#94a3b8";
    private const string Accent = "#00d9a5";
    private const string GradientStart = "#00bc7d";
    private const string GradientEnd = "#00b8db";

    private const string LogoUrl = "https://0xmarvul.github.io/Baseera/assets/logo.png";
    private const string PrivacyUrl = "https://0xmarvul.github.io/Baseera/privacy-policy.html";
    private const string SupportEmail = "0xbaseera@gmail.com";

    private const string FontStack =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

    /// <summary>
    /// Build a fully-styled HTML email card. Pass empty string for greetingName to skip the "Hi NAME," line.
    /// </summary>
    public static string Build(
        string heading,
        string greetingName,
        string body,
        string buttonLabel,
        string buttonUrl,
        string footnote)
    {
        var greeting = string.IsNullOrWhiteSpace(greetingName)
            ? ""
            : $@"<p style=""margin:0 0 16px;color:{TextHigh};font:16px/1.6 {FontStack};"">Hi {Html(greetingName)},</p>";

        // Plain-text fallback URL shown under the button (in case the button
        // doesn't render or the user can't click it — common on corporate mail).
        var plainLink = $@"
<p style=""margin:24px 0 0;font:13px/1.6 {FontStack};color:{TextMuted};word-break:break-all;"">
  Or paste this link in your browser:<br>
  <a href=""{buttonUrl}"" style=""color:{Accent};text-decoration:none;"">{buttonUrl}</a>
</p>";

        return $@"<!doctype html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width,initial-scale=1"">
  <meta name=""color-scheme"" content=""only light"">
  <meta name=""supported-color-schemes"" content=""only light"">
  <title>{Html(heading)}</title>
</head>
<body style=""margin:0;padding:0;background:{Navy};"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:{Navy};padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:560px;width:100%;background:{Card};border:1px solid {Border};border-radius:14px;overflow:hidden;"">

          <!-- Header strip with logo -->
          <tr>
            <td align=""center"" style=""padding:32px 32px 8px;"">
              <img src=""{LogoUrl}"" width=""48"" height=""48"" alt=""Baseera""
                   style=""display:block;width:48px;height:48px;border-radius:12px;"" />
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align=""center"" style=""padding:8px 32px 24px;"">
              <h1 style=""margin:0;font:700 24px/1.3 {FontStack};color:{TextHigh};"">
                {Html(heading)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style=""padding:0 32px 8px;"">
              {greeting}
              <p style=""margin:0;color:{TextHigh};font:16px/1.6 {FontStack};"">
                {Html(body)}
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align=""center"" style=""padding:28px 32px 8px;"">
              <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" border=""0"">
                <tr>
                  <td bgcolor=""{GradientStart}"" align=""center""
                      style=""border-radius:10px;background:linear-gradient(90deg,{GradientStart} 0%,{GradientEnd} 100%);"">
                    <a href=""{buttonUrl}""
                       style=""display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font:600 16px/1 {FontStack};border-radius:10px;"">
                      {Html(buttonLabel)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Plain link fallback -->
          <tr>
            <td style=""padding:0 32px 16px;"">
              {plainLink}
            </td>
          </tr>

          <!-- Footnote (expiry, etc.) -->
          <tr>
            <td style=""padding:8px 32px 32px;"">
              <p style=""margin:0;color:{TextMuted};font:13px/1.6 {FontStack};"">
                {Html(footnote)}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style=""padding:0 32px;"">
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"">
                <tr><td style=""border-top:1px solid {Border};font-size:0;line-height:0;"">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align=""center"" style=""padding:20px 32px 28px;"">
              <p style=""margin:0 0 6px;color:{TextHigh};font:600 13px/1.4 {FontStack};"">
                Baseera
              </p>
              <p style=""margin:0;color:{TextMuted};font:12px/1.6 {FontStack};"">
                Web vulnerability scanner ·
                <a href=""mailto:{SupportEmail}"" style=""color:{Accent};text-decoration:none;"">{SupportEmail}</a> ·
                <a href=""{PrivacyUrl}"" style=""color:{Accent};text-decoration:none;"">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Outer footnote outside the card -->
        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:560px;width:100%;margin-top:16px;"">
          <tr>
            <td align=""center"" style=""padding:8px 16px;"">
              <p style=""margin:0;color:#475569;font:11px/1.5 {FontStack};"">
                You're receiving this email because you have an account at Baseera.
                If this wasn't you, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>";
    }

    // Minimal HTML escape so user-provided values (names, links) can't break the layout
    // or inject markup. Adequate for the values we feed it (first names, signed URLs).
    private static string Html(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return input
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;");
    }
}
