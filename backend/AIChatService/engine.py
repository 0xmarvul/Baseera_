import re
import difflib
from typing import Optional
from fuzzywuzzy import fuzz

# ---------------------------------------------------------------------------
# Algorithm 1: Rule-Based Classification (knowledge base)
# ---------------------------------------------------------------------------
VULNERABILITIES = {
    "sql_injection": {
        "name": "SQL Injection",
        "explanation": (
            "SQL Injection occurs when an attacker inserts or manipulates SQL queries "
            "via user-supplied input, allowing them to read, modify, or delete database "
            "data and sometimes execute OS-level commands."
        ),
        "severity": "Critical",
        "fix": (
            "Use parameterized queries / prepared statements. "
            "Apply input validation and least-privilege DB accounts. "
            "Use an ORM and avoid dynamic SQL concatenation."
        ),
        "patterns": [
            r"(sql\s*inject|sqli|sql[-\s]injection|sqlinjection)",
            r"(union\s+select|drop\s+table|or\s+1=1)",
        ],
        "keywords": ["sql injection", "sqli", "sql-injection", "sqlinjection",
                     "union select", "drop table", "sql attack", "database injection",
                     "injection"],
    },
    "xss": {
        "name": "Cross-Site Scripting (XSS)",
        "explanation": (
            "XSS allows attackers to inject malicious scripts into web pages viewed by "
            "other users, enabling session hijacking, credential theft, and defacement. "
            "Severity depends on the sink: javascript: URLs in href/action are Critical "
            "(direct script execution), iframe srcdoc and reflected parameters are High, "
            "code-smell patterns (eval/innerHTML/document.write detected) are Medium, "
            "and inline event handlers alone are Low (code-quality issue)."
        ),
        "severity": "Medium",
        "fix": (
            "Encode all output (HTML-encode user-supplied data). "
            "Use Content-Security-Policy headers. "
            "Validate and sanitize every input on the server side."
        ),
        "patterns": [
            # Match XSS variants but NOT "dom xss" / "dom-based xss" — those go to dom_xss.
            # Two lookbehinds: reject "dom xss"/"dom-xss" AND "...based xss"/"...based-xss".
            r"(cross[-\s]site\s*script|(?<!dom[-\s])(?<!dom)(?<!based[-\s])xss|"
            r"\bscript\s+inject|reflected\s+xss|stored\s+xss|persistent\s+xss)",
        ],
        "keywords": ["xss", "cross site scripting", "cross-site scripting",
                     "script injection", "reflected xss", "stored xss",
                     "persistent xss", "html injection"],
    },
    "csrf": {
        "name": "Cross-Site Request Forgery (CSRF)",
        "explanation": (
            "CSRF tricks authenticated users into submitting unwanted requests, "
            "allowing attackers to perform actions on their behalf."
        ),
        "severity": "Medium",
        "fix": (
            "Use CSRF tokens on all state-changing forms/requests. "
            "Validate the Origin/Referer header. "
            "Use SameSite=Strict or SameSite=Lax cookie attribute."
        ),
        "patterns": [
            r"(cross[-\s]site\s*request\s*forgery|csrf|xsrf)",
        ],
        "keywords": ["csrf", "xsrf", "cross site request forgery",
                     "cross-site request forgery"],
    },
    "rce": {
        "name": "Remote Code Execution (RCE)",
        "explanation": (
            "RCE lets an attacker execute arbitrary code on the server, "
            "potentially leading to full system compromise."
        ),
        "severity": "Critical",
        "fix": (
            "Never pass user input to shell commands. "
            "Use safe APIs instead of exec()/system(). "
            "Apply strict input validation and sandboxing."
        ),
        "patterns": [
            r"(remote\s+code\s+exec|\brce\b|\bcode\s+execut|command\s+inject)",
        ],
        "keywords": ["rce", "remote code execution", "code execution",
                     "command injection", "command execution", "shell injection"],
    },
    "lfi": {
        "name": "Local File Inclusion (LFI)",
        "explanation": (
            "LFI allows an attacker to include files from the server's filesystem, "
            "potentially exposing sensitive data or executing server-side code."
        ),
        "severity": "High",
        "fix": (
            "Whitelist allowed file paths/names. "
            "Never pass raw user input to file-include functions. "
            "Use realpath() and verify paths stay within the intended directory."
        ),
        "patterns": [
            r"(local\s+file\s+inclus|lfi|\.\./|path\s+travers)",
        ],
        "keywords": ["lfi", "local file inclusion", "../", "path traversal"],
    },
    "rfi": {
        "name": "Remote File Inclusion (RFI)",
        "explanation": (
            "RFI enables attackers to include remote files (often containing malicious "
            "code) into the application's execution flow."
        ),
        "severity": "Critical",
        "fix": (
            "Disable allow_url_include in PHP. "
            "Whitelist all allowed includes. "
            "Validate and sanitize file path parameters."
        ),
        "patterns": [
            r"(remote\s+file\s+inclus|rfi)",
        ],
        "keywords": ["rfi", "remote file inclusion"],
    },
    "ssrf": {
        "name": "Server-Side Request Forgery (SSRF)",
        "explanation": (
            "SSRF allows attackers to induce the server to make HTTP requests to "
            "unintended locations, potentially accessing internal services."
        ),
        "severity": "High",
        "fix": (
            "Validate and whitelist allowed URLs/IP ranges. "
            "Block requests to internal/metadata IPs. "
            "Use a dedicated HTTP client with timeouts."
        ),
        "patterns": [
            r"(server[-\s]side\s+request\s+forgery|ssrf)",
        ],
        "keywords": ["ssrf", "server-side request forgery",
                     "server side request forgery"],
    },
    "directory_traversal": {
        "name": "Directory Traversal",
        "explanation": (
            "Directory traversal (path traversal) lets attackers access files and "
            "directories outside the intended web root by manipulating file paths."
        ),
        "severity": "High",
        "fix": (
            "Sanitize all user-supplied file paths. "
            "Use canonical path checks (realpath/os.path.abspath). "
            "Restrict the application to a defined base directory."
        ),
        "patterns": [
            r"(directory\s+travers|path\s+travers|\.\./|dot\s*dot\s*slash)",
        ],
        "keywords": ["directory traversal", "path traversal", "../",
                     "dot dot slash", "file traversal", "folder traversal",
                     "traversal"],
    },
    "open_redirect": {
        "name": "Open Redirect",
        "explanation": (
            "Open redirect occurs when an application accepts an untrusted URL as a "
            "redirect target, enabling phishing and credential-theft attacks."
        ),
        "severity": "Medium",
        "fix": (
            "Whitelist redirect destinations. "
            "Use relative paths or server-side token validation. "
            "Warn users when redirecting to external sites."
        ),
        "patterns": [
            r"(open\s+redirect|unvalidated\s+redirect)",
        ],
        "keywords": ["open redirect", "unvalidated redirect",
                     "url redirect", "redirect vulnerability", "open redirection",
                     "redirect"],
    },
    "auth_bypass": {
        "name": "Authentication Bypass",
        "explanation": (
            "Authentication bypass lets attackers skip authentication checks, "
            "gaining unauthorized access to protected resources."
        ),
        "severity": "Critical",
        "fix": (
            "Enforce server-side authentication on every protected endpoint. "
            "Use well-tested auth libraries. "
            "Implement MFA and account lockout policies."
        ),
        "patterns": [
            r"(auth\w*\s+bypass|authentication\s+bypass|bypass\s+auth)",
        ],
        "keywords": ["authentication bypass", "auth bypass", "bypass login",
                     "bypass authentication", "login bypass", "broken authentication",
                     "broken auth"],
    },
    "exposed_secrets": {
        "name": "Exposed API Keys / Secrets",
        "explanation": (
            "Hard-coded or exposed API keys/secrets allow attackers to access "
            "third-party services, databases, or internal systems."
        ),
        "severity": "Critical",
        "fix": (
            "Store secrets in environment variables or a secrets manager. "
            "Rotate any exposed credentials immediately. "
            "Scan code with tools like truffleHog or git-secrets before committing."
        ),
        "patterns": [
            r"(exposed\s+(api\s+key|secret|token|credential)|api\s+key\s+leak|"
            r"api\s+keys?\s+exposure|leaked\s+(key|secret|token)|jwt\s+leak|"
            r"stripe\s+key|aws\s+key|private\s+key\s+exposed)",
        ],
        "keywords": ["exposed api key", "api key leak", "exposed secret",
                     "hard-coded credentials", "api keys", "exposed api", "api key",
                     "api keys exposure", "exposed keys", "leaked credentials",
                     "hardcoded credentials", "hardcoded secrets", "secret leak",
                     "token leak", "exposed token", "exposed credential", "exposed",
                     "jwt leak", "private key exposed", "stripe key leak",
                     "aws key leak", "github token leak", "slack token leak"],
    },
    "insecure_cookies": {
        "name": "Insecure Cookies",
        "explanation": (
            "Cookies without Secure, HttpOnly, or SameSite flags can be stolen via "
            "XSS, network sniffing, or CSRF attacks."
        ),
        "severity": "Medium",
        "fix": (
            "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies. "
            "Use short expiry times for session cookies."
        ),
        "patterns": [
            r"(insecure\s+cookie|cookie\s+security|missing\s+(httponly|secure)\s+flag)",
        ],
        "keywords": ["insecure cookie", "cookie security", "httponly flag",
                     "secure flag", "samesite", "insecure cookies", "cookie flags",
                     "cookie vulnerability", "cookie", "cookies"],
    },
    "missing_security_headers": {
        "name": "Missing Security Headers",
        "explanation": (
            "Modern browsers honor a family of HTTP response headers that defend the "
            "page against common client-side attacks. Severity depends on which header "
            "is missing: CSP (High) is the primary anti-XSS control; HSTS, X-Frame-Options, "
            "Referrer-Policy, and Clickjacking defences are Medium. Hardening-only headers "
            "(X-Content-Type-Options, Permissions-Policy, and the Cross-Origin-Opener / "
            "Embedder / Resource-Policy trio) are Low because they are defence-in-depth "
            "rather than direct vulnerabilities."
        ),
        "severity": "Low",
        "fix": (
            "Send these headers on every response from your app / reverse proxy: "
            "Content-Security-Policy, Strict-Transport-Security (with includeSubDomains "
            "and preload), X-Content-Type-Options: nosniff, Referrer-Policy: "
            "strict-origin-when-cross-origin, Permissions-Policy (disable camera, "
            "microphone, geolocation unless you actually use them), "
            "Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Resource-Policy: "
            "same-site, and X-Frame-Options: DENY (or rely on CSP frame-ancestors)."
        ),
        "patterns": [
            r"(missing\s+security\s+header|security\s+header|csp\s+header|hsts|"
            r"missing\s+(csp|hsts|x[-\s]?frame[-\s]?options|x[-\s]?content[-\s]?type[-\s]?options|"
            r"referrer[-\s]?policy|permissions[-\s]?policy|"
            r"cross[-\s]?origin[-\s]?(opener|embedder|resource)[-\s]?policy|coop|coep|corp)|"
            r"x[-\s]?content[-\s]?type[-\s]?options|referrer[-\s]?policy|permissions[-\s]?policy|"
            r"cross[-\s]?origin[-\s]?opener[-\s]?policy)",
        ],
        "keywords": ["missing security headers", "security headers", "missing headers",
                     "http headers", "headers", "csp", "csp header", "hsts",
                     "missing hsts", "strict transport security",
                     "x frame options", "x-frame-options", "missing x frame options",
                     "x content type options", "x-content-type-options",
                     "missing x content type options", "mime sniffing", "nosniff",
                     "referrer policy", "referrer-policy", "missing referrer policy",
                     "permissions policy", "permissions-policy",
                     "missing permissions policy", "feature policy",
                     "cross origin opener policy", "cross-origin-opener-policy",
                     "missing cross origin opener policy", "coop",
                     "cross origin embedder policy", "cross-origin-embedder-policy",
                     "coep", "cross origin resource policy",
                     "cross-origin-resource-policy", "corp",
                     "content security policy"],
    },
    "clickjacking": {
        "name": "Clickjacking",
        "explanation": (
            "Clickjacking tricks users into clicking hidden UI elements embedded "
            "within iframes, potentially performing unintended actions."
        ),
        "severity": "Medium",
        "fix": (
            "Set X-Frame-Options: DENY or SAMEORIGIN. "
            "Use CSP frame-ancestors directive. "
            "Implement frame-busting JavaScript as a secondary defence."
        ),
        "patterns": [
            r"(clickjack|click\s+jack|iframe\s+attack|ui\s+redress)",
        ],
        "keywords": ["clickjacking", "click jacking", "iframe attack",
                     "ui redressing", "frame attack"],
    },
    "exposed_comments": {
        "name": "Exposed Comments / Sensitive Information in Source",
        "explanation": (
            "Developer comments in HTML/JS source code can reveal internal paths, "
            "credentials, logic flaws, or TODOs that aid attackers."
        ),
        "severity": "Low",
        "fix": (
            "Remove sensitive comments before deploying to production. "
            "Use automated pre-commit hooks to detect accidental disclosures."
        ),
        "patterns": [
            r"(exposed\s+comment|sensitive\s+(comment|info\s+in\s+source)|"
            r"html\s+comment\s+leak)",
        ],
        "keywords": ["exposed comments", "sensitive comments",
                     "information disclosure", "source code comments",
                     "html comments", "code comments", "developer comments",
                     "exposed comment"],
    },
    "sensitive_files": {
        "name": "Sensitive Files Exposure",
        "explanation": (
            "Sensitive files like .env, .git/config, wp-config.php, backup files, and database dumps "
            "being publicly accessible on a web server can expose credentials, API keys, database passwords, "
            "and internal configuration details to attackers."
        ),
        "severity": "High",
        "fix": (
            "Block access to sensitive files via web server configuration using .htaccess or nginx rules. "
            "Remove unnecessary files from production environments. "
            "Add sensitive files and directories to .gitignore. "
            "Regularly audit publicly accessible files on your server."
        ),
        "patterns": [
            r"(sensitive\s+file|\.env\s+(file|exposed)|wp[-\s]config|database\s+dump|"
            r"backup\s+file|config\s+file\s+exposed|\.git[/\\]config|file\s+exposure|"
            r"directory\s+listing|index\s+of\s+/|admin\s+panel|phpmyadmin|swagger\s+ui|"
            r"graphql\s+exposure|actuator\s+exposed)",
        ],
        "keywords": ["sensitive files", "sensitive data files", "sensitive data",
                     "exposed files", "backup files", ".env file", ".env exposed",
                     "config file exposed", "git exposed", ".git/config",
                     "wp-config", "database dump", "file exposure",
                     "sensitive file exposure", "sensitive",
                     "directory listing", "index of", "autoindex",
                     "admin panel", "exposed admin", "phpmyadmin exposed",
                     "swagger exposed", "api docs exposed", "graphql exposed",
                     "actuator exposed"],
    },
    "debug_pages": {
        "name": "Debug Pages / Debug Mode Exposure",
        "explanation": (
            "Debug pages and debug mode left enabled in production can reveal stack traces, "
            "environment variables, database queries, internal paths, and other sensitive information "
            "that gives attackers significant advantages."
        ),
        "severity": "Medium",
        "fix": (
            "Disable debug mode in all production environments. "
            "Configure custom error pages that don't reveal internal details. "
            "Remove or restrict access to debug endpoints. "
            "Use environment-specific configuration to ensure debug settings are never enabled in production."
        ),
        "patterns": [
            r"(debug\s+(page|mode|endpoint|enabled|info|information)|stack\s+trace|"
            r"verbose\s+error|development\s+mode|error\s+page\s+leak)",
        ],
        "keywords": ["debug page", "debug pages", "debug mode", "debug endpoint",
                     "debug enabled", "stack trace", "error page", "verbose error",
                     "debug information", "debug info", "development mode", "debug"],
    },
    "csp_issues": {
        "name": "Content Security Policy (CSP) Issues",
        "explanation": (
            "Missing or misconfigured Content Security Policy (CSP) headers allow XSS attacks, "
            "data injection attacks, and unauthorized resource loading. "
            "A properly configured CSP restricts which sources are allowed to serve content to the page, "
            "significantly reducing the attack surface. Severity depends on the failure mode: "
            "**weak CSP** containing 'unsafe-inline', 'unsafe-eval', or wildcards is treated as High "
            "because it directly enables XSS; **missing CSP entirely** is Medium because it's a "
            "defence-in-depth gap rather than a direct vulnerability."
        ),
        "severity": "High",
        "fix": (
            "Implement a strict Content-Security-Policy header on all responses. "
            "Use nonces or hashes for inline scripts instead of 'unsafe-inline'. "
            "Avoid 'unsafe-eval' in CSP directives. "
            "Enable CSP reporting to detect and fix violations. "
            "Regularly review and tighten your CSP policy."
        ),
        "patterns": [
            r"(csp\s+(issue|misconfiguration|bypass|violation|header|policy)|"
            r"content\s+security\s+policy\s+issue|weak\s+csp|unsafe[-\s]?inline|unsafe[-\s]?eval)",
        ],
        "keywords": ["csp issue", "csp issues", "csp misconfiguration", "csp bypass",
                     "content security policy issue", "csp violation",
                     "csp header missing", "weak csp", "missing csp", "csp policy",
                     "unsafe-inline", "unsafe inline", "unsafe-eval", "unsafe eval",
                     "csp wildcard"],
    },
    "outdated_components": {
        "name": "Vulnerable and Outdated Components",
        "explanation": (
            "Using libraries or frameworks with known vulnerabilities (e.g., old jQuery, "
            "AngularJS 1.x, lodash <4.17.21) lets attackers exploit published CVEs "
            "directly in the browser. This is OWASP Top 10 A06: Vulnerable and Outdated Components."
        ),
        "severity": "High",
        "fix": (
            "Upgrade libraries to the latest patched version. "
            "Run dependency scanners (Retire.js, npm audit, Snyk, Dependabot) in CI. "
            "Remove libraries you no longer use and prefer actively maintained alternatives "
            "(e.g., migrate off Moment.js to date-fns or dayjs)."
        ),
        "patterns": [
            r"(outdated\s+(component|library|librar|dependenc)|vulnerable\s+(component|library|librar|dependenc)|old\s+jquery|retire\.?js)",
        ],
        "keywords": ["outdated components", "vulnerable components", "outdated library",
                     "outdated libraries", "outdated dependency", "old jquery",
                     "old library", "vulnerable dependency", "vulnerable library",
                     "retire.js", "retirejs", "outdated frameworks"],
    },
    "dom_xss": {
        "name": "DOM-based XSS",
        "explanation": (
            "DOM-based XSS happens entirely in the browser: untrusted data from sources "
            "like location.hash, document.referrer, or window.name is written into a "
            "dangerous sink (innerHTML, document.write, eval) without sanitization, "
            "letting an attacker run arbitrary JavaScript."
        ),
        "severity": "High",
        "fix": (
            "Treat location.*, document.referrer, and window.name as untrusted input. "
            "Use textContent instead of innerHTML. Avoid eval() and document.write(). "
            "Enable a strict Content-Security-Policy as defense-in-depth."
        ),
        "patterns": [
            r"(dom[-\s]based\s+xss|dom\s*xss|client[-\s]side\s+xss)",
        ],
        "keywords": ["dom xss", "dom-based xss", "dom based xss", "client-side xss",
                     "client side xss", "browser xss"],
    },
    "postmessage_insecure": {
        "name": "Insecure postMessage Communication",
        "explanation": (
            "window.postMessage handlers that don't verify event.origin will accept "
            "messages from any website, allowing a malicious frame or opened window to "
            "feed data (and often XSS payloads) directly into the victim page."
        ),
        "severity": "High",
        "fix": (
            "Always validate event.origin against an explicit allow-list at the top of "
            "every message handler. Validate the shape and type of event.data before "
            "acting on it. Never eval or innerHTML postMessage payloads."
        ),
        "patterns": [
            r"(post[-\s]?message|postmessage\s+(insecure|without\s+origin)|window\.postmessage)",
        ],
        "keywords": ["postmessage", "post message", "insecure postmessage",
                     "message event", "cross origin messaging", "origin check",
                     "postmessage vulnerability", "post message vulnerability"],
    },
    "session_in_url": {
        "name": "Session Token in URL",
        "explanation": (
            "Placing session IDs, access tokens, or auth tokens in the URL query string "
            "exposes them via browser history, proxy logs, referrer headers, and "
            "shoulder-surfing. Attackers who capture the URL can hijack the session."
        ),
        "severity": "High",
        "fix": (
            "Transport tokens in the Authorization header or in HttpOnly, Secure cookies. "
            "Never put jsessionid, phpsessid, access_token, or similar values in query parameters. "
            "For OAuth redirects, use the PKCE flow and short-lived authorization codes."
        ),
        "patterns": [
            r"(session\s+(id\s+)?in\s+url|token\s+in\s+url|jsessionid|phpsessid|access_token\s+in\s+url)",
        ],
        "keywords": ["session token in url", "token in url", "jsessionid", "phpsessid",
                     "session in url", "session id in url", "token in query",
                     "access token in url"],
    },
    "insecure_storage": {
        "name": "Insecure Client-Side Storage",
        "explanation": (
            "Storing secrets, JWTs, session tokens, or PII in localStorage or "
            "sessionStorage makes them readable by any JavaScript running on the page, "
            "including injected XSS payloads. Unlike HttpOnly cookies, web storage is "
            "fully exposed to the DOM."
        ),
        "severity": "High",
        "fix": (
            "Keep session tokens in HttpOnly, Secure, SameSite cookies. "
            "If you need client-side state, store only non-sensitive, non-identifying data. "
            "Never write passwords, full card numbers, or SSNs to web storage."
        ),
        "patterns": [
            r"(insecure\s+storage|localstorage\s+(secret|token|password)|sessionstorage\s+(secret|token|password)|client[-\s]side\s+storage)",
        ],
        "keywords": ["insecure storage", "localstorage", "sessionstorage",
                     "local storage", "session storage", "client-side storage",
                     "client side storage", "storage vulnerability",
                     "token in localstorage", "jwt in localstorage"],
    },
    "source_map_exposure": {
        "name": "Source Map Exposure",
        "explanation": (
            "Source map (.map) files reconstruct the original, unminified source code of "
            "a JavaScript bundle. If deployed to production, they hand attackers a clean "
            "view of internal logic, secrets accidentally bundled, and API contracts."
        ),
        "severity": "Medium",
        "fix": (
            "Do not deploy .map files to production, or block them at the web-server level. "
            "If you need them for error reporting (Sentry etc.), upload to the error tracker "
            "directly and keep them off the public origin."
        ),
        "patterns": [
            r"(source\s*map\s+(exposure|exposed|leak)|sourcemap\s+(exposure|exposed|leak)|\.map\s+file\s+exposed)",
        ],
        "keywords": ["source map", "source maps", "source map exposure",
                     "sourcemap", "sourcemap exposure", ".map file",
                     "sourcemappingurl", "source map leak"],
    },
    "server_banner": {
        "name": "Server / Technology Version Disclosure",
        "explanation": (
            "When HTML meta tags (e.g., <meta name=\"generator\">) or comments reveal the "
            "exact framework and version (WordPress 5.4.1, Drupal 7.x, nginx/1.14), "
            "attackers can map the target to known CVEs and pick pre-built exploits."
        ),
        "severity": "Low",
        "fix": (
            "Remove the generator meta tag. Strip Server and X-Powered-By headers at the "
            "reverse proxy. Don't include build version comments in shipped HTML/JS. "
            "Treat version information as internal-only."
        ),
        "patterns": [
            r"(version\s+disclosure|server\s+banner|banner\s+disclosure|x[-\s]powered[-\s]by|framework\s+version\s+leak|server\s+version\s+leak)",
        ],
        "keywords": ["version disclosure", "server banner", "banner disclosure",
                     "x-powered-by", "server version", "framework version",
                     "version leak", "generator meta", "information leak"],
    },
    "insecure_forms": {
        "name": "Insecure Forms (Password over HTTP)",
        "explanation": (
            "When a login, signup, or any form with a password field is served over "
            "plain HTTP, credentials travel in cleartext. Anyone on the same network "
            "(coffee-shop Wi-Fi, ISP, on-path attacker) can read the POST body and "
            "harvest usernames and passwords. Modern browsers flag these forms as "
            "'Not Secure' but still submit them."
        ),
        "severity": "Critical",
        "fix": (
            "Serve the entire site over HTTPS — no HTTP fallback. Redirect HTTP to "
            "HTTPS at the web server, enable HSTS (with preload), and ensure the "
            "form's action URL is also HTTPS. Never mix an HTTPS page with an HTTP "
            "form action, since the POST itself leaks the password."
        ),
        "patterns": [
            r"(insecure\s+form|password\s+over\s+http|form\s+over\s+http|"
            r"http\s+password|cleartext\s+password|plain\s+text\s+password)",
        ],
        "keywords": ["insecure form", "insecure forms", "password over http",
                     "form over http", "http password", "cleartext password",
                     "plain text password", "unencrypted form", "unencrypted password",
                     "non https form", "http login"],
    },
    "mixed_content": {
        "name": "Mixed Content",
        "explanation": (
            "Mixed content occurs when an HTTPS page loads sub-resources (scripts, "
            "stylesheets, images, XHR) over plain HTTP. Active mixed content (JS/CSS) "
            "lets an on-path attacker inject arbitrary code into the page; passive "
            "mixed content (images) leaks browsing activity and breaks the padlock. "
            "Modern browsers auto-upgrade or block some cases, but not all."
        ),
        "severity": "Medium",
        "fix": (
            "Update every resource URL to use HTTPS (or a protocol-relative //host/path "
            "that inherits the page scheme). Add a Content-Security-Policy with "
            "'upgrade-insecure-requests' so the browser rewrites remaining HTTP URLs. "
            "Use 'block-all-mixed-content' to refuse any HTTP sub-resource. Audit "
            "third-party scripts, embedded iframes, and user-supplied content."
        ),
        "patterns": [
            r"(mixed\s+content|http\s+resource\s+on\s+https|"
            r"http\s+(script|image|stylesheet)\s+on\s+https|insecure\s+resource)",
        ],
        "keywords": ["mixed content", "http on https", "insecure resource",
                     "http resource on https", "http script on https",
                     "http image on https", "passive mixed content",
                     "active mixed content", "upgrade insecure requests"],
    },
    "missing_sri": {
        "name": "Missing Subresource Integrity (SRI)",
        "explanation": (
            "When a page pulls in a third-party script or stylesheet (CDN, analytics "
            "library, font, etc.) without an integrity= hash, the browser executes "
            "whatever bytes the CDN returns. If the CDN is breached, hijacked via DNS, "
            "or tampered with by an insider, every visitor silently runs the attacker's "
            "code. Real incidents: polyfill.io supply-chain attack (2024), British "
            "Airways Magecart skimmer (2018)."
        ),
        "severity": "Medium",
        "fix": (
            "Add an integrity attribute with a SHA-384 (or SHA-256/512) hash and "
            "crossorigin=\"anonymous\" to every <script src> and <link rel=\"stylesheet\"> "
            "that points to a different origin. Generate hashes with 'openssl dgst "
            "-sha384 -binary file.js | openssl base64 -A' or srihash.org. Pin library "
            "versions — SRI only works if the file doesn't change underneath you."
        ),
        "patterns": [
            r"(missing\s+sri|subresource\s+integrity|sri\s+(missing|hash)|"
            r"integrity\s+attribute|cdn\s+supply\s+chain)",
        ],
        "keywords": ["missing sri", "sri", "subresource integrity", "sri hash",
                     "sri missing", "integrity attribute", "integrity hash",
                     "cdn supply chain", "external script integrity",
                     "script integrity"],
    },
    "excessive_trackers": {
        "name": "Excessive Third-Party Trackers",
        "explanation": (
            "When a site embeds many analytics / advertising / session-replay scripts "
            "(Google Analytics, Facebook Pixel, Hotjar, Mixpanel, Segment, etc.), "
            "every one of them runs with full page access: it can read form values, "
            "URL parameters, and cookies. The more trackers, the larger the attack "
            "surface and the more personal data leaks to unrelated third parties. "
            "GDPR / CCPA require explicit consent for most of these, and a single "
            "compromised tracker is a skimmer on every page."
        ),
        "severity": "Low",
        "fix": (
            "Audit every third-party script and keep only the ones with a clear "
            "business owner. Load trackers through a consent manager (e.g., OneTrust, "
            "Cookiebot) so they fire only after opt-in. Self-host where possible and "
            "subset analytics to first-party collection. Add a strict CSP "
            "script-src allow-list and SRI hashes on all remaining third-party scripts."
        ),
        "patterns": [
            r"(excessive\s+tracker|third[-\s]?party\s+tracker|too\s+many\s+tracker|"
            r"analytics\s+overload|tracking\s+script|privacy\s+leak)",
        ],
        "keywords": ["excessive trackers", "third party trackers", "tracking scripts",
                     "analytics overload", "privacy leak", "too many trackers",
                     "trackers", "advertising scripts", "session replay",
                     "google analytics", "facebook pixel", "hotjar"],
    },
    "cors_issues": {
        "name": "CORS Misconfiguration",
        "explanation": (
            "Cross-Origin Resource Sharing governs which sites the browser lets read "
            "responses from your API. A wildcard 'Access-Control-Allow-Origin: *' "
            "combined with Allow-Credentials, or a reflected origin that echoes any "
            "sender, lets any attacker-controlled site make authenticated requests to "
            "your API from a victim's browser and read the responses. This turns "
            "same-origin-only data (private feeds, admin endpoints) into data the "
            "attacker can exfiltrate."
        ),
        "severity": "Medium",
        "fix": (
            "Don't use '*' for ACAO when credentials are in play. Maintain a strict "
            "allow-list of trusted origins and echo only matching ones. Set "
            "'Vary: Origin' so caches don't leak across origins. Prefer separate "
            "public / authenticated endpoints. Never reflect Origin blindly — validate "
            "it against a list. Use SameSite cookies as defense in depth."
        ),
        "patterns": [
            r"(cors\s+(issue|misconfig|bypass)|cors\s+wildcard|access[-\s]?control[-\s]?allow[-\s]?origin|"
            r"reflected\s+origin|permissive\s+cors)",
        ],
        "keywords": ["cors", "cors issue", "cors issues", "cors misconfiguration",
                     "cors wildcard", "cors bypass", "access control allow origin",
                     "access-control-allow-origin", "reflected origin",
                     "permissive cors", "cross origin resource sharing"],
    },
    "external_form_action": {
        "name": "External Form Action (Credential Exfiltration Risk)",
        "explanation": (
            "When a <form> submits to a different origin than the page it lives on, "
            "everything typed into the form — including passwords and payment details "
            "— is sent to that external site. Attackers exploit this by compromising "
            "third-party form endpoints, typosquatting domains, or hijacking legitimate "
            "form handlers. Users see the trusted page in the URL bar and have no "
            "indication their credentials are leaving."
        ),
        "severity": "High",
        "fix": (
            "Always submit sensitive forms (login, payment, profile) to your own "
            "backend on the same origin. If cross-origin submission is intentional "
            "(e.g., a payment processor), document it, verify the action URL is HTTPS "
            "and pinned, and audit it whenever dependencies change. A strict CSP "
            "form-action directive can block unexpected external targets."
        ),
        "patterns": [
            r"(external\s+form\s+action|form\s+(to|submits?\s+to)\s+(external|different)\s+origin|"
            r"cross[-\s]?origin\s+form|form\s+action\s+(external|phishing))",
        ],
        "keywords": ["external form action", "cross origin form",
                     "form to external origin", "form submits to external",
                     "form action external", "phishing form",
                     "credential exfiltration", "form action phishing",
                     "form hijack"],
    },
    "inline_event_handlers": {
        "name": "Inline Event Handlers",
        "explanation": (
            "Elements with onclick, onmouseover, onerror, onload (and similar) "
            "attributes embed JavaScript inline in HTML. They are not a "
            "vulnerability on their own, but they defeat strict Content "
            "Security Policy: while inline handlers are present you cannot "
            "drop 'unsafe-inline' from script-src, so every other XSS "
            "protection is weaker by extension. They also complicate code "
            "review and obscure script provenance."
        ),
        "severity": "Low",
        "fix": (
            "Move every inline event handler into addEventListener calls in "
            "a separate script file. Once the HTML has no on* attributes, "
            "enable a strict CSP without 'unsafe-inline' for script-src — "
            "that single change blocks most XSS variants by default."
        ),
        "patterns": [
            r"(inline\s+event\s+handler|onclick\s+attribute|on[a-z]+\s+attribute\s+in\s+html|"
            r"inline\s+handler|inline\s+on[a-z]+)",
        ],
        "keywords": ["inline event handlers", "inline event handler",
                     "onclick attribute", "onerror attribute", "onload attribute",
                     "inline handler", "inline onclick", "html on-attribute",
                     "csp unsafe inline"],
    },
    "insecure_websocket": {
        "name": "Insecure WebSocket (ws://) on HTTPS Page",
        "explanation": (
            "When an HTTPS page opens a WebSocket using ws:// instead of "
            "wss://, the WebSocket traffic is unencrypted even though the "
            "page itself is secure. An on-path attacker (coffee-shop WiFi, "
            "malicious VPN, compromised router) can read every message, "
            "inject fake messages, or downgrade the connection. Modern "
            "browsers refuse the connection in this configuration ('mixed "
            "content blocked'), which silently breaks the feature for users."
        ),
        "severity": "High",
        "fix": (
            "Switch every WebSocket URL to wss:// and serve a valid TLS "
            "certificate on the WebSocket endpoint. Keep ws:// only for "
            "local development against http://localhost. In production code, "
            "construct the URL with 'wss:' regardless of dev/prod so the "
            "scheme can't drift back to ws:// accidentally."
        ),
        "patterns": [
            r"(insecure\s+websocket|ws:\/\/|unencrypted\s+websocket|"
            r"mixed[-\s]content\s+websocket|websocket\s+(on\s+https|http\s+downgrade))",
        ],
        "keywords": ["insecure websocket", "ws://", "unencrypted websocket",
                     "mixed content websocket", "websocket downgrade",
                     "websocket on https", "wss vs ws"],
    },
    "admin_endpoint": {
        "name": "Admin Endpoint Exposure",
        "explanation": (
            "When client-side JavaScript references internal API paths like "
            "/api/admin/, /api/internal/, or /api/debug/, those paths are "
            "trivially discoverable by reading the page source. Server-side "
            "authentication is still the primary control, but leaking a "
            "target list hands attackers a known starting point and makes "
            "their reconnaissance pointless. Common pattern: a SPA bundles "
            "admin code into the same JS file as user code."
        ),
        "severity": "High",
        "fix": (
            "Strip admin/internal endpoint references from any code shipped "
            "to the browser. Split your build so the admin bundle is served "
            "only to admin routes, behind authentication. Enforce "
            "authorization on every such endpoint server-side, and consider "
            "blocking the entire path at your edge or WAF for traffic "
            "outside the office IP range."
        ),
        "patterns": [
            r"(admin\s+endpoint\s+(leak|exposure|disclosure)|"
            r"internal\s+api\s+(leak|exposure)|"
            r"/api/(admin|internal|debug|management)|"
            r"exposed\s+admin\s+(api|endpoint))",
        ],
        "keywords": ["admin endpoint exposure", "admin endpoint", "admin api leak",
                     "internal api exposure", "/api/admin", "/api/internal",
                     "/api/debug", "exposed admin endpoint",
                     "admin endpoint in client code"],
    },
    "cloud_storage": {
        "name": "Cloud Storage Reference",
        "explanation": (
            "References to AWS S3, Google Cloud Storage, Azure Blob, or "
            "Cloudflare R2 buckets in client-side HTML/JS are common (CDN "
            "use is fine) — but they become a real risk when the bucket "
            "name itself contains words like backup, private, internal, "
            "staging, dump, or secret, or when the bucket allows public "
            "listing. Misconfigured cloud storage has caused dozens of "
            "real-world data leaks (millions of records each)."
        ),
        "severity": "Low",
        "fix": (
            "Confirm the bucket policy is not public-readable for listing. "
            "On AWS S3: enable 'Block Public Access' at the account level "
            "and prefer signed URLs for private content. On GCS: enable "
            "'Uniform bucket-level access' and disable anonymous access. "
            "On Azure / R2: disable anonymous reads and use SAS tokens. "
            "Audit bucket names — rename anything labelled 'private' / "
            "'backup' / 'internal' to a neutral string so it's not a "
            "homing beacon for attackers."
        ),
        "patterns": [
            r"(cloud\s+storage\s+(exposure|leak|reference)|"
            r"s3\s+bucket\s+(exposed|public|leak)|"
            r"gcs\s+bucket\s+(exposed|public)|"
            r"azure\s+blob\s+(exposed|public)|"
            r"public\s+(s3|gcs|azure)\s+bucket)",
        ],
        "keywords": ["cloud storage", "cloud storage reference", "s3 bucket",
                     "s3 bucket exposure", "public s3", "gcs bucket",
                     "azure blob", "r2 storage", "public bucket",
                     "bucket policy", "object storage leak"],
    },
}

