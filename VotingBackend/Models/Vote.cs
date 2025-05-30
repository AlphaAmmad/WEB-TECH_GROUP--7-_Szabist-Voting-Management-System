using System.ComponentModel.DataAnnotations;

namespace VotingBackend.Models
{
    public class Vote
    {
        public int Id { get; set; }
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Required]
        public int CandidateId { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ApplicationUser User { get; set; } = null!;
        public virtual Candidate Candidate { get; set; } = null!;
    }
}
