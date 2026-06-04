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
    }
}