# ---------------------------------------------------------------------------
# Module-level keyword cache used by Algorithm 3
# ---------------------------------------------------------------------------
_ALL_KEYWORDS: list = []
_KEYWORD_TO_KEY: dict = {}
for _k, _v in VULNERABILITIES.items():
    for _kw in _v["keywords"]:
        _ALL_KEYWORDS.append(_kw)
        _KEYWORD_TO_KEY[_kw] = _k

# Stop words stripped during fuzzy matching to reduce noise
_FUZZY_STOP_WORDS = frozenset({
    "what", "about", "is", "are", "the", "tell", "me", "how", "to",
    "fix", "do", "you", "have", "can", "explain", "describe", "a", "an",
    "i", "want", "know", "learn", "please", "show", "give", "information",
    "on", "regarding", "for", "with", "there",
})


# ---------------------------------------------------------------------------
# Algorithm 2: Keyword Matching via Regex Pattern Matching
# ---------------------------------------------------------------------------
def regex_match(user_input: str) -> Optional[str]:
    """Return the first vulnerability key whose regex patterns match user_input."""
    text = user_input.lower()
    for key, vuln in VULNERABILITIES.items():
        for pattern in vuln["patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                return key
    return None


# ---------------------------------------------------------------------------
# Algorithm 3: Fuzzy String Matching
# ---------------------------------------------------------------------------
def fuzzy_match(user_input: str, threshold: int = 75) -> tuple:
    """
    Returns (vuln_key, score). vuln_key is None if nothing scores above threshold.
    Score is always returned for "did you mean" suggestions.
    """
    if len(user_input.strip()) < 3:
        return None, 0

    text = user_input.lower()

    # Token extraction: strip common noise words to improve matching accuracy
    tokens = [w for w in re.split(r'\W+', text) if w and w not in _FUZZY_STOP_WORDS]
    cleaned = " ".join(tokens)

    # Direct keyword match on cleaned text
    if cleaned and cleaned in _KEYWORD_TO_KEY:
        return _KEYWORD_TO_KEY[cleaned], 100

    # Check if any keyword is contained within the cleaned text
    if cleaned:
        for kw in _ALL_KEYWORDS:
            if kw in cleaned:
                return _KEYWORD_TO_KEY[kw], 95

    best_key = None
    best_score = 0

    # Try fuzzy matching on cleaned text first, then fall back to original
    search_texts = [cleaned, text] if cleaned and cleaned != text else [text]
    for search_text in search_texts:
        for key, vuln in VULNERABILITIES.items():
            for kw in vuln["keywords"]:
                score = fuzz.partial_ratio(search_text, kw)
                if score > best_score:
                    best_score = score
                    best_key = key

    if best_score >= threshold:
        return best_key, best_score

    matches = difflib.get_close_matches(text, _ALL_KEYWORDS, n=1, cutoff=0.75)
    if matches:
        return _KEYWORD_TO_KEY[matches[0]], 75

    return best_key, best_score


# ---------------------------------------------------------------------------
# Main analysis pipeline
# ---------------------------------------------------------------------------
def analyze(user_input: str) -> dict:
    """
    Run the 3-algorithm pipeline and return structured JSON.
    Order: Regex → Fuzzy → Rule-Based Classification (knowledge base lookup)
    """
    # Handle greetings / meta commands before vulnerability detection
    meta = _handle_meta(user_input)
    if meta:
        return meta

    vuln_key = None
    matched_by = None

    # Algorithm 2 – Regex
    vuln_key = regex_match(user_input)
    if vuln_key:
        matched_by = "regex"

    # Algorithm 3 – Fuzzy
    if not vuln_key:
        fuzzy_key, fuzzy_score = fuzzy_match(user_input)
        if fuzzy_key and fuzzy_score >= 75:
            vuln_key = fuzzy_key
            matched_by = "fuzzy"
        elif fuzzy_key and fuzzy_score >= 55:
            # Close enough to suggest
            suggested_name = VULNERABILITIES[fuzzy_key]["name"]
            return {
                "vulnerability": None,
                "explanation": (
                    f"Hmm, I'm not sure about that. Did you mean **{suggested_name}**? "
                    f"Reply 'Yes' to learn about it, or ask me about a specific vulnerability.\n\n"
                    "You can ask things like:\n"
                    "• 'What is SQL Injection?'\n"
                    "• 'How to fix XSS?'\n"
                    "• 'Tell me about CSRF'"
                ),
                "severity": None,
                "fix": None,
                "report": None,
                "matched_by": "suggestion",
                "suggested_vuln": fuzzy_key,
            }

    # Algorithm 1 – Rule-Based lookup
    if vuln_key and vuln_key in VULNERABILITIES:
        vuln = VULNERABILITIES[vuln_key]
        report = _build_report(vuln)
        return {
            "vulnerability": vuln["name"],
            "explanation": vuln["explanation"],
            "severity": vuln["severity"],
            "fix": vuln["fix"],
            "report": report,
            "matched_by": matched_by,
        }

    # Nothing detected
    return {
        "vulnerability": None,
        "explanation": (
            "I'm not sure I understood that. I'm best at helping with cybersecurity topics! 🔒\n\n"
            "You can ask me things like:\n"
            "• 'What is SQL Injection?'\n"
            "• 'How to fix XSS?'\n"
            "• 'Tell me about CSRF'\n"
            "• 'List all vulnerabilities'\n\n"
            "Or just say 'help' to see everything I can do!"
        ),
        "severity": None,
        "fix": None,
        "report": None,
        "matched_by": None,
    }


def _build_report(vuln: dict) -> str:
    return (
        f"## Security Report: {vuln['name']}\n\n"
        f"**Severity:** {vuln['severity']}\n\n"
        f"**Description:** {vuln['explanation']}\n\n"
        f"**Recommended Fix:** {vuln['fix']}"
    )


def _handle_meta(text: str) -> Optional[dict]:
    """Handle greetings, help, list commands, and rich conversational patterns."""
    # Strip any trailing punctuation/whitespace so "hi?" or "hi!!!" still matches "hi"
    t = text.strip().lower()
    # Normalized form: trim common trailing punctuation for greeting-style matches
    t_norm = re.sub(r"[\s!?.,;:~\-]+$", "", t)

    def _meta_response(explanation: str, tag: str) -> dict:
        return {
            "vulnerability": None,
            "explanation": explanation,
            "severity": None,
            "fix": None,
            "report": None,
            "matched_by": tag,
        }

    # ------------------------------------------------------------------
    # Greetings (expanded — accepts trailing ? ! . , and casual forms)
    # ------------------------------------------------------------------
    greetings = {
        "hi", "hii", "hiii", "hiiii", "hey", "heyy", "heyyy", "hello", "helloo",
        "hellooo", "hola", "heya", "heyo", "yo", "yoyo", "sup", "wassup", "wazzup",
        "whats up", "what's up", "whatsup", "whazzup", "howdy", "greetings",
        "good morning", "good afternoon", "good evening", "good night", "gm", "gn",
        "morning", "afternoon", "evening", "salam", "salaam", "assalamualaikum",
        "peace", "hi there", "hello there", "hey there", "hi bot", "hello bot",
        "hey bot", "hi baseera", "hello baseera", "hey baseera",
    }
    if t_norm in greetings or re.match(
        r"^(hi+|hey+|hello+|hola|yo+|sup|wassup|whazzup|howdy|greetings|"
        r"heya|heyo|heyyy|salam|salaam|peace|gm|gn)"
        r"([\s,!?.]+(there|bot|baseera|baseera ai|buddy|friend|mate|bro|sis))?"
        r"[!?.,~\s]*$",
        t,
    ):
        return _meta_response(
            "Hello! 👋 I'm Baseera Assistant, your AI-powered security advisor. "
            "Ask me about any web vulnerability — e.g., 'What is XSS?' "
            "or 'How do I fix SQL Injection?'",
            "meta:greeting",
        )

    # ------------------------------------------------------------------
    # How are you / Small talk
    # ------------------------------------------------------------------
    if re.search(
        r"\b(how are you|how are u|how r u|how are ya|how are things|"
        r"how are you doing|how'?s it going|how'?s everything|how'?s life|"
        r"how do you do|how you doing|how ya doing|are you okay|are you ok|"
        r"you good|u good|everything good|you doing well|how have you been|"
        r"how been|how'?s your day|hru)\b",
        t,
    ):
        return _meta_response(
            "I'm doing great, thanks for asking! 😊 "
            "I'm always ready to help you with cybersecurity questions. "
            "What would you like to know about?",
            "meta:how_are_you",
        )

    # Nice to meet you
    if re.search(
        r"\b(nice to meet you|pleased to meet you|good to meet you|"
        r"glad to meet you|nice meeting you)\b",
        t,
    ):
        return _meta_response(
            "Nice to meet you too! 😊 I'm Baseera, here to help with your cybersecurity questions. "
            "What would you like to explore?",
            "meta:nice_to_meet",
        )

    # What is Baseera?
    if re.search(
        r"\b(what is baseera|tell me about baseera|who is baseera|about baseera|explain baseera|describe baseera|baseera platform|what does baseera do|what'?s baseera)\b",
        t,
    ):
        return _meta_response(
            "Baseera is a cybersecurity platform with a browser extension that helps detect vulnerabilities and security risks in websites. "
            "It analyzes web applications, highlights potential issues, and provides clear explanations and remediation guidance to improve overall security.",
            "meta:about_baseera",
        )

    # Who is Baseera AI?
    if re.search(
        r"\b(baseera ai|baseera assistant|who are you|what are you|your name|introduce yourself|what is your name|what'?s your name|tell me about yourself|what do you do|what you do|what about you)\b",
        t,
    ):
        return _meta_response(
            "Baseera AI is an intelligent cybersecurity assistant that explains web application vulnerabilities, evaluates their severity, "
            "and provides structured recommendations for mitigation and secure implementation.",
            "meta:identity",
        )

    # ------------------------------------------------------------------
    # "What is cybersecurity?" and related core concepts
    # ------------------------------------------------------------------
    if re.search(
        r"\b(what\s+is\s+cyber[\s\-]?security|what'?s\s+cyber[\s\-]?security|"
        r"define\s+cyber[\s\-]?security|explain\s+cyber[\s\-]?security|"
        r"meaning\s+of\s+cyber[\s\-]?security|tell\s+me\s+about\s+cyber[\s\-]?security|"
        r"cyber[\s\-]?security\s+meaning|cyber[\s\-]?security\s+definition|"
        r"what\s+does\s+cyber[\s\-]?security\s+mean|"
        r"what\s+is\s+(info(rmation)?\s+security|infosec)|"
        r"what\s+is\s+(application|app|web|network|it)\s+security|"
        r"what\s+is\s+(cyber)\b)",
        t,
    ):
        return _meta_response(
            "**Cybersecurity** is the practice of protecting systems, networks, applications, and data "
            "from digital attacks, unauthorized access, damage, or theft. 🛡️\n\n"
            "It covers several important areas:\n"
            "• **Application Security** — protecting software and web apps from flaws like SQL Injection, XSS, and CSRF.\n"
            "• **Network Security** — defending the infrastructure that moves data (firewalls, VPNs, intrusion detection).\n"
            "• **Information Security** — keeping data confidential, available, and unaltered (the CIA triad).\n"
            "• **Operational Security** — processes and decisions for handling and protecting data assets.\n"
            "• **End-User Education** — training people to avoid phishing and social-engineering attacks.\n\n"
            "Baseera focuses on **web application security** — scanning websites for vulnerabilities and explaining how to fix them. "
            "Ask me 'What is XSS?' or 'List all vulnerabilities' to get started!",
            "meta:what_is_cybersecurity",
        )

    # What is a vulnerability?
    if re.search(
        r"\b(what\s+is\s+(a\s+)?vulnerability|what'?s\s+(a\s+)?vulnerability|"
        r"define\s+vulnerability|meaning\s+of\s+vulnerability|"
        r"vulnerability\s+definition|vulnerability\s+meaning|"
        r"what\s+does\s+vulnerability\s+mean|what\s+is\s+vuln|"
        r"what\s+are\s+vulnerabilities|what\s+does\s+vuln\s+mean)\b",
        t,
    ):
        return _meta_response(
            "A **vulnerability** is a weakness or flaw in a system, application, or network that an attacker can exploit "
            "to gain unauthorized access, steal data, or cause damage. 🔓\n\n"
            "Vulnerabilities usually come from:\n"
            "• Insecure coding (e.g., SQL Injection, XSS)\n"
            "• Misconfiguration (e.g., missing security headers, exposed files)\n"
            "• Outdated software with known CVEs\n"
            "• Weak authentication or session management\n\n"
            "Ask me 'List all vulnerabilities' to see what I can help you with!",
            "meta:what_is_vulnerability",
        )

    # What is an exploit / zero-day / CVE / OWASP
    if re.search(r"\b(what\s+is\s+(an\s+)?exploit|define\s+exploit|exploit\s+meaning|what\s+does\s+exploit\s+mean)\b", t):
        return _meta_response(
            "An **exploit** is a piece of code, a technique, or a sequence of steps that takes advantage of a vulnerability "
            "to perform malicious actions — such as stealing data, crashing a system, or getting unauthorized access. 💥\n\n"
            "Think of a vulnerability as the unlocked window, and the exploit as the thief climbing through it.",
            "meta:what_is_exploit",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?zero[\s\-]?day|zero\s*day\s+(meaning|definition|explain)|0[\s\-]?day|define\s+zero\s*day)\b", t):
        return _meta_response(
            "A **zero-day** (0-day) is a vulnerability that is unknown to the software vendor or has no patch available yet. ⏰\n\n"
            "Attackers who discover zero-days can exploit them before defenders get a chance to fix them, which makes these "
            "bugs extremely valuable and dangerous. The name comes from 'day zero' — the vendor has had zero days to respond.",
            "meta:what_is_zero_day",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?cve|define\s+cve|cve\s+(meaning|definition|explain)|what\s+does\s+cve\s+stand\s+for|what\s+does\s+cve\s+mean)\b", t):
        return _meta_response(
            "**CVE** stands for **Common Vulnerabilities and Exposures** — a public catalog of known security flaws, "
            "each assigned a unique ID like `CVE-2024-12345`. 📋\n\n"
            "CVEs make it easy to reference and track vulnerabilities across vendors, tools, and research reports. "
            "You can look them up at https://cve.mitre.org.",
            "meta:what_is_cve",
        )
    if re.search(r"\b(what\s+is\s+owasp|owasp\s+(meaning|top\s*10|definition)|explain\s+owasp|define\s+owasp|owasp\s+top\s*10)\b", t):
        return _meta_response(
            "**OWASP** (Open Worldwide Application Security Project) is a non-profit foundation that publishes free resources "
            "on web application security. 🌐\n\n"
            "The **OWASP Top 10** is the most widely known list — it ranks the most critical web application security risks, "
            "such as Injection, Broken Access Control, and Cryptographic Failures. It's essentially the starting point for "
            "anyone doing web security.",
            "meta:what_is_owasp",
        )

    # CIA triad
    if re.search(r"\b(cia\s+triad|what\s+is\s+cia|cia\s+(in\s+)?security|confidentiality\s+integrity\s+availability)\b", t):
        return _meta_response(
            "The **CIA Triad** is the foundation of information security:\n\n"
            "• **Confidentiality** — only authorized people can see the data\n"
            "• **Integrity** — data is accurate and hasn't been tampered with\n"
            "• **Availability** — systems and data are accessible when needed\n\n"
            "Most vulnerabilities break at least one of these three. 🛡️",
            "meta:cia_triad",
        )

    # What is phishing / malware / ransomware / DDoS / brute force / MITM / social engineering
    if re.search(r"\b(what\s+is\s+phishing|define\s+phishing|phishing\s+(meaning|definition|explain|attack)|explain\s+phishing|phishing\s+examples?)\b", t):
        return _meta_response(
            "**Phishing** is a social-engineering attack where attackers impersonate a trusted entity (bank, boss, service) "
            "to trick victims into revealing credentials, clicking malicious links, or installing malware. 🎣\n\n"
            "Defenses: user training, email filtering, MFA, and verifying URLs before entering credentials.",
            "meta:what_is_phishing",
        )
    if re.search(r"\b(what\s+is\s+malware|define\s+malware|malware\s+(meaning|definition|explain|types?)|explain\s+malware)\b", t):
        return _meta_response(
            "**Malware** (malicious software) is any program designed to harm, exploit, or gain unauthorized access to a system. 🦠\n\n"
            "Common types: **viruses**, **worms**, **trojans**, **ransomware**, **spyware**, **adware**, **rootkits**, and **keyloggers**.\n\n"
            "Defenses: antivirus, endpoint protection, patching, least privilege, and avoiding untrusted downloads.",
            "meta:what_is_malware",
        )
    if re.search(r"\b(what\s+is\s+ransomware|define\s+ransomware|ransomware\s+(meaning|definition|explain|attack))\b", t):
        return _meta_response(
            "**Ransomware** is malware that encrypts a victim's files and demands payment (usually in cryptocurrency) to decrypt them. 💰🔒\n\n"
            "Defenses: offline backups, patch management, email filtering, endpoint detection, and **never pay** when avoidable — "
            "payment funds more attacks and doesn't guarantee recovery.",
            "meta:what_is_ransomware",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?ddos|what\s+is\s+dos\s+attack|define\s+ddos|ddos\s+(meaning|definition|explain|attack)|denial\s+of\s+service)\b", t):
        return _meta_response(
            "A **DDoS** (Distributed Denial of Service) attack floods a server with traffic from many machines to make it unavailable to legitimate users. 🌊\n\n"
            "Defenses: rate limiting, WAFs, CDN/DDoS-protection services (Cloudflare, Akamai), and auto-scaling infrastructure.",
            "meta:what_is_ddos",
        )
    if re.search(r"\b(what\s+is\s+brute[\s\-]?force|brute[\s\-]?force\s+(attack|meaning|definition|explain)|define\s+brute\s*force)\b", t):
        return _meta_response(
            "A **brute-force attack** tries every possible combination of passwords or keys until it finds the right one. 🔨\n\n"
            "Defenses: strong passwords, account lockout after failed attempts, CAPTCHAs, rate limiting, and multi-factor authentication.",
            "meta:what_is_brute_force",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?man[\s\-]?in[\s\-]?the[\s\-]?middle|mitm\s+(attack|meaning|explain)|what\s+is\s+mitm|define\s+mitm|man\s+in\s+the\s+middle)\b", t):
        return _meta_response(
            "A **Man-in-the-Middle (MITM)** attack is when an attacker secretly intercepts and possibly alters communication between two parties. 🕵️\n\n"
            "Common on unsecured Wi-Fi. Defenses: HTTPS/TLS everywhere, HSTS, certificate pinning, and avoiding public Wi-Fi for sensitive work.",
            "meta:what_is_mitm",
        )
    if re.search(r"\b(what\s+is\s+social\s+engineering|social\s+engineering\s+(meaning|definition|explain|attack))\b", t):
        return _meta_response(
            "**Social engineering** manipulates people into breaking security procedures — e.g., impersonating IT support to get a password. 🧠\n\n"
            "It targets humans, not technology. Defenses: awareness training, strong verification procedures, and a culture where employees feel safe saying 'no' or 'let me verify first'.",
            "meta:what_is_social_engineering",
        )

    # Encryption / hashing / HTTPS / TLS / SSL / firewall / VPN / WAF / MFA / 2FA
    if re.search(r"\b(what\s+is\s+encryption|define\s+encryption|encryption\s+(meaning|definition|explain)|how\s+does\s+encryption\s+work)\b", t):
        return _meta_response(
            "**Encryption** converts readable data (plaintext) into scrambled data (ciphertext) using an algorithm and a key, "
            "so only someone with the right key can read it. 🔐\n\n"
            "Two main types:\n"
            "• **Symmetric** (same key for encrypt & decrypt) — e.g., AES.\n"
            "• **Asymmetric** (public/private key pair) — e.g., RSA, ECC.\n\n"
            "Used everywhere: HTTPS, messaging apps, disk encryption, and password storage (well, hashing for passwords).",
            "meta:what_is_encryption",
        )
    if re.search(r"\b(what\s+is\s+hashing|define\s+hashing|hashing\s+(meaning|definition|explain)|what\s+is\s+(a\s+)?hash(\s+function)?|difference\s+between\s+encryption\s+and\s+hashing)\b", t):
        return _meta_response(
            "**Hashing** is a one-way function that turns input data into a fixed-size fingerprint. Unlike encryption, it **cannot be reversed**. 🔢\n\n"
            "Used for: storing passwords (use **bcrypt**, **scrypt**, or **Argon2** — never MD5/SHA1!), verifying file integrity, and digital signatures.",
            "meta:what_is_hashing",
        )
    if re.search(r"\b(what\s+is\s+https|https\s+(meaning|definition|explain)|difference\s+between\s+http\s+and\s+https)\b", t):
        return _meta_response(
            "**HTTPS** is HTTP with **TLS encryption**. It protects data in transit between the browser and the server "
            "from eavesdropping and tampering. 🔒\n\n"
            "Always use HTTPS — modern browsers penalize HTTP sites, and tools like Let's Encrypt make certificates free.",
            "meta:what_is_https",
        )
    if re.search(r"\b(what\s+is\s+tls|what\s+is\s+ssl|tls\s+(meaning|definition|explain)|ssl\s+(meaning|definition|explain)|difference\s+between\s+tls\s+and\s+ssl)\b", t):
        return _meta_response(
            "**TLS** (Transport Layer Security) is the successor to **SSL** (Secure Sockets Layer). They both encrypt network "
            "communication, but SSL is deprecated — **use TLS 1.2 or 1.3**. 🔐\n\n"
            "TLS powers HTTPS, secure email (SMTPS, IMAPS), VPNs, and more.",
            "meta:what_is_tls",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?firewall|firewall\s+(meaning|definition|explain))\b", t):
        return _meta_response(
            "A **firewall** is a security device (hardware or software) that filters network traffic based on rules — "
            "allowing trusted traffic and blocking the rest. 🧱\n\n"
            "Types include: network firewalls, host firewalls, and **Web Application Firewalls (WAF)** that inspect HTTP traffic for attack patterns like SQLi and XSS.",
            "meta:what_is_firewall",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?vpn|vpn\s+(meaning|definition|explain))\b", t):
        return _meta_response(
            "A **VPN** (Virtual Private Network) creates an encrypted tunnel between your device and a remote server, "
            "hiding your real IP and protecting traffic from local eavesdroppers. 🌐🔒\n\n"
            "Great for: untrusted Wi-Fi, remote work, and privacy. Not a silver bullet — the VPN provider itself can see your traffic, so pick a trustworthy one.",
            "meta:what_is_vpn",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?waf|waf\s+(meaning|definition|explain)|web\s+application\s+firewall)\b", t):
        return _meta_response(
            "A **WAF** (Web Application Firewall) sits in front of a web app and inspects HTTP requests, blocking common attacks "
            "like SQLi, XSS, and path traversal. 🛡️\n\n"
            "Popular options: Cloudflare WAF, AWS WAF, ModSecurity. A WAF is defense-in-depth — not a replacement for secure code.",
            "meta:what_is_waf",
        )
    if re.search(r"\b(what\s+is\s+mfa|what\s+is\s+2fa|mfa\s+(meaning|definition|explain)|2fa\s+(meaning|definition|explain)|multi[\s\-]factor|two[\s\-]factor)\b", t):
        return _meta_response(
            "**MFA** (Multi-Factor Authentication) — and its subset **2FA** — require more than just a password to log in. 🔑📱\n\n"
            "Factors come in three flavors:\n"
            "• Something you **know** (password, PIN)\n"
            "• Something you **have** (phone, hardware key)\n"
            "• Something you **are** (fingerprint, face)\n\n"
            "Prefer TOTP apps or hardware keys over SMS — SMS can be intercepted via SIM swapping.",
            "meta:what_is_mfa",
        )

    # Penetration testing / bug bounty / ethical hacking / red team / blue team
    if re.search(r"\b(what\s+is\s+(a\s+)?pen(etration)?\s*test(ing)?|pen\s*test(ing)?\s+(meaning|definition|explain)|define\s+pen\s*test|what\s+is\s+pentesting)\b", t):
        return _meta_response(
            "**Penetration testing** (pentesting) is authorized simulated hacking of a system to find vulnerabilities before real attackers do. 🕵️‍♀️\n\n"
            "Typical phases: **reconnaissance → scanning → exploitation → post-exploitation → reporting**. The output is a report with findings and remediation guidance.",
            "meta:what_is_pentest",
        )
    if re.search(r"\b(what\s+is\s+ethical\s+hacking|ethical\s+hacker|white\s+hat|what\s+is\s+(a\s+)?hacker)\b", t):
        return _meta_response(
            "**Ethical hacking** means using offensive security skills legally and with permission to strengthen defenses. 🤍🎩\n\n"
            "Types of hackers:\n"
            "• **White hat** — ethical, authorized\n"
            "• **Black hat** — malicious, illegal\n"
            "• **Gray hat** — somewhere in between (often unauthorized but not malicious)",
            "meta:ethical_hacking",
        )
    if re.search(r"\b(what\s+is\s+(a\s+)?bug\s+bounty|bug\s+bounty\s+(program|meaning|definition|explain))\b", t):
        return _meta_response(
            "A **bug bounty program** pays security researchers for responsibly reporting vulnerabilities in a company's products. 🐛💵\n\n"
            "Big programs: HackerOne, Bugcrowd, Google, Microsoft, Meta. Great way to learn and earn if you have offensive-security skills.",
            "meta:bug_bounty",
        )
    if re.search(r"\b(red\s+team|blue\s+team|purple\s+team|red\s+vs\s+blue)\b", t):
        return _meta_response(
            "In security operations:\n\n"
            "• **Red Team** — simulates attackers; tries to break in.\n"
            "• **Blue Team** — defenders; monitors, detects, and responds.\n"
            "• **Purple Team** — a collaboration between the two to improve defenses using red-team findings. 🟣",
            "meta:red_blue_team",
        )

    # CIA, access control, RBAC, least privilege, zero trust
    if re.search(r"\b(what\s+is\s+least\s+privilege|principle\s+of\s+least\s+privilege|polp)\b", t):
        return _meta_response(
            "**Principle of Least Privilege (PoLP)** — every user, process, or system should have only the minimum permissions needed to do its job. 🔑\n\n"
            "Limits blast radius when something is compromised. A web app shouldn't run as root; a DB user shouldn't have DROP permission on production.",
            "meta:least_privilege",
        )
    if re.search(r"\b(what\s+is\s+zero\s+trust|zero[\s\-]trust\s+(meaning|definition|explain|architecture))\b", t):
        return _meta_response(
            "**Zero Trust** is a security model that assumes no user or device should be trusted by default — "
            "every request is verified regardless of where it comes from. 🚫🤝\n\n"
            "Motto: *'never trust, always verify'*. Relies heavily on identity, device posture, and continuous authentication.",
            "meta:zero_trust",
        )
    if re.search(r"\b(what\s+is\s+rbac|role[\s\-]based\s+access\s+control)\b", t):
        return _meta_response(
            "**RBAC** (Role-Based Access Control) grants permissions based on the user's role (admin, editor, viewer) rather than per-user. 👥\n\n"
            "Simpler to manage at scale. Compare with **ABAC** (Attribute-Based) which uses attributes like department, time, or device for finer-grained control.",
            "meta:rbac",
        )

    # How-to guidance
    if re.search(r"\b(how\s+(do\s+i|can\s+i|to)\s+(secure|protect|harden)\s+(my\s+)?(website|site|web\s+app|application|web\s+application))\b", t):
        return _meta_response(
            "To secure a web application, cover these essentials:\n\n"
            "🔹 **HTTPS everywhere** (HSTS, TLS 1.2/1.3)\n"
            "🔹 **Input validation & output encoding** (prevent XSS, SQLi)\n"
            "🔹 **Parameterized queries** for all DB access\n"
            "🔹 **Strong authentication** — hash passwords with bcrypt/Argon2, add MFA\n"
            "🔹 **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy\n"
            "🔹 **Secure cookies** — HttpOnly, Secure, SameSite=Strict\n"
            "🔹 **CSRF tokens** on state-changing requests\n"
            "🔹 **Keep dependencies patched** (use `npm audit`, `pip-audit`, Snyk, Dependabot)\n"
            "🔹 **Log & monitor** (no secrets in logs)\n"
            "🔹 **Regular pen tests & scans** — run Baseera on every deploy!\n\n"
            "Want details on any of these? Ask me 'What is CSP?' or 'How to fix SQL Injection?'",
            "meta:how_to_secure_site",
        )
    if re.search(r"\b(how\s+(do\s+i|can\s+i|to)\s+(create|make|choose)\s+(a\s+)?strong\s+password|strong\s+password\s+tips)\b", t):
        return _meta_response(
            "A strong password is:\n\n"
            "• **Long** — 14+ characters is the sweet spot\n"
            "• **Unique** — never reused across sites\n"
            "• **Random** — generated by a password manager (1Password, Bitwarden, KeePass)\n"
            "• **Protected by MFA** whenever possible\n\n"
            "Better than complexity rules is **length**. A passphrase of 5 random words beats `P@ssw0rd!` any day. 🔑",
            "meta:strong_password",
        )
    if re.search(r"\b(how\s+(do\s+i|can\s+i|to)\s+(avoid|prevent|stop|not\s+get)\s+(hacked|phishing|phished))\b", t):
        return _meta_response(
            "Practical defenses against phishing and account takeover:\n\n"
            "• Use **MFA** everywhere (prefer TOTP/hardware keys over SMS)\n"
            "• **Verify URLs** before entering credentials — hover links, check the domain\n"
            "• Never click **unsolicited attachments**; verify sender out-of-band\n"
            "• Use a **password manager** — it won't autofill on fake domains\n"
            "• Keep OS and browser **patched**\n"
            "• Be suspicious of urgency ('act now!') — attackers exploit emotional pressure 🧠",
            "meta:avoid_phishing",
        )
    if re.search(r"\b(how\s+do\s+(i|you)\s+(learn|start|get\s+into)\s+(cyber[\s\-]?security|hacking|infosec|penetration\s+testing|pentesting)|how\s+to\s+(learn|start)\s+cyber)\b", t):
        return _meta_response(
            "Great question! Some solid starting points:\n\n"
            "📚 **Free learning platforms**: TryHackMe, HackTheBox, PortSwigger Web Security Academy, OverTheWire\n"
            "📖 **Read**: OWASP Top 10, OWASP Testing Guide, 'The Web Application Hacker's Handbook'\n"
            "🧪 **Practice**: CTFs (picoCTF, CTFtime), bug bounty programs on HackerOne/Bugcrowd\n"
            "🎓 **Certs (later)**: CompTIA Security+, eJPT, OSCP, CEH\n"
            "🧠 **Build fundamentals first**: networking, Linux, basic scripting (Python/Bash), and how the web works (HTTP, cookies, sessions)\n\n"
            "Consistency > cramming. Even 30 minutes a day adds up fast.",
            "meta:how_to_learn",
        )
    if re.search(r"\b(am\s+i\s+(hacked|compromised)|have\s+i\s+been\s+(hacked|pwned)|was\s+i\s+hacked|did\s+i\s+get\s+hacked)\b", t):
        return _meta_response(
            "If you think you might have been compromised:\n\n"
            "1. **Change passwords** (from a trusted device) — start with email, then everything else\n"
            "2. **Enable MFA** on every important account\n"
            "3. **Check sessions** — log out of all devices in account settings\n"
            "4. **Scan devices** with an up-to-date antivirus/EDR\n"
            "5. **Check https://haveibeenpwned.com** to see if your email is in known breaches\n"
            "6. **Review bank/card activity** and freeze credit if needed\n\n"
            "If it's a business system, isolate it and contact your security team or an incident-response firm. 🚨",
            "meta:am_i_hacked",
        )

    # Is X safe / should I use X (general guidance, not specific product reviews)
    if re.search(r"\b(is\s+(http|plain\s+http|my\s+website|this\s+site)\s+(safe|secure))\b", t):
        return _meta_response(
            "Plain **HTTP** is not safe — data travels in plaintext and can be read or modified by anyone on the network. "
            "Always use **HTTPS** with TLS 1.2 or 1.3. Modern browsers also warn users on HTTP sites. 🚨",
            "meta:is_http_safe",
        )

    # Thanks
    if re.search(
        r"\b(thank you|thanks|thx|thanx|tysm|ty|appreciate it|much appreciated|"
        r"thanks a lot|thanks a million|thank you so much|many thanks|"
        r"cheers|kudos|grateful|appreciated|thanks bro|thanks man|thanks mate)\b",
        t,
    ):
        return _meta_response(
            "You're welcome! 😊 "
            "Feel free to ask me anything else about security vulnerabilities.",
            "meta:thanks",
        )

    # Goodbye
    if re.search(
        r"\b(bye|byee|byebye|bye\s+bye|goodbye|good\s+bye|see\s+you|see\s+ya|"
        r"cya|see\s+u|later|till\s+next\s+time|until\s+next\s+time|take\s+care|"
        r"good\s+night|gnight|nighty|night|peace\s+out|adios|ciao|farewell|"
        r"catch\s+you\s+later|talk\s+to\s+you\s+later|ttyl|gtg|gotta\s+go|"
        r"i\s+have\s+to\s+go|i\s+gotta\s+go|im\s+out|i'?m\s+out|heading\s+out)\b",
        t,
    ):
        return _meta_response(
            "Goodbye! Stay safe online! 🔒 "
            "Come back anytime you need security advice.",
            "meta:goodbye",
        )

    # Affirmative / OK
    if re.search(
        r"^(ok|okay|okey|k|kk|got\s+it|understood|copy|copy\s+that|roger|"
        r"roger\s+that|sure|surely|alright|all\s+right|aight|cool|nice|"
        r"great|awesome|perfect|good|fine|yes|yess|yep|yup|yeah|yea|ya|"
        r"right|correct|exactly|definitely|absolutely|indeed|for\s+sure|"
        r"of\s+course|makes\s+sense|sounds\s+good|sound\s+good|will\s+do|"
        r"👍|👌)[!.,?]?\s*$",
        t,
    ):
        return _meta_response(
            "Great! Let me know if you have any other security questions. "
            "I'm here to help! 💪",
            "meta:affirmative",
        )

    # Negative
    if re.search(
        r"^(no|noo|nope|nah|naah|not\s+really|not\s+now|not\s+at\s+the\s+moment|"
        r"never\s+mind|nvm|forget\s+it|cancel|stop|wait|no\s+thanks|no\s+thank\s+you|"
        r"i'?m\s+good|im\s+good|i'?m\s+fine|im\s+fine)[!.,?]?\s*$",
        t,
    ):
        return _meta_response(
            "No problem! Feel free to ask whenever you're ready. 😊",
            "meta:negative",
        )

    # Confusion / I don't understand
    if re.search(
        r"\b(i\s+don'?t\s+understand|i\s+dont\s+understand|i\s+don'?t\s+get\s+(it|that)|"
        r"confused|i'?m\s+confused|im\s+confused|this\s+is\s+confusing|what\s+do\s+you\s+mean|"
        r"what\s+did\s+you\s+mean|can\s+you\s+(explain|clarify|rephrase|simplify)|"
        r"explain\s+(it\s+)?(again|more|better|simpler)|can\s+you\s+say\s+that\s+again|"
        r"say\s+it\s+again|huh|what\?|pardon)\b",
        t,
    ):
        return _meta_response(
            "No problem — let me try again. 🙂 Could you tell me which part was unclear, "
            "or just ask the question in a different way? For example, you can say:\n"
            "• 'Explain XSS in simple words'\n"
            "• 'What does that mean?'\n"
            "• 'Give me an example'",
            "meta:confusion",
        )

    # Compliments
    if re.search(
        r"\b(you'?re\s+(great|awesome|amazing|cool|the\s+best|smart|helpful|brilliant|"
        r"fantastic|incredible|wonderful)|youre\s+great|nice\s+work|good\s+job|"
        r"great\s+job|well\s+done|amazing|impressive|bravo|kudos|love\s+you|love\s+it|"
        r"love\s+this|best\s+bot|good\s+bot|smart\s+bot|cool\s+bot)\b",
        t,
    ):
        return _meta_response(
            "Thank you, that means a lot! 😊 "
            "I'm always here to help you stay secure. "
            "Is there anything else you'd like to know?",
            "meta:compliment",
        )

    # Apologies (from the user)
    if re.search(
        r"\b(sorry|my\s+bad|my\s+mistake|i\s+apologize|apologies|excuse\s+me)\b",
        t,
    ):
        return _meta_response(
            "No worries at all! 😊 Ask me anything whenever you're ready.",
            "meta:apology",
        )

    # Jokes / Fun
    if re.search(
        r"\b(tell\s+me\s+a\s+joke|make\s+me\s+laugh|say\s+something\s+funny|"
        r"know\s+any\s+jokes|got\s+any\s+jokes|another\s+joke|one\s+more\s+joke|"
        r"cyber\s+joke|security\s+joke|hacker\s+joke|funny\s+story)\b",
        t,
    ) or t_norm in {"funny", "joke", "jokes"}:
        return _meta_response(
            "Why did the hacker break up with the internet? "
            "Because it had too many open connections! 😄 "
            "Now, shall we get back to serious security topics?",
            "meta:joke",
        )

    # General off-topic questions
    if re.search(
        r"\b(what\s+time\s+is\s+it|what'?s\s+the\s+time|current\s+time|"
        r"what'?s\s+the\s+weather|how'?s\s+the\s+weather|weather\s+today|"
        r"what\s+day\s+is\s+(it|today)|what'?s\s+the\s+date|today'?s\s+date|"
        r"what\s+year|tell\s+me\s+a\s+story|sing\s+(me\s+)?a\s+song|"
        r"can\s+you\s+(code|write\s+code|do\s+my\s+homework|solve\s+math))\b",
        t,
    ):
        return _meta_response(
            "I'm a security assistant, so I focus on cybersecurity topics. 😊 "
            "But I'm happy to help with anything related to vulnerabilities, web security, or how to protect yourself online!",
            "meta:off_topic",
        )

    # Profanity / abuse (simple heuristic, expanded)
    if re.search(
        r"\b(damn|shit|crap|fuck|fck|f\*ck|bitch|bastard|asshole|idiot|dumb|"
        r"stupid|moron|useless\s+bot|dumb\s+bot|stupid\s+bot|shut\s+up|"
        r"you\s+suck|hate\s+you|i\s+hate\s+(you|this\s+bot)|trash\s+bot|worst\s+bot)\b",
        t,
    ):
        return _meta_response(
            "I'm here to help you with cybersecurity topics! 😊 "
            "Let's keep it professional — feel free to ask me anything about security.",
            "meta:profanity",
        )

    # Help / capabilities (but NOT if a vulnerability name follows)
    if re.search(r"\b(help|what can you do|capabilities)\b", t):
        # Check if the message also contains a vulnerability keyword
        has_vuln = False
        for vuln in VULNERABILITIES.values():
            for kw in vuln["keywords"]:
                if kw in t:
                    has_vuln = True
                    break
            if has_vuln:
                break
        if not has_vuln:
            vuln_names = ", ".join(v["name"] for v in VULNERABILITIES.values())
            return _meta_response(
                f"I can explain, assess severity, and suggest fixes for these "
                f"vulnerabilities: {vuln_names}. "
                "Just ask 'What is <vuln>?' or 'How to fix <vuln>?'",
                "meta:help",
            )

    # Show vulnerabilities by severity (supports multiple: "show low and medium vulnerabilities")
    severity_levels = {"critical", "high", "medium", "low"}
    # Check if the message is asking about vulnerabilities by severity
    if re.search(r"\b(show|list|display|get|what\s+are|tell\s+me\s+about|give\s+me)\b.*vulnerabilit", t) or \
       re.search(r"vulnerabilit.*\b(critical|high|medium|low)\b", t):
        found_severities = [s for s in severity_levels if s in t]
        if found_severities:
            filtered = []
            labels = []
            for sev in ["critical", "high", "medium", "low"]:  # fixed order
                if sev in found_severities:
                    labels.append(sev.capitalize())
                    for v in VULNERABILITIES.values():
                        if v["severity"].lower() == sev:
                            filtered.append(f"- {v['name']} ({v['severity']})")
            if filtered:
                label_str = " & ".join(labels)
                return _meta_response(
                    f"{label_str} severity vulnerabilities:\n" + "\n".join(filtered),
                    f"meta:list:{'+'.join(s.lower() for s in labels)}",
                )

    # Show vulnerabilities by severity (simple pattern)
    severity_match = re.search(r"\b(show|list|display|get)\s+(critical|high|medium|low)\b", t)
    if severity_match:
        target_severity = severity_match.group(2).capitalize()
        filtered = [
            f"- {v['name']} ({v['severity']})"
            for v in VULNERABILITIES.values()
            if v["severity"].lower() == target_severity.lower()
        ]
        if filtered:
            return _meta_response(
                f"{target_severity} severity vulnerabilities:\n" + "\n".join(filtered),
                f"meta:list:{target_severity.lower()}",
            )

    # List all vulnerabilities
    if re.search(
        r"\b(list|show all)\b"
        r"|\b(all|every)\s+vulner"
        r"|\b(what|which)\s+(all\s+(the\s+)?)?vulner"
        r"|\bwhat\s+are\s+(the\s+)?vulner"
        r"|\bwhat\s+are\s+your\s+vulner"
        r"|\bwhat\s+(types?\s+of\s+)?vulner"
        r"|\bwhat\s+vulns?\b"
        r"|\bhow\s+many\s+vulner"
        r"|\byour\s+vulner"
        r"|\bdo\s+you\s+(have|know).*vulner"
        r"|\bwhat\s+do\s+you\s+(know|support)([!?,.\s]*$|.*vulner)"
        r"|\bwhat\s+can\s+you\s+(detect|scan)([!?,.\s]*$|.*vulner)"
        r"|\bshow\s+me\s+vulner"
        r"|\btell\s+me\s+(all\s+)?vulner",
        t,
    ) or re.match(r"^vulnerabilit", t):
        # Each line carries its own (Severity) tag so a finding line is
        # self-contained when copy-pasted. Blank line between tiers keeps the
        # eye anchored without needing big bold headers.
        tier_order = ["Critical", "High", "Medium", "Low"]
        grouped = {tier: [] for tier in tier_order}
        for v in VULNERABILITIES.values():
            tier = v.get("severity", "Low")
            if tier not in grouped:
                grouped[tier] = []
            grouped[tier].append(f"- {v['name']} ({tier})")

        blocks = []
        for tier in tier_order:
            if grouped[tier]:
                blocks.append("\n".join(grouped[tier]))
        vuln_list = "\n\n".join(blocks)

        return _meta_response(
            f"Supported vulnerability types:\n{vuln_list}",
            "meta:list",
        )

    return None
