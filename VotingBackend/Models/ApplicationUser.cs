using Microsoft.AspNetCore.Identity;

namespace VotingBackend.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Name { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ICollection<Vote> Votes { get; set; } = new List<Vote>();
    }
}
