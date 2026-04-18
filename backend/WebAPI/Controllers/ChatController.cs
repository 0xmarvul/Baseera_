using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs.Common;
using System.Text;
using System.Text.Json;
using System.Linq;
using System.Collections.Concurrent;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ChatController> _logger;
    private readonly string _aiServiceUrl;

    // Tracks the last "Did you mean X?" suggestion per conversation so a follow-up
    // "yes" (or any affirmative) can be resolved into the vulnerability explanation.
    // Why a dict keyed by conversationId: the floating widget sends "yes" raw (no
    // frontend rewrite), and even the main chat can miss an affirmative that the
    // client-side regex doesn't cover. Server-side state keeps both clients honest.
    private static readonly ConcurrentDictionary<string, string> _pendingSuggestions = new();

    public ChatController(IHttpClientFactory httpClientFactory, ILogger<ChatController> logger, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _aiServiceUrl = configuration.GetValue<string>("AIChatServiceUrl") ?? "http://localhost:5001";
    }

    /// <summary>
    /// Send a chat message to the Baseera AI assistant.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ResponseDto<object>>> Chat([FromBody] ChatRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new ResponseDto<object>
            {
                Success = false,
                Message = "Message cannot be empty.",
                Data = null
            });
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            var payload = JsonSerializer.Serialize(new { message = request.Message });
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await client.PostAsync($"{_aiServiceUrl}/analyze", content);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<object>(json);

            return Ok(new ResponseDto<object>
            {
                Success = true,
                Message = "Analysis complete.",
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI service unavailable, falling back to keyword detection.");
            var fallback = KeywordFallback(request.Message, request.ConversationId);
            return Ok(new ResponseDto<object>
            {
                Success = true,
                Message = "Analysis complete (fallback mode).",
                Data = fallback
            });
        }
    }

    private static object KeywordFallback(string message, string? conversationId = null)
    {
        var lower = message.ToLowerInvariant().Trim();
        // Normalized form: strip trailing punctuation so "hi?" or "hi!!!" still matches "hi"
        var normalized = System.Text.RegularExpressions.Regex.Replace(lower, @"[\s!?.,;:~\-]+$", "");

        // Consume any pending "Did you mean X?" suggestion up-front. It's a one-shot
        // that lives only until the user's next message — used below if the message
        // is affirmative, otherwise simply discarded so stale suggestions don't leak
        // into unrelated follow-ups.
        string? pendingSuggestion = null;
        if (!string.IsNullOrEmpty(conversationId))
        {
            _pendingSuggestions.TryRemove(conversationId, out pendingSuggestion);
        }

        // ── Conversational patterns (checked before keyword matching) ──────────
        var greetingPattern = new[] {
            "hi", "hii", "hiii", "hiiii", "hey", "heyy", "heyyy", "hello", "helloo", "hellooo",
            "hola", "heya", "heyo", "yo", "yoyo", "sup", "wassup", "wazzup", "whats up", "what's up",
            "whatsup", "howdy", "greetings", "good morning", "good afternoon", "good evening",
            "good night", "gm", "gn", "morning", "afternoon", "evening",
            "salam", "salaam", "assalamualaikum", "peace",
            "hi there", "hello there", "hey there", "hi bot", "hello bot", "hey bot",
            "hi baseera", "hello baseera", "hey baseera"
        };
        if (Array.Exists(greetingPattern, g => normalized == g) ||
            System.Text.RegularExpressions.Regex.IsMatch(lower,
                @"^(hi+|hey+|hello+|hola|yo+|sup|wassup|whazzup|howdy|greetings|heya|heyo|salam|salaam|peace|gm|gn)"
                + @"([\s,!?.]+(there|bot|baseera|baseera ai|buddy|friend|mate|bro|sis))?"
                + @"[!?.,~\s]*$"))
        {
            return ConversationalResponse(
                "Hello! 👋 I'm Baseera Assistant, your AI-powered security advisor. " +
                "Ask me about any web vulnerability — e.g., 'What is XSS?' or 'How do I fix SQL Injection?'",
                "meta:greeting");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(how are you|how are u|how r u|how are ya|how are things|how are you doing|how'?s it going|how'?s everything|how'?s life|how do you do|how you doing|how ya doing|are you okay|are you ok|you good|u good|everything good|you doing well|how have you been|how been|how'?s your day|hru)\b"))
        {
            return ConversationalResponse(
                "I'm doing great, thanks for asking! 😊 I'm always ready to help you with cybersecurity questions. " +
                "What would you like to know about?",
                "meta:how_are_you");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(nice to meet you|pleased to meet you|good to meet you|glad to meet you|nice meeting you)\b"))
        {
            return ConversationalResponse(
                "Nice to meet you too! 😊 I'm Baseera, here to help with your cybersecurity questions. " +
                "What would you like to explore?",
                "meta:nice_to_meet");
        }

        // What is Baseera? / Tell me about Baseera
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what is baseera|tell me about baseera|who is baseera|about baseera|explain baseera|describe baseera|baseera platform|what does baseera do|what(')?s baseera)\b"))
        {
            return ConversationalResponse(
                "Baseera is a cybersecurity platform with a browser extension that helps detect vulnerabilities and security risks in websites. " +
                "It analyzes web applications, highlights potential issues, and provides clear explanations and remediation guidance to improve overall security.",
                "meta:about_baseera");
        }

        // Who is Baseera AI? / What is Baseera AI?
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(baseera ai|baseera assistant|who are you|what are you|your name|introduce yourself|what is your name|what(')?s your name|tell me about yourself|what do you do|what you do|what about you)\b"))
        {
            return ConversationalResponse(
                "Baseera AI is an intelligent cybersecurity assistant that explains web application vulnerabilities, evaluates their severity, " +
                "and provides structured recommendations for mitigation and secure implementation.",
                "meta:identity");
        }

        // ── Core concept: "What is cybersecurity?" ──────────────────────────────
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+cyber[\s\-]?security|what'?s\s+cyber[\s\-]?security|"
            + @"define\s+cyber[\s\-]?security|explain\s+cyber[\s\-]?security|"
            + @"meaning\s+of\s+cyber[\s\-]?security|tell\s+me\s+about\s+cyber[\s\-]?security|"
            + @"cyber[\s\-]?security\s+meaning|cyber[\s\-]?security\s+definition|"
            + @"what\s+does\s+cyber[\s\-]?security\s+mean|"
            + @"what\s+is\s+(info(rmation)?\s+security|infosec)|"
            + @"what\s+is\s+(application|app|web|network|it)\s+security)\b")
            || lower == "cybersecurity" || lower == "cyber security"
            || lower == "what is cyber" || normalized == "what is cyber")
        {
            return ConversationalResponse(
                "**Cybersecurity** is the practice of protecting systems, networks, applications, and data " +
                "from digital attacks, unauthorized access, damage, or theft. 🛡️\n\n" +
                "It covers several important areas:\n" +
                "• **Application Security** — protecting software and web apps from flaws like SQL Injection, XSS, and CSRF.\n" +
                "• **Network Security** — defending the infrastructure that moves data (firewalls, VPNs, intrusion detection).\n" +
                "• **Information Security** — keeping data confidential, available, and unaltered (the CIA triad).\n" +
                "• **Operational Security** — processes and decisions for handling and protecting data assets.\n" +
                "• **End-User Education** — training people to avoid phishing and social-engineering attacks.\n\n" +
                "Baseera focuses on **web application security** — scanning websites for vulnerabilities and explaining how to fix them. " +
                "Ask me 'What is XSS?' or 'List all vulnerabilities' to get started!",
                "meta:what_is_cybersecurity");
        }

        // What is a vulnerability?
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?vulnerability|what'?s\s+(a\s+)?vulnerability|"
            + @"define\s+vulnerability|meaning\s+of\s+vulnerability|vulnerability\s+definition|"
            + @"vulnerability\s+meaning|what\s+does\s+vulnerability\s+mean|what\s+is\s+vuln|"
            + @"what\s+are\s+vulnerabilities|what\s+does\s+vuln\s+mean)\b"))
        {
            return ConversationalResponse(
                "A **vulnerability** is a weakness or flaw in a system, application, or network that an attacker can exploit " +
                "to gain unauthorized access, steal data, or cause damage. 🔓\n\n" +
                "Vulnerabilities usually come from:\n" +
                "• Insecure coding (e.g., SQL Injection, XSS)\n" +
                "• Misconfiguration (e.g., missing security headers, exposed files)\n" +
                "• Outdated software with known CVEs\n" +
                "• Weak authentication or session management\n\n" +
                "Ask me 'List all vulnerabilities' to see what I can help you with!",
                "meta:what_is_vulnerability");
        }

        // Exploit / zero-day / CVE / OWASP / CIA triad
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(an\s+)?exploit|define\s+exploit|exploit\s+meaning|what\s+does\s+exploit\s+mean)\b"))
        {
            return ConversationalResponse(
                "An **exploit** is a piece of code, a technique, or a sequence of steps that takes advantage of a vulnerability " +
                "to perform malicious actions — such as stealing data, crashing a system, or getting unauthorized access. 💥\n\n" +
                "Think of a vulnerability as the unlocked window, and the exploit as the thief climbing through it.",
                "meta:what_is_exploit");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?zero[\s\-]?day|zero\s*day\s+(meaning|definition|explain)|0[\s\-]?day|define\s+zero\s*day)\b"))
        {
            return ConversationalResponse(
                "A **zero-day** (0-day) is a vulnerability that is unknown to the software vendor or has no patch available yet. ⏰\n\n" +
                "Attackers who discover zero-days can exploit them before defenders get a chance to fix them, which makes these " +
                "bugs extremely valuable and dangerous. The name comes from 'day zero' — the vendor has had zero days to respond.",
                "meta:what_is_zero_day");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?cve|define\s+cve|cve\s+(meaning|definition|explain)|what\s+does\s+cve\s+stand\s+for|what\s+does\s+cve\s+mean)\b"))
        {
            return ConversationalResponse(
                "**CVE** stands for **Common Vulnerabilities and Exposures** — a public catalog of known security flaws, " +
                "each assigned a unique ID like `CVE-2024-12345`. 📋\n\n" +
                "CVEs make it easy to reference and track vulnerabilities across vendors, tools, and research reports. " +
                "You can look them up at https://cve.mitre.org.",
                "meta:what_is_cve");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+owasp|owasp\s+(meaning|top\s*10|definition)|explain\s+owasp|define\s+owasp|owasp\s+top\s*10)\b"))
        {
            return ConversationalResponse(
                "**OWASP** (Open Worldwide Application Security Project) is a non-profit foundation that publishes free resources " +
                "on web application security. 🌐\n\n" +
                "The **OWASP Top 10** is the most widely known list — it ranks the most critical web application security risks, " +
                "such as Injection, Broken Access Control, and Cryptographic Failures. It's essentially the starting point for " +
                "anyone doing web security.",
                "meta:what_is_owasp");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(cia\s+triad|what\s+is\s+cia|cia\s+(in\s+)?security|confidentiality\s+integrity\s+availability)\b"))
        {
            return ConversationalResponse(
                "The **CIA Triad** is the foundation of information security:\n\n" +
                "• **Confidentiality** — only authorized people can see the data\n" +
                "• **Integrity** — data is accurate and hasn't been tampered with\n" +
                "• **Availability** — systems and data are accessible when needed\n\n" +
                "Most vulnerabilities break at least one of these three. 🛡️",
                "meta:cia_triad");
        }

        // Phishing / malware / ransomware / DDoS / brute force / MITM / social engineering
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+phishing|define\s+phishing|phishing\s+(meaning|definition|explain|attack)|explain\s+phishing|phishing\s+examples?)\b"))
        {
            return ConversationalResponse(
                "**Phishing** is a social-engineering attack where attackers impersonate a trusted entity (bank, boss, service) " +
                "to trick victims into revealing credentials, clicking malicious links, or installing malware. 🎣\n\n" +
                "Defenses: user training, email filtering, MFA, and verifying URLs before entering credentials.",
                "meta:what_is_phishing");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+malware|define\s+malware|malware\s+(meaning|definition|explain|types?)|explain\s+malware)\b"))
        {
            return ConversationalResponse(
                "**Malware** (malicious software) is any program designed to harm, exploit, or gain unauthorized access to a system. 🦠\n\n" +
                "Common types: **viruses**, **worms**, **trojans**, **ransomware**, **spyware**, **adware**, **rootkits**, and **keyloggers**.\n\n" +
                "Defenses: antivirus, endpoint protection, patching, least privilege, and avoiding untrusted downloads.",
                "meta:what_is_malware");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+ransomware|define\s+ransomware|ransomware\s+(meaning|definition|explain|attack))\b"))
        {
            return ConversationalResponse(
                "**Ransomware** is malware that encrypts a victim's files and demands payment (usually in cryptocurrency) to decrypt them. 💰🔒\n\n" +
                "Defenses: offline backups, patch management, email filtering, endpoint detection, and **never pay** when avoidable — " +
                "payment funds more attacks and doesn't guarantee recovery.",
                "meta:what_is_ransomware");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?ddos|what\s+is\s+dos\s+attack|define\s+ddos|ddos\s+(meaning|definition|explain|attack)|denial\s+of\s+service)\b"))
        {
            return ConversationalResponse(
                "A **DDoS** (Distributed Denial of Service) attack floods a server with traffic from many machines to make it unavailable to legitimate users. 🌊\n\n" +
                "Defenses: rate limiting, WAFs, CDN/DDoS-protection services (Cloudflare, Akamai), and auto-scaling infrastructure.",
                "meta:what_is_ddos");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+brute[\s\-]?force|brute[\s\-]?force\s+(attack|meaning|definition|explain)|define\s+brute\s*force)\b"))
        {
            return ConversationalResponse(
                "A **brute-force attack** tries every possible combination of passwords or keys until it finds the right one. 🔨\n\n" +
                "Defenses: strong passwords, account lockout after failed attempts, CAPTCHAs, rate limiting, and multi-factor authentication.",
                "meta:what_is_brute_force");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?man[\s\-]?in[\s\-]?the[\s\-]?middle|mitm\s+(attack|meaning|explain)|what\s+is\s+mitm|define\s+mitm|man\s+in\s+the\s+middle)\b"))
        {
            return ConversationalResponse(
                "A **Man-in-the-Middle (MITM)** attack is when an attacker secretly intercepts and possibly alters communication between two parties. 🕵️\n\n" +
                "Common on unsecured Wi-Fi. Defenses: HTTPS/TLS everywhere, HSTS, certificate pinning, and avoiding public Wi-Fi for sensitive work.",
                "meta:what_is_mitm");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+social\s+engineering|social\s+engineering\s+(meaning|definition|explain|attack))\b"))
        {
            return ConversationalResponse(
                "**Social engineering** manipulates people into breaking security procedures — e.g., impersonating IT support to get a password. 🧠\n\n" +
                "It targets humans, not technology. Defenses: awareness training, strong verification procedures, and a culture where employees feel safe saying 'no' or 'let me verify first'.",
                "meta:what_is_social_engineering");
        }

        // Encryption / hashing / HTTPS / TLS / firewall / VPN / WAF / MFA
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+encryption|define\s+encryption|encryption\s+(meaning|definition|explain)|how\s+does\s+encryption\s+work)\b"))
        {
            return ConversationalResponse(
                "**Encryption** converts readable data (plaintext) into scrambled data (ciphertext) using an algorithm and a key, " +
                "so only someone with the right key can read it. 🔐\n\n" +
                "Two main types:\n" +
                "• **Symmetric** (same key for encrypt & decrypt) — e.g., AES.\n" +
                "• **Asymmetric** (public/private key pair) — e.g., RSA, ECC.\n\n" +
                "Used everywhere: HTTPS, messaging apps, disk encryption, and password storage (well, hashing for passwords).",
                "meta:what_is_encryption");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+hashing|define\s+hashing|hashing\s+(meaning|definition|explain)|what\s+is\s+(a\s+)?hash(\s+function)?|difference\s+between\s+encryption\s+and\s+hashing)\b"))
        {
            return ConversationalResponse(
                "**Hashing** is a one-way function that turns input data into a fixed-size fingerprint. Unlike encryption, it **cannot be reversed**. 🔢\n\n" +
                "Used for: storing passwords (use **bcrypt**, **scrypt**, or **Argon2** — never MD5/SHA1!), verifying file integrity, and digital signatures.",
                "meta:what_is_hashing");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+https|https\s+(meaning|definition|explain)|difference\s+between\s+http\s+and\s+https)\b"))
        {
            return ConversationalResponse(
                "**HTTPS** is HTTP with **TLS encryption**. It protects data in transit between the browser and the server " +
                "from eavesdropping and tampering. 🔒\n\n" +
                "Always use HTTPS — modern browsers penalize HTTP sites, and tools like Let's Encrypt make certificates free.",
                "meta:what_is_https");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+tls|what\s+is\s+ssl|tls\s+(meaning|definition|explain)|ssl\s+(meaning|definition|explain)|difference\s+between\s+tls\s+and\s+ssl)\b"))
        {
            return ConversationalResponse(
                "**TLS** (Transport Layer Security) is the successor to **SSL** (Secure Sockets Layer). They both encrypt network " +
                "communication, but SSL is deprecated — **use TLS 1.2 or 1.3**. 🔐\n\n" +
                "TLS powers HTTPS, secure email (SMTPS, IMAPS), VPNs, and more.",
                "meta:what_is_tls");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?firewall|firewall\s+(meaning|definition|explain))\b"))
        {
            return ConversationalResponse(
                "A **firewall** is a security device (hardware or software) that filters network traffic based on rules — " +
                "allowing trusted traffic and blocking the rest. 🧱\n\n" +
                "Types include: network firewalls, host firewalls, and **Web Application Firewalls (WAF)** that inspect HTTP traffic for attack patterns like SQLi and XSS.",
                "meta:what_is_firewall");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?vpn|vpn\s+(meaning|definition|explain))\b"))
        {
            return ConversationalResponse(
                "A **VPN** (Virtual Private Network) creates an encrypted tunnel between your device and a remote server, " +
                "hiding your real IP and protecting traffic from local eavesdroppers. 🌐🔒\n\n" +
                "Great for: untrusted Wi-Fi, remote work, and privacy. Not a silver bullet — the VPN provider itself can see your traffic, so pick a trustworthy one.",
                "meta:what_is_vpn");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?waf|waf\s+(meaning|definition|explain)|web\s+application\s+firewall)\b"))
        {
            return ConversationalResponse(
                "A **WAF** (Web Application Firewall) sits in front of a web app and inspects HTTP requests, blocking common attacks " +
                "like SQLi, XSS, and path traversal. 🛡️\n\n" +
                "Popular options: Cloudflare WAF, AWS WAF, ModSecurity. A WAF is defense-in-depth — not a replacement for secure code.",
                "meta:what_is_waf");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+mfa|what\s+is\s+2fa|mfa\s+(meaning|definition|explain)|2fa\s+(meaning|definition|explain)|multi[\s\-]factor|two[\s\-]factor)\b"))
        {
            return ConversationalResponse(
                "**MFA** (Multi-Factor Authentication) — and its subset **2FA** — require more than just a password to log in. 🔑📱\n\n" +
                "Factors come in three flavors:\n" +
                "• Something you **know** (password, PIN)\n" +
                "• Something you **have** (phone, hardware key)\n" +
                "• Something you **are** (fingerprint, face)\n\n" +
                "Prefer TOTP apps or hardware keys over SMS — SMS can be intercepted via SIM swapping.",
                "meta:what_is_mfa");
        }

        // Pentesting / ethical hacking / bug bounty / red vs blue
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?pen(etration)?\s*test(ing)?|pen\s*test(ing)?\s+(meaning|definition|explain)|define\s+pen\s*test|what\s+is\s+pentesting)\b"))
        {
            return ConversationalResponse(
                "**Penetration testing** (pentesting) is authorized simulated hacking of a system to find vulnerabilities before real attackers do. 🕵️‍♀️\n\n" +
                "Typical phases: **reconnaissance → scanning → exploitation → post-exploitation → reporting**. The output is a report with findings and remediation guidance.",
                "meta:what_is_pentest");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+ethical\s+hacking|ethical\s+hacker|white\s+hat|what\s+is\s+(a\s+)?hacker)\b"))
        {
            return ConversationalResponse(
                "**Ethical hacking** means using offensive security skills legally and with permission to strengthen defenses. 🤍🎩\n\n" +
                "Types of hackers:\n" +
                "• **White hat** — ethical, authorized\n" +
                "• **Black hat** — malicious, illegal\n" +
                "• **Gray hat** — somewhere in between (often unauthorized but not malicious)",
                "meta:ethical_hacking");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+(a\s+)?bug\s+bounty|bug\s+bounty\s+(program|meaning|definition|explain))\b"))
        {
            return ConversationalResponse(
                "A **bug bounty program** pays security researchers for responsibly reporting vulnerabilities in a company's products. 🐛💵\n\n" +
                "Big programs: HackerOne, Bugcrowd, Google, Microsoft, Meta. Great way to learn and earn if you have offensive-security skills.",
                "meta:bug_bounty");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(red\s+team|blue\s+team|purple\s+team|red\s+vs\s+blue)\b"))
        {
            return ConversationalResponse(
                "In security operations:\n\n" +
                "• **Red Team** — simulates attackers; tries to break in.\n" +
                "• **Blue Team** — defenders; monitors, detects, and responds.\n" +
                "• **Purple Team** — a collaboration between the two to improve defenses using red-team findings. 🟣",
                "meta:red_blue_team");
        }

        // Least privilege / zero trust / RBAC
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+least\s+privilege|principle\s+of\s+least\s+privilege|polp)\b"))
        {
            return ConversationalResponse(
                "**Principle of Least Privilege (PoLP)** — every user, process, or system should have only the minimum permissions needed to do its job. 🔑\n\n" +
                "Limits blast radius when something is compromised. A web app shouldn't run as root; a DB user shouldn't have DROP permission on production.",
                "meta:least_privilege");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+zero\s+trust|zero[\s\-]trust\s+(meaning|definition|explain|architecture))\b"))
        {
            return ConversationalResponse(
                "**Zero Trust** is a security model that assumes no user or device should be trusted by default — " +
                "every request is verified regardless of where it comes from. 🚫🤝\n\n" +
                "Motto: *'never trust, always verify'*. Relies heavily on identity, device posture, and continuous authentication.",
                "meta:zero_trust");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+is\s+rbac|role[\s\-]based\s+access\s+control)\b"))
        {
            return ConversationalResponse(
                "**RBAC** (Role-Based Access Control) grants permissions based on the user's role (admin, editor, viewer) rather than per-user. 👥\n\n" +
                "Simpler to manage at scale. Compare with **ABAC** (Attribute-Based) which uses attributes like department, time, or device for finer-grained control.",
                "meta:rbac");
        }

        // How-to guidance
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(how\s+(do\s+i|can\s+i|to)\s+(secure|protect|harden)\s+(my\s+)?(website|site|web\s+app|application|web\s+application))\b"))
        {
            return ConversationalResponse(
                "To secure a web application, cover these essentials:\n\n" +
                "🔹 **HTTPS everywhere** (HSTS, TLS 1.2/1.3)\n" +
                "🔹 **Input validation & output encoding** (prevent XSS, SQLi)\n" +
                "🔹 **Parameterized queries** for all DB access\n" +
                "🔹 **Strong authentication** — hash passwords with bcrypt/Argon2, add MFA\n" +
                "🔹 **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy\n" +
                "🔹 **Secure cookies** — HttpOnly, Secure, SameSite=Strict\n" +
                "🔹 **CSRF tokens** on state-changing requests\n" +
                "🔹 **Keep dependencies patched** (use `npm audit`, `pip-audit`, Snyk, Dependabot)\n" +
                "🔹 **Log & monitor** (no secrets in logs)\n" +
                "🔹 **Regular pen tests & scans** — run Baseera on every deploy!\n\n" +
                "Want details on any of these? Ask me 'What is CSP?' or 'How to fix SQL Injection?'",
                "meta:how_to_secure_site");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(how\s+(do\s+i|can\s+i|to)\s+(create|make|choose)\s+(a\s+)?strong\s+password|strong\s+password\s+tips)\b"))
        {
            return ConversationalResponse(
                "A strong password is:\n\n" +
                "• **Long** — 14+ characters is the sweet spot\n" +
                "• **Unique** — never reused across sites\n" +
                "• **Random** — generated by a password manager (1Password, Bitwarden, KeePass)\n" +
                "• **Protected by MFA** whenever possible\n\n" +
                "Better than complexity rules is **length**. A passphrase of 5 random words beats `P@ssw0rd!` any day. 🔑",
                "meta:strong_password");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(how\s+(do\s+i|can\s+i|to)\s+(avoid|prevent|stop|not\s+get)\s+(hacked|phishing|phished))\b"))
        {
            return ConversationalResponse(
                "Practical defenses against phishing and account takeover:\n\n" +
                "• Use **MFA** everywhere (prefer TOTP/hardware keys over SMS)\n" +
                "• **Verify URLs** before entering credentials — hover links, check the domain\n" +
                "• Never click **unsolicited attachments**; verify sender out-of-band\n" +
                "• Use a **password manager** — it won't autofill on fake domains\n" +
                "• Keep OS and browser **patched**\n" +
                "• Be suspicious of urgency ('act now!') — attackers exploit emotional pressure 🧠",
                "meta:avoid_phishing");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(how\s+do\s+(i|you)\s+(learn|start|get\s+into)\s+(cyber[\s\-]?security|hacking|infosec|penetration\s+testing|pentesting)|how\s+to\s+(learn|start)\s+cyber)\b"))
        {
            return ConversationalResponse(
                "Great question! Some solid starting points:\n\n" +
                "📚 **Free learning platforms**: TryHackMe, HackTheBox, PortSwigger Web Security Academy, OverTheWire\n" +
                "📖 **Read**: OWASP Top 10, OWASP Testing Guide, 'The Web Application Hacker's Handbook'\n" +
                "🧪 **Practice**: CTFs (picoCTF, CTFtime), bug bounty programs on HackerOne/Bugcrowd\n" +
                "🎓 **Certs (later)**: CompTIA Security+, eJPT, OSCP, CEH\n" +
                "🧠 **Build fundamentals first**: networking, Linux, basic scripting (Python/Bash), and how the web works (HTTP, cookies, sessions)\n\n" +
                "Consistency > cramming. Even 30 minutes a day adds up fast.",
                "meta:how_to_learn");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(am\s+i\s+(hacked|compromised)|have\s+i\s+been\s+(hacked|pwned)|was\s+i\s+hacked|did\s+i\s+get\s+hacked)\b"))
        {
            return ConversationalResponse(
                "If you think you might have been compromised:\n\n" +
                "1. **Change passwords** (from a trusted device) — start with email, then everything else\n" +
                "2. **Enable MFA** on every important account\n" +
                "3. **Check sessions** — log out of all devices in account settings\n" +
                "4. **Scan devices** with an up-to-date antivirus/EDR\n" +
                "5. **Check https://haveibeenpwned.com** to see if your email is in known breaches\n" +
                "6. **Review bank/card activity** and freeze credit if needed\n\n" +
                "If it's a business system, isolate it and contact your security team or an incident-response firm. 🚨",
                "meta:am_i_hacked");
        }
        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(is\s+(http|plain\s+http|my\s+website|this\s+site)\s+(safe|secure))\b"))
        {
            return ConversationalResponse(
                "Plain **HTTP** is not safe — data travels in plaintext and can be read or modified by anyone on the network. " +
                "Always use **HTTPS** with TLS 1.2 or 1.3. Modern browsers also warn users on HTTP sites. 🚨",
                "meta:is_http_safe");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(thank you|thanks|thx|thanx|tysm|ty|appreciate it|much appreciated|thanks a lot|thanks a million|thank you so much|many thanks|cheers|kudos|grateful|appreciated|thanks bro|thanks man|thanks mate)\b"))
        {
            return ConversationalResponse(
                "You're welcome! 😊 Feel free to ask me anything else about security vulnerabilities.",
                "meta:thanks");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(bye|byee|byebye|bye\s+bye|goodbye|good\s+bye|see\s+you|see\s+ya|cya|see\s+u|later|till\s+next\s+time|until\s+next\s+time|take\s+care|good\s+night|gnight|nighty|night|peace\s+out|adios|ciao|farewell|catch\s+you\s+later|talk\s+to\s+you\s+later|ttyl|gtg|gotta\s+go|i\s+have\s+to\s+go|i\s+gotta\s+go|im\s+out|i'?m\s+out|heading\s+out)\b"))
        {
            return ConversationalResponse(
                "Goodbye! Stay safe online! 🔒 Come back anytime you need security advice.",
                "meta:goodbye");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"^(ok|okay|okey|k|kk|got\s+it|understood|copy|copy\s+that|roger|roger\s+that|sure|surely|alright|all\s+right|aight|cool|nice|great|awesome|perfect|good|fine|yes|yess|yep|yup|yeah|yea|ya|right|correct|exactly|definitely|absolutely|indeed|for\s+sure|of\s+course|makes\s+sense|sounds\s+good|sound\s+good|will\s+do)[!.,?]?\s*$"))
        {
            if (pendingSuggestion != null)
            {
                return KeywordFallback($"What is {pendingSuggestion}?", conversationId);
            }
            return ConversationalResponse(
                "Great! Let me know if you have any other security questions. I'm here to help! 💪",
                "meta:affirmative");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"^(no|noo|nope|nah|naah|not\s+really|not\s+now|not\s+at\s+the\s+moment|never\s+mind|nvm|forget\s+it|cancel|stop|wait|no\s+thanks|no\s+thank\s+you|i'?m\s+good|im\s+good|i'?m\s+fine|im\s+fine)[!.,?]?\s*$"))
        {
            return ConversationalResponse(
                "No problem! Feel free to ask whenever you're ready. 😊",
                "meta:negative");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(i\s+don'?t\s+understand|i\s+dont\s+understand|i\s+don'?t\s+get\s+(it|that)|confused|i'?m\s+confused|im\s+confused|this\s+is\s+confusing|what\s+do\s+you\s+mean|what\s+did\s+you\s+mean|can\s+you\s+(explain|clarify|rephrase|simplify)|explain\s+(it\s+)?(again|more|better|simpler)|can\s+you\s+say\s+that\s+again|say\s+it\s+again|huh|pardon)\b"))
        {
            return ConversationalResponse(
                "No problem — let me try again. 🙂 Could you tell me which part was unclear, " +
                "or just ask the question in a different way? For example, you can say:\n" +
                "• 'Explain XSS in simple words'\n" +
                "• 'What does that mean?'\n" +
                "• 'Give me an example'",
                "meta:confusion");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(you'?re\s+(great|awesome|amazing|cool|the\s+best|smart|helpful|brilliant|fantastic|incredible|wonderful)|youre\s+great|nice\s+work|good\s+job|great\s+job|well\s+done|amazing|impressive|bravo|kudos|love\s+you|love\s+it|love\s+this|best\s+bot|good\s+bot|smart\s+bot|cool\s+bot)\b"))
        {
            return ConversationalResponse(
                "Thank you, that means a lot! 😊 I'm always here to help you stay secure. " +
                "Is there anything else you'd like to know?",
                "meta:compliment");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(sorry|my\s+bad|my\s+mistake|i\s+apologize|apologies|excuse\s+me)\b"))
        {
            return ConversationalResponse(
                "No worries at all! 😊 Ask me anything whenever you're ready.",
                "meta:apology");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(tell\s+me\s+a\s+joke|make\s+me\s+laugh|say\s+something\s+funny|know\s+any\s+jokes|got\s+any\s+jokes|another\s+joke|one\s+more\s+joke|cyber\s+joke|security\s+joke|hacker\s+joke|funny\s+story)\b")
            || normalized == "funny" || normalized == "joke" || normalized == "jokes")
        {
            return ConversationalResponse(
                "Why did the hacker break up with the internet? Because it had too many open connections! 😄 " +
                "Now, shall we get back to serious security topics?",
                "meta:joke");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(what\s+time\s+is\s+it|what'?s\s+the\s+time|current\s+time|what'?s\s+the\s+weather|how'?s\s+the\s+weather|weather\s+today|what\s+day\s+is\s+(it|today)|what'?s\s+the\s+date|today'?s\s+date|what\s+year|tell\s+me\s+a\s+story|sing\s+(me\s+)?a\s+song|can\s+you\s+(code|write\s+code|do\s+my\s+homework|solve\s+math))\b"))
        {
            return ConversationalResponse(
                "I'm a security assistant, so I focus on cybersecurity topics. 😊 " +
                "But I'm happy to help with anything related to vulnerabilities, web security, or how to protect yourself online!",
                "meta:off_topic");
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(damn|shit|crap|fuck|fck|f\*ck|bitch|bastard|asshole|idiot|dumb|stupid|moron|useless\s+bot|dumb\s+bot|stupid\s+bot|shut\s+up|you\s+suck|hate\s+you|i\s+hate\s+(you|this\s+bot)|trash\s+bot|worst\s+bot)\b"))
        {
            return ConversationalResponse(
                "I'm here to help you with cybersecurity topics! 😊 " +
                "Let's keep it professional — feel free to ask me anything about security.",
                "meta:profanity");
        }

        // ── Vulnerability keyword matching with full explanations ──────────────
        var keywords = new Dictionary<string, (string name, string severity, string explanation, string fix)>
        {
            ["sql injection"] = ("SQL Injection", "Critical",
                "SQL Injection occurs when an attacker inserts or manipulates SQL queries via user-supplied input, allowing them to read, modify, or delete database data.",
                "Use parameterized queries / prepared statements. Apply input validation and least-privilege DB accounts. Use an ORM and avoid dynamic SQL concatenation."),
            ["sqli"] = ("SQL Injection", "Critical",
                "SQL Injection occurs when an attacker inserts or manipulates SQL queries via user-supplied input, allowing them to read, modify, or delete database data.",
                "Use parameterized queries / prepared statements. Apply input validation and least-privilege DB accounts."),
            ["sql attack"] = ("SQL Injection", "Critical",
                "SQL Injection occurs when an attacker inserts or manipulates SQL queries via user-supplied input, allowing them to read, modify, or delete database data.",
                "Use parameterized queries / prepared statements. Apply input validation and least-privilege DB accounts."),
            ["database injection"] = ("SQL Injection", "Critical",
                "SQL Injection occurs when an attacker inserts or manipulates SQL queries via user-supplied input, allowing them to read, modify, or delete database data.",
                "Use parameterized queries / prepared statements. Apply input validation and least-privilege DB accounts."),
            ["xss"] = ("Cross-Site Scripting (XSS)", "High",
                "XSS allows attackers to inject malicious scripts into web pages viewed by other users, enabling session hijacking, credential theft, and defacement.",
                "Encode all output (HTML-encode user-supplied data). Use Content-Security-Policy headers. Validate and sanitize every input on the server side."),
            ["cross-site scripting"] = ("Cross-Site Scripting (XSS)", "High",
                "XSS allows attackers to inject malicious scripts into web pages viewed by other users, enabling session hijacking, credential theft, and defacement.",
                "Encode all output. Use Content-Security-Policy headers. Validate and sanitize every input on the server side."),
            ["cross site scripting"] = ("Cross-Site Scripting (XSS)", "High",
                "XSS allows attackers to inject malicious scripts into web pages viewed by other users, enabling session hijacking, credential theft, and defacement.",
                "Encode all output. Use Content-Security-Policy headers. Validate and sanitize every input on the server side."),
            ["csrf"] = ("Cross-Site Request Forgery (CSRF)", "Medium",
                "CSRF tricks authenticated users into submitting unwanted requests, allowing attackers to perform actions on their behalf.",
                "Use CSRF tokens on all state-changing forms/requests. Validate the Origin/Referer header. Use SameSite=Strict or SameSite=Lax cookie attribute."),
            ["xsrf"] = ("Cross-Site Request Forgery (CSRF)", "Medium",
                "CSRF tricks authenticated users into submitting unwanted requests, allowing attackers to perform actions on their behalf.",
                "Use CSRF tokens on all state-changing forms/requests. Validate the Origin/Referer header. Use SameSite cookie attribute."),
            ["rce"] = ("Remote Code Execution (RCE)", "Critical",
                "RCE lets an attacker execute arbitrary code on the server, potentially leading to full system compromise.",
                "Never pass user input to shell commands. Use safe APIs instead of exec()/system(). Apply strict input validation and sandboxing."),
            ["remote code execution"] = ("Remote Code Execution (RCE)", "Critical",
                "RCE lets an attacker execute arbitrary code on the server, potentially leading to full system compromise.",
                "Never pass user input to shell commands. Use safe APIs instead of exec()/system(). Apply strict input validation and sandboxing."),
            ["command injection"] = ("Remote Code Execution (RCE)", "Critical",
                "Command injection lets an attacker execute arbitrary OS commands on the server.",
                "Never pass user input to shell commands. Use safe APIs. Apply strict input validation and sandboxing."),
            ["command execution"] = ("Remote Code Execution (RCE)", "Critical",
                "Command execution vulnerabilities let an attacker run arbitrary commands on the server.",
                "Never pass user input to shell commands. Use safe APIs. Apply strict input validation and sandboxing."),
            ["shell injection"] = ("Remote Code Execution (RCE)", "Critical",
                "Shell injection lets an attacker inject shell commands via user-supplied input.",
                "Never pass user input to shell commands. Use safe APIs. Apply strict input validation and sandboxing."),
            ["lfi"] = ("Local File Inclusion (LFI)", "High",
                "LFI allows an attacker to include files from the server's filesystem, potentially exposing sensitive data or executing server-side code.",
                "Whitelist allowed file paths/names. Never pass raw user input to file-include functions. Use realpath() and verify paths stay within the intended directory."),
            ["local file inclusion"] = ("Local File Inclusion (LFI)", "High",
                "LFI allows an attacker to include files from the server's filesystem, potentially exposing sensitive data or executing server-side code.",
                "Whitelist allowed file paths/names. Never pass raw user input to file-include functions."),
            ["rfi"] = ("Remote File Inclusion (RFI)", "Critical",
                "RFI enables attackers to include remote files (often containing malicious code) into the application's execution flow.",
                "Disable allow_url_include in PHP. Whitelist all allowed includes. Validate and sanitize file path parameters."),
            ["remote file inclusion"] = ("Remote File Inclusion (RFI)", "Critical",
                "RFI enables attackers to include remote files into the application's execution flow.",
                "Disable allow_url_include in PHP. Whitelist all allowed includes. Validate and sanitize file path parameters."),
            ["ssrf"] = ("Server-Side Request Forgery (SSRF)", "High",
                "SSRF allows attackers to induce the server to make HTTP requests to unintended locations, potentially accessing internal services.",
                "Validate and whitelist allowed URLs/IP ranges. Block requests to internal/metadata IPs. Use a dedicated HTTP client with timeouts."),
            ["server-side request forgery"] = ("Server-Side Request Forgery (SSRF)", "High",
                "SSRF allows attackers to induce the server to make HTTP requests to unintended locations, potentially accessing internal services.",
                "Validate and whitelist allowed URLs/IP ranges. Block requests to internal/metadata IPs."),
            ["server side request forgery"] = ("Server-Side Request Forgery (SSRF)", "High",
                "SSRF allows attackers to induce the server to make HTTP requests to unintended locations, potentially accessing internal services.",
                "Validate and whitelist allowed URLs/IP ranges. Block requests to internal/metadata IPs."),
            ["directory traversal"] = ("Directory Traversal", "High",
                "Directory traversal lets attackers access files and directories outside the intended web root by manipulating file paths.",
                "Sanitize all user-supplied file paths. Use canonical path checks. Restrict the application to a defined base directory."),
            ["path traversal"] = ("Directory Traversal", "High",
                "Path traversal lets attackers access files outside the intended web root by manipulating file paths.",
                "Sanitize all user-supplied file paths. Use canonical path checks. Restrict the application to a defined base directory."),
            ["file traversal"] = ("Directory Traversal", "High",
                "File traversal lets attackers access files outside the intended web root by manipulating file paths.",
                "Sanitize all user-supplied file paths. Use canonical path checks. Restrict the application to a defined base directory."),
            ["folder traversal"] = ("Directory Traversal", "High",
                "Folder traversal lets attackers access directories outside the intended web root.",
                "Sanitize all user-supplied file paths. Use canonical path checks. Restrict the application to a defined base directory."),
            ["open redirect"] = ("Open Redirect", "Medium",
                "Open redirect occurs when an application accepts an untrusted URL as a redirect target, enabling phishing and credential-theft attacks.",
                "Whitelist redirect destinations. Use relative paths or server-side token validation. Warn users when redirecting to external sites."),
            ["url redirect"] = ("Open Redirect", "Medium",
                "Open redirect occurs when an application accepts an untrusted URL as a redirect target, enabling phishing attacks.",
                "Whitelist redirect destinations. Use relative paths or server-side token validation."),
            ["redirect vulnerability"] = ("Open Redirect", "Medium",
                "Open redirect occurs when an application accepts an untrusted URL as a redirect target, enabling phishing attacks.",
                "Whitelist redirect destinations. Use relative paths or server-side token validation."),
            ["open redirection"] = ("Open Redirect", "Medium",
                "Open redirect occurs when an application accepts an untrusted URL as a redirect target, enabling phishing attacks.",
                "Whitelist redirect destinations. Use relative paths or server-side token validation."),
            ["authentication bypass"] = ("Authentication Bypass", "Critical",
                "Authentication bypass lets attackers skip authentication checks, gaining unauthorized access to protected resources.",
                "Enforce server-side authentication on every protected endpoint. Use well-tested auth libraries. Implement MFA and account lockout policies."),
            ["auth bypass"] = ("Authentication Bypass", "Critical",
                "Authentication bypass lets attackers skip authentication checks, gaining unauthorized access to protected resources.",
                "Enforce server-side authentication on every protected endpoint. Use well-tested auth libraries."),
            ["bypass authentication"] = ("Authentication Bypass", "Critical",
                "Authentication bypass lets attackers skip authentication checks, gaining unauthorized access to protected resources.",
                "Enforce server-side authentication on every protected endpoint. Use well-tested auth libraries."),
            ["login bypass"] = ("Authentication Bypass", "Critical",
                "Login bypass lets attackers skip the login process, gaining unauthorized access to protected resources.",
                "Enforce server-side authentication on every protected endpoint. Use well-tested auth libraries."),
            ["broken authentication"] = ("Authentication Bypass", "Critical",
                "Broken authentication lets attackers compromise credentials or sessions to gain unauthorized access.",
                "Enforce server-side authentication on every protected endpoint. Use well-tested auth libraries. Implement MFA."),
            ["broken auth"] = ("Authentication Bypass", "Critical",
                "Broken authentication lets attackers compromise credentials or sessions to gain unauthorized access.",
                "Enforce server-side authentication on every protected endpoint. Use well-tested auth libraries. Implement MFA."),
            ["exposed api key"] = ("Exposed API Keys / Secrets", "Critical",
                "Hard-coded or exposed API keys/secrets allow attackers to access third-party services, databases, or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately. Scan code with tools like truffleHog before committing."),
            ["api key leak"] = ("Exposed API Keys / Secrets", "Critical",
                "Exposed API keys allow attackers to access third-party services or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["api keys"] = ("Exposed API Keys / Secrets", "Critical",
                "Exposed API keys allow attackers to access third-party services or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["api key"] = ("Exposed API Keys / Secrets", "Critical",
                "Exposed API keys allow attackers to access third-party services or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["exposed api"] = ("Exposed API Keys / Secrets", "Critical",
                "Exposed API credentials allow attackers to access third-party services or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["exposed keys"] = ("Exposed API Keys / Secrets", "Critical",
                "Exposed API keys or secrets allow attackers to access third-party services or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["leaked credentials"] = ("Exposed API Keys / Secrets", "Critical",
                "Leaked credentials allow attackers to access systems or services.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["hardcoded credentials"] = ("Exposed API Keys / Secrets", "Critical",
                "Hard-coded credentials in source code allow attackers to access systems or services.",
                "Store secrets in environment variables or a secrets manager. Remove hardcoded credentials immediately."),
            ["hardcoded secrets"] = ("Exposed API Keys / Secrets", "Critical",
                "Hard-coded secrets in source code allow attackers to access systems or services.",
                "Store secrets in environment variables or a secrets manager. Remove hardcoded secrets immediately."),
            ["secret leak"] = ("Exposed API Keys / Secrets", "Critical",
                "Leaked secrets allow attackers to access systems or services.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["token leak"] = ("Exposed API Keys / Secrets", "Critical",
                "Leaked tokens allow attackers to access systems or services.",
                "Store tokens in environment variables or a secrets manager. Rotate any exposed tokens immediately."),
            ["insecure cookie"] = ("Insecure Cookies", "Medium",
                "Cookies without Secure, HttpOnly, or SameSite flags can be stolen via XSS, network sniffing, or CSRF attacks.",
                "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies. Use short expiry times for session cookies."),
            ["insecure cookies"] = ("Insecure Cookies", "Medium",
                "Cookies without Secure, HttpOnly, or SameSite flags can be stolen via XSS, network sniffing, or CSRF attacks.",
                "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies. Use short expiry times for session cookies."),
            ["cookie flags"] = ("Insecure Cookies", "Medium",
                "Missing cookie security flags (Secure, HttpOnly, SameSite) can lead to session theft.",
                "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies."),
            ["cookie vulnerability"] = ("Insecure Cookies", "Medium",
                "Cookie vulnerabilities can allow session theft via XSS or network sniffing.",
                "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies."),
            ["missing security header"] = ("Missing Security Headers", "Medium",
                "Missing HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) leave applications vulnerable to various client-side attacks.",
                "Add Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options, and Referrer-Policy headers to all responses."),
            ["security headers"] = ("Missing Security Headers", "Medium",
                "Missing HTTP security headers leave applications vulnerable to various client-side attacks.",
                "Add Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options, and Referrer-Policy headers to all responses."),
            ["missing headers"] = ("Missing Security Headers", "Medium",
                "Missing HTTP security headers leave applications vulnerable to various client-side attacks.",
                "Add Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options, and Referrer-Policy headers to all responses."),
            ["http headers"] = ("Missing Security Headers", "Medium",
                "Missing HTTP security headers leave applications vulnerable to various client-side attacks.",
                "Add Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options, and Referrer-Policy headers to all responses."),
            ["csp header"] = ("Missing Security Headers", "Medium",
                "A missing or weak Content-Security-Policy header leaves applications vulnerable to XSS and data injection.",
                "Add a strong Content-Security-Policy header to all responses."),
            ["clickjacking"] = ("Clickjacking", "Medium",
                "Clickjacking tricks users into clicking hidden UI elements embedded within iframes, potentially performing unintended actions.",
                "Set X-Frame-Options: DENY or SAMEORIGIN. Use CSP frame-ancestors directive. Implement frame-busting JavaScript as a secondary defence."),
            ["click jacking"] = ("Clickjacking", "Medium",
                "Clickjacking tricks users into clicking hidden UI elements embedded within iframes.",
                "Set X-Frame-Options: DENY or SAMEORIGIN. Use CSP frame-ancestors directive."),
            ["frame attack"] = ("Clickjacking", "Medium",
                "Frame-based attacks trick users into clicking hidden UI elements embedded within iframes.",
                "Set X-Frame-Options: DENY or SAMEORIGIN. Use CSP frame-ancestors directive."),
            ["exposed comments"] = ("Exposed Comments / Sensitive Information in Source", "Low",
                "Developer comments in HTML/JS source code can reveal internal paths, credentials, logic flaws, or TODOs that aid attackers.",
                "Remove sensitive comments before deploying to production. Use automated pre-commit hooks to detect accidental disclosures."),
            ["html comments"] = ("Exposed Comments / Sensitive Information in Source", "Low",
                "HTML comments visible in page source can reveal internal paths, credentials, or logic flaws.",
                "Remove sensitive comments before deploying to production."),
            ["code comments"] = ("Exposed Comments / Sensitive Information in Source", "Low",
                "Comments left in source code can reveal internal paths, credentials, or logic flaws.",
                "Remove sensitive comments before deploying to production."),
            ["developer comments"] = ("Exposed Comments / Sensitive Information in Source", "Low",
                "Developer comments in source code can reveal internal paths, credentials, or logic flaws.",
                "Remove sensitive comments before deploying to production."),
            ["sensitive files"] = ("Sensitive Files Exposure", "High",
                "Sensitive files like .env, .git/config, wp-config.php, and backup files being publicly accessible can expose credentials, API keys, and internal configuration.",
                "Block access to sensitive files via web server configuration. Remove unnecessary files from production. Add sensitive files to .gitignore."),
            ["sensitive data"] = ("Sensitive Files Exposure", "High",
                "Sensitive data or files being publicly accessible can expose credentials, API keys, and internal configuration.",
                "Block access to sensitive files via web server configuration. Remove unnecessary files from production. Add sensitive files to .gitignore."),
            ["exposed files"] = ("Sensitive Files Exposure", "High",
                "Exposed files on the web server can reveal credentials, API keys, and internal configuration.",
                "Block access to sensitive files via web server configuration. Remove unnecessary files from production."),
            ["backup files"] = ("Sensitive Files Exposure", "High",
                "Backup files left accessible on the web server can expose database dumps, credentials, and source code.",
                "Remove backup files from production. Block access via web server configuration."),
            [".env file"] = ("Sensitive Files Exposure", "High",
                "An accessible .env file exposes environment variables including API keys, database passwords, and other secrets.",
                "Block access to .env files via web server configuration. Never commit .env files to version control."),
            ["database dump"] = ("Sensitive Files Exposure", "High",
                "An accessible database dump file exposes all database contents including credentials and sensitive data.",
                "Remove database dumps from web-accessible directories. Store backups in secure, non-public locations."),
            ["file exposure"] = ("Sensitive Files Exposure", "High",
                "Exposed files on the web server can reveal credentials, API keys, and internal configuration.",
                "Block access to sensitive files via web server configuration. Remove unnecessary files from production."),
            ["debug page"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Debug pages left enabled in production can reveal stack traces, environment variables, and sensitive internal information.",
                "Disable debug mode in production. Configure custom error pages. Remove debug endpoints."),
            ["debug pages"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Debug pages left enabled in production can reveal stack traces, environment variables, and sensitive internal information.",
                "Disable debug mode in production. Configure custom error pages. Remove debug endpoints."),
            ["debug mode"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Debug mode enabled in production can reveal stack traces, environment variables, and sensitive internal information.",
                "Disable debug mode in all production environments. Use environment-specific configuration."),
            ["stack trace"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Exposed stack traces reveal internal application paths, library versions, and code structure to attackers.",
                "Disable debug mode in production. Configure custom error pages that don't reveal internal details."),
            ["debug information"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Exposed debug information can reveal stack traces, environment variables, and sensitive internal data.",
                "Disable debug mode in production. Configure custom error pages. Remove debug endpoints."),
            ["development mode"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Development mode enabled in production can expose debug information and sensitive configuration.",
                "Disable development/debug mode in all production environments."),
            ["csp issue"] = ("Content Security Policy (CSP) Issues", "Medium",
                "Missing or misconfigured CSP headers allow XSS attacks, data injection, and unauthorized resource loading.",
                "Implement a strict Content-Security-Policy header. Use nonces or hashes for inline scripts. Avoid 'unsafe-inline' and 'unsafe-eval'."),
            ["csp issues"] = ("Content Security Policy (CSP) Issues", "Medium",
                "Missing or misconfigured CSP headers allow XSS attacks, data injection, and unauthorized resource loading.",
                "Implement a strict Content-Security-Policy header. Use nonces or hashes for inline scripts. Avoid 'unsafe-inline' and 'unsafe-eval'."),
            ["csp misconfiguration"] = ("Content Security Policy (CSP) Issues", "Medium",
                "A misconfigured CSP header can be bypassed, allowing XSS attacks and unauthorized resource loading.",
                "Review and tighten your CSP policy. Use nonces or hashes for inline scripts. Enable CSP reporting."),
            ["csp bypass"] = ("Content Security Policy (CSP) Issues", "Medium",
                "CSP bypass vulnerabilities allow attackers to circumvent Content Security Policy protections.",
                "Review and tighten your CSP policy. Use nonces or hashes for inline scripts. Avoid 'unsafe-inline' and 'unsafe-eval'."),
            ["content security policy issue"] = ("Content Security Policy (CSP) Issues", "Medium",
                "Missing or misconfigured CSP headers allow XSS attacks, data injection, and unauthorized resource loading.",
                "Implement a strict Content-Security-Policy header. Use nonces or hashes for inline scripts. Avoid 'unsafe-inline' and 'unsafe-eval'."),
            ["weak csp"] = ("Content Security Policy (CSP) Issues", "Medium",
                "A weak Content Security Policy can be bypassed, allowing XSS attacks and unauthorized resource loading.",
                "Review and tighten your CSP policy. Use nonces or hashes for inline scripts. Enable CSP reporting."),
            ["csp policy"] = ("Content Security Policy (CSP) Issues", "Medium",
                "Missing or weak CSP policies allow XSS attacks and unauthorized resource loading.",
                "Implement a strict Content-Security-Policy header. Use nonces or hashes for inline scripts."),
            ["injection"] = ("SQL Injection", "Critical",
                "SQL Injection occurs when an attacker inserts or manipulates SQL queries via user-supplied input, allowing them to read, modify, or delete database data.",
                "Use parameterized queries / prepared statements. Apply input validation and least-privilege DB accounts."),
            ["exposed"] = ("Exposed API Keys / Secrets", "Critical",
                "Hard-coded or exposed API keys/secrets allow attackers to access third-party services, databases, or internal systems.",
                "Store secrets in environment variables or a secrets manager. Rotate any exposed credentials immediately."),
            ["sensitive"] = ("Sensitive Files Exposure", "High",
                "Sensitive files like .env, .git/config, and backup files being publicly accessible can expose credentials, API keys, and internal configuration.",
                "Block access to sensitive files via web server configuration. Remove unnecessary files from production."),
            ["cookie"] = ("Insecure Cookies", "Medium",
                "Cookies without Secure, HttpOnly, or SameSite flags can be stolen via XSS, network sniffing, or CSRF attacks.",
                "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies."),
            ["cookies"] = ("Insecure Cookies", "Medium",
                "Cookies without Secure, HttpOnly, or SameSite flags can be stolen via XSS, network sniffing, or CSRF attacks.",
                "Set Secure, HttpOnly, and SameSite=Strict flags on all sensitive cookies."),
            ["redirect"] = ("Open Redirect", "Medium",
                "Open redirect occurs when an application accepts an untrusted URL as a redirect target, enabling phishing and credential-theft attacks.",
                "Whitelist redirect destinations. Use relative paths or server-side token validation."),
            ["traversal"] = ("Directory Traversal", "High",
                "Directory traversal lets attackers access files and directories outside the intended web root by manipulating file paths.",
                "Sanitize all user-supplied file paths. Use canonical path checks. Restrict the application to a defined base directory."),
            ["headers"] = ("Missing Security Headers", "Medium",
                "Missing HTTP security headers leave applications vulnerable to various client-side attacks.",
                "Add Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options, and Referrer-Policy headers to all responses."),
            ["debug"] = ("Debug Pages / Debug Mode Exposure", "Medium",
                "Debug mode or debug pages left enabled in production can reveal stack traces, environment variables, and sensitive internal information.",
                "Disable debug mode in all production environments. Configure custom error pages. Remove debug endpoints."),
        };

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(help|what can you do|capabilities)\b"))
        {
            // Don't show help if message also contains a vulnerability keyword
            bool hasVuln = false;
            foreach (var kv in keywords)
            {
                if (lower.Contains(kv.Key))
                {
                    hasVuln = true;
                    break;
                }
            }
            if (!hasVuln)
            {
                return ConversationalResponse(
                    "I can explain vulnerabilities, assess their severity, and suggest fixes for: " +
                    "SQL Injection, XSS, CSRF, RCE, LFI, RFI, SSRF, Directory Traversal, Open Redirect, " +
                    "Authentication Bypass, Exposed API Keys, Insecure Cookies, Missing Security Headers, " +
                    "Clickjacking, Exposed Comments, Sensitive Files Exposure, Debug Pages / Debug Mode Exposure, " +
                    "and Content Security Policy (CSP) Issues. Just ask 'What is <vuln>?' or 'How to fix <vuln>?'",
                    "meta:help");
            }
        }

        // Show vulnerabilities by severity – supports multiple severities
        var severityMap = new Dictionary<string, string[]>
        {
            ["critical"] = new[] { "SQL Injection", "RCE", "RFI", "Authentication Bypass", "Exposed API Keys" },
            ["high"] = new[] { "XSS", "LFI", "SSRF", "Directory Traversal", "Sensitive Files Exposure" },
            ["medium"] = new[] { "CSRF", "Open Redirect", "Insecure Cookies", "Missing Security Headers", "Clickjacking", "Debug Pages / Debug Mode Exposure", "Content Security Policy (CSP) Issues" },
            ["low"] = new[] { "Exposed Comments" },
        };

        bool asksAboutVulns = System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(show|list|display|get|what\s+are|tell\s+me\s+about|give\s+me)\b.*vulnerabilit") ||
            System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"vulnerabilit.*\b(critical|high|medium|low)\b");

        if (asksAboutVulns)
        {
            var foundSeverities = new List<string>();
            foreach (var sev in new[] { "critical", "high", "medium", "low" })
            {
                if (lower.Contains(sev))
                    foundSeverities.Add(sev);
            }

            if (foundSeverities.Count > 0)
            {
                var parts = new List<string>();
                var labels = new List<string>();
                foreach (var sev in foundSeverities)
                {
                    labels.Add(char.ToUpper(sev[0]) + sev.Substring(1));
                    if (severityMap.ContainsKey(sev))
                    {
                        foreach (var v in severityMap[sev])
                            parts.Add($"- {v}");
                    }
                }
                var labelStr = string.Join(" & ", labels);
                return ConversationalResponse(
                    $"{labelStr} severity vulnerabilities:\n{string.Join("\n", parts)}",
                    $"meta:list:{string.Join("+", foundSeverities)}");
            }
        }

        // Show vulnerabilities by severity (simple pattern)
        var severityMatch = System.Text.RegularExpressions.Regex.Match(lower,
            @"\b(show|list|display|get)\s+(critical|high|medium|low)\b");
        if (severityMatch.Success)
        {
            var targetSeverity = severityMatch.Groups[2].Value;
            if (severityMap.ContainsKey(targetSeverity))
            {
                var list = string.Join("\n", severityMap[targetSeverity].Select(v => $"- {v}"));
                return ConversationalResponse(
                    $"{char.ToUpper(targetSeverity[0]) + targetSeverity.Substring(1)} severity vulnerabilities:\n{list}",
                    $"meta:list:{targetSeverity}");
            }
        }

        if (System.Text.RegularExpressions.Regex.IsMatch(lower,
            @"\b(list|show all)\b"
            + @"|\b(all|every)\s+vulner"
            + @"|\b(what|which)\s+(all\s+(the\s+)?)?vulner"
            + @"|\bwhat\s+are\s+(the\s+)?vulner"
            + @"|\bwhat\s+are\s+your\s+vulner"
            + @"|\bwhat\s+(types?\s+of\s+)?vulner"
            + @"|\bwhat\s+vulns?\b"
            + @"|\bhow\s+many\s+vulner"
            + @"|\byour\s+vulner"
            + @"|\bdo\s+you\s+(have|know).*vulner"
            + @"|\bwhat\s+do\s+you\s+(know|support)([!?,.\s]*$|.*vulner)"
            + @"|\bwhat\s+can\s+you\s+(detect|scan)([!?,.\s]*$|.*vulner)"
            + @"|\bshow\s+me\s+vulner"
            + @"|\btell\s+me\s+(all\s+)?vulner") ||
            lower.StartsWith("vulnerabilit"))
        {
            return ConversationalResponse(
                "Supported vulnerability types:\n" +
                "- SQL Injection (Critical)\n- Cross-Site Scripting/XSS (High)\n" +
                "- CSRF (Medium)\n- Remote Code Execution/RCE (Critical)\n" +
                "- Local File Inclusion/LFI (High)\n- Remote File Inclusion/RFI (Critical)\n" +
                "- SSRF (High)\n- Directory Traversal (High)\n- Open Redirect (Medium)\n" +
                "- Authentication Bypass (Critical)\n- Exposed API Keys (Critical)\n" +
                "- Insecure Cookies (Medium)\n- Missing Security Headers (Medium)\n" +
                "- Clickjacking (Medium)\n- Exposed Comments (Low)\n" +
                "- Sensitive Files Exposure (High)\n- Debug Pages / Debug Mode Exposure (Medium)\n" +
                "- Content Security Policy (CSP) Issues (Medium)",
                "meta:list");
        }

        foreach (var kv in keywords)
        {
            if (lower.Contains(kv.Key))
            {
                return new
                {
                    vulnerability = kv.Value.name,
                    explanation = kv.Value.explanation,
                    severity = kv.Value.severity,
                    fix = kv.Value.fix,
                    report = (string?)null,
                    matched_by = "fallback:keyword"
                };
            }
        }

        // Before the default "I'm not sure" response, check for close matches
        string? bestMatch = null;
        string? bestMatchName = null;
        int bestDistance = int.MaxValue;

        foreach (var kv in keywords)
        {
            int distance = LevenshteinDistance(lower, kv.Key);
            if (distance < bestDistance && distance <= 3)
            {
                bestDistance = distance;
                bestMatch = kv.Key;
                bestMatchName = kv.Value.name;
            }
        }

        if (bestMatchName != null)
        {
            if (!string.IsNullOrEmpty(conversationId))
            {
                _pendingSuggestions[conversationId] = bestMatch!;
            }
            return SuggestionResponse(bestMatchName, bestMatch!);
        }

        return new
        {
            vulnerability = (string?)null,
            explanation = "I'm not sure I understood that. I'm best at helping with cybersecurity topics! 🔒\n\n" +
                          "You can ask me things like:\n" +
                          "• 'What is SQL Injection?'\n" +
                          "• 'How to fix XSS?'\n" +
                          "• 'Tell me about CSRF'\n" +
                          "• 'List all vulnerabilities'\n\n" +
                          "Or just say 'help' to see everything I can do!",
            severity = (string?)null,
            fix = (string?)null,
            report = (string?)null,
            matched_by = (string?)null
        };
    }

    private static object SuggestionResponse(string matchName, string matchKey)
    {
        return new
        {
            vulnerability = (string?)null,
            explanation = $"Hmm, I'm not sure about that. Did you mean **{matchName}**? " +
                "Reply 'Yes' to learn about it, or ask me about a specific vulnerability.\n\n" +
                "You can ask things like:\n" +
                "• 'What is SQL Injection?'\n" +
                "• 'How to fix XSS?'\n" +
                "• 'Tell me about CSRF'",
            severity = (string?)null,
            fix = (string?)null,
            report = (string?)null,
            matched_by = $"suggestion:{matchKey}",
            suggested_vuln = matchKey
        };
    }

    private static object ConversationalResponse(string explanation, string matchedBy)
    {
        return new
        {
            vulnerability = (string?)null,
            explanation,
            severity = (string?)null,
            fix = (string?)null,
            report = (string?)null,
            matched_by = matchedBy
        };
    }

    private static int LevenshteinDistance(string s, string t)
    {
        if (string.IsNullOrEmpty(s)) return t?.Length ?? 0;
        if (string.IsNullOrEmpty(t)) return s.Length;

        var d = new int[s.Length + 1, t.Length + 1];
        for (int i = 0; i <= s.Length; i++) d[i, 0] = i;
        for (int j = 0; j <= t.Length; j++) d[0, j] = j;

        for (int i = 1; i <= s.Length; i++)
        {
            for (int j = 1; j <= t.Length; j++)
            {
                int cost = s[i - 1] == t[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1), d[i - 1, j - 1] + cost);
            }
        }
        return d[s.Length, t.Length];
    }
}

public class ChatRequestDto
{
    public string Message { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
}
