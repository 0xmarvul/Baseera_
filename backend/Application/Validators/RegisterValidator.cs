using FluentValidation;
using Application.DTOs.Auth;

namespace Application.Validators;

public class RegisterValidator : AbstractValidator<RegisterDto>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .Must(PasswordPolicy.IsValid).WithMessage(PasswordPolicy.ErrorMessage);

        // Country is collected via a frontend dropdown (ISO 3166-1 list).
        // Defense-in-depth: enforce server-side so a direct API call
        // can't bypass the picker and submit a blank/junk value.
        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required");
    }
}
