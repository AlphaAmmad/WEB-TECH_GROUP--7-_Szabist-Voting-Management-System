using System.ComponentModel.DataAnnotations;

namespace VotingBackend.DTOs
{
    public class CandidateDto
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Picture { get; set; }

        public bool Disqualified { get; set; }

        public int VoteCount { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class CreateCandidateDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Picture { get; set; }
    }

    public class AdminRegisterUserDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "User";
    }

    public class EditUserDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [StringLength(100, MinimumLength = 6)]
        public string? NewPassword { get; set; }
    }
}
