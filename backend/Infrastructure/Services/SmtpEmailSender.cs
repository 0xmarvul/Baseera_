using System.Net;
using System.Net.Mail;
using Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services;

public class SmtpEmailSender : IEmailSender
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _user;
    private readonly string _appPassword;
    private readonly string _from;

    public SmtpEmailSender(IConfiguration configuration)
    {
        _host = configuration["Smtp:Host"] ?? "smtp.gmail.com";
        _port = int.TryParse(configuration["Smtp:Port"], out var port) ? port : 587;
        _user = configuration["Smtp:User"] ?? string.Empty;
        _appPassword = configuration["Smtp:AppPassword"] ?? string.Empty;
        _from = configuration["Smtp:From"] ?? _user;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        using var client = new SmtpClient(_host, _port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_user, _appPassword)
        };

        using var message = new MailMessage(_from, toEmail, subject, htmlBody)
        {
            IsBodyHtml = true
        };

        await client.SendMailAsync(message, ct);
    }
}
