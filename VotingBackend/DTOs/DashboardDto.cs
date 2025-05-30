namespace VotingBackend.DTOs
{
    public class UserDashboardDto
    {
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }
        public string Role { get; set; } = string.Empty;
        public DateTime JoinDate { get; set; }
        public bool HasVoted { get; set; }
        public VoteResultDto? UserVote { get; set; }
        public List<CandidateDto> Candidates { get; set; } = new();
    }

    public class AdminDashboardDto
    {
        public int TotalUsers { get; set; }
        public int TotalAdmins { get; set; }
        public int TotalVotes { get; set; }
        public int TotalCandidates { get; set; }
        public int ActiveCandidates { get; set; }
        public List<CandidateDto> Candidates { get; set; } = new();
        public List<VoteStatsDto> VoteStats { get; set; } = new();
    }

    public class VoteStatsDto
    {
        public string CandidateName { get; set; } = string.Empty;
        public int VoteCount { get; set; }
        public double Percentage { get; set; }
    }
}
