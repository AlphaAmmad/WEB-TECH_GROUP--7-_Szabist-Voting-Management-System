using System.ComponentModel.DataAnnotations;

namespace VotingBackend.DTOs
{
    public class VoteDto
    {
        [Required]
        public int CandidateId { get; set; }
    }
    
    public class VoteResultDto
    {
        public int Id { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
