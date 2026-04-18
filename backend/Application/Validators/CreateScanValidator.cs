using FluentValidation;
using Application.DTOs.Scans;

namespace Application.Validators;

public class CreateScanValidator : AbstractValidator<CreateScanDto>
{
    public CreateScanValidator()
    {
        RuleFor(x => x.TargetURL)
            .NotEmpty().WithMessage("Target URL is required")
            .Must(BeAValidUrl).WithMessage("Invalid URL format");
    }

    private bool BeAValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
            && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
    }
}
