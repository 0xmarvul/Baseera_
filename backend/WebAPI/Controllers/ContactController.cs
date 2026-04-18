using Microsoft.AspNetCore.Mvc;
using Application.DTOs.Common;
using Application.DTOs.Contact;
using Core.Interfaces;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IEmailSender _emailSender;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IEmailSender emailSender, ILogger<ContactController> logger)
    {
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<ResponseDto<string>>> SendMessage([FromBody] ContactMessageDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Subject) ||
            string.IsNullOrWhiteSpace(dto.Message))
        {
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = "All fields are required.",
                Data = null
            });
        }

        if (!dto.Email.Contains('@'))
        {
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = "Invalid email address.",
                Data = null
            });
        }

        try
        {
            var htmlBody = $@"
<h2>New Contact Message – Bassera</h2>
<table>
  <tr><td><strong>Name:</strong></td><td>{System.Net.WebUtility.HtmlEncode(dto.FullName)}</td></tr>
  <tr><td><strong>Email:</strong></td><td>{System.Net.WebUtility.HtmlEncode(dto.Email)}</td></tr>
  <tr><td><strong>Subject:</strong></td><td>{System.Net.WebUtility.HtmlEncode(dto.Subject)}</td></tr>
</table>
<hr/>
<p><strong>Message:</strong></p>
<p>{System.Net.WebUtility.HtmlEncode(dto.Message).Replace("\n", "<br/>")}</p>";

            await _emailSender.SendAsync("0xbaseera@gmail.com", $"[Contact] {dto.Subject}", htmlBody, ct);

            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "Your message has been sent successfully.",
                Data = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send contact message from {Email}", dto.Email);
            return StatusCode(500, new ResponseDto<string>
            {
                Success = false,
                Message = "Failed to send message. Please try again later.",
                Data = null
            });
        }
    }
}
