using System.ComponentModel.DataAnnotations;

namespace VotingBackend.Models
{
    public class Candidate
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        public string? Picture { get; set; }
        
        public bool Disqualified { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ICollection<Vote> Votes { get; set; } = new List<Vote>();
    }
}
