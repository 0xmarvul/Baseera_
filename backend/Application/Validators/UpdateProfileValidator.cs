using FluentValidation;
using Application.DTOs.User;

namespace Application.Validators;

public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
{
    public UpdateProfileValidator()
    {
        // Country is required on signup (see RegisterValidator) and must
        // stay required on edit, otherwise a user could clear it via the
        // profile-edit endpoint and bypass the signup rule. Defense in
        // depth alongside the EditProfile.jsx client-side check.
        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required");

        // Email and Username are optional on the wire (the controller
        // PATCHes only the fields the user touched), so they're validated
        // here only when present. Empty string is rejected; null is OK.
        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Invalid email format")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username cannot be blank")
            .When(x => x.Username != null);
    }
}
