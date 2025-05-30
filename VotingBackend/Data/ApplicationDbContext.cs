using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VotingBackend.Models;

namespace VotingBackend.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Candidate> Candidates { get; set; }
        public DbSet<Vote> Votes { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure Vote entity
            builder.Entity<Vote>(entity =>
            {
                entity.HasKey(v => v.Id);

                entity.HasOne(v => v.User)
                    .WithMany(u => u.Votes)
                    .HasForeignKey(v => v.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(v => v.Candidate)
                    .WithMany(c => c.Votes)
                    .HasForeignKey(v => v.CandidateId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Ensure one vote per user
                entity.HasIndex(v => v.UserId)
                    .IsUnique();
            });

            // Configure Candidate entity
            builder.Entity<Candidate>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            });

            // Configure ApplicationUser
            builder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
            });
        }
    }
}
