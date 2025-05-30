using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VotingBackend.Data;
using VotingBackend.DTOs;
using VotingBackend.Models;

namespace VotingBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User,Admin")]
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public UserController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<UserDashboardDto>> GetDashboard()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            // Check if user has voted
            var userVote = await _context.Votes
                .Include(v => v.Candidate)
                .FirstOrDefaultAsync(v => v.UserId == userId);

            // Get all active candidates
            var candidates = await _context.Candidates
                .Where(c => !c.Disqualified)
                .Select(c => new CandidateDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Picture = c.Picture,
                    Disqualified = c.Disqualified,
                    VoteCount = c.Votes.Count(),
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            // Get user role
            var userRoles = await _userManager.GetRolesAsync(user);
            var userRole = userRoles.FirstOrDefault() ?? "User";

            var dashboard = new UserDashboardDto
            {
                UserName = user.Name,
                Email = user.Email!,
                ProfilePicture = user.ProfilePicture,
                Role = userRole,
                JoinDate = user.CreatedAt,
                HasVoted = userVote != null,
                UserVote = userVote != null ? new VoteResultDto
                {
                    Id = userVote.Id,
                    CandidateName = userVote.Candidate.Name,
                    Timestamp = userVote.Timestamp,
                    Success = true,
                    Message = "Vote cast successfully"
                } : null,
                Candidates = candidates
            };

            return Ok(dashboard);
        }

        [HttpPost("vote")]
        public async Task<ActionResult<VoteResultDto>> CastVote(VoteDto voteDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Check if user has already voted
            var existingVote = await _context.Votes.FirstOrDefaultAsync(v => v.UserId == userId);
            if (existingVote != null)
            {
                return BadRequest(new VoteResultDto
                {
                    Success = false,
                    Message = "You have already cast your vote"
                });
            }

            // Check if candidate exists and is not disqualified
            var candidate = await _context.Candidates.FindAsync(voteDto.CandidateId);
            if (candidate == null)
            {
                return NotFound(new VoteResultDto
                {
                    Success = false,
                    Message = "Candidate not found"
                });
            }

            if (candidate.Disqualified)
            {
                return BadRequest(new VoteResultDto
                {
                    Success = false,
                    Message = "Cannot vote for a disqualified candidate"
                });
            }

            // Create the vote
            var vote = new Vote
            {
                UserId = userId,
                CandidateId = voteDto.CandidateId,
                Timestamp = DateTime.UtcNow
            };

            _context.Votes.Add(vote);
            await _context.SaveChangesAsync();

            return Ok(new VoteResultDto
            {
                Id = vote.Id,
                CandidateName = candidate.Name,
                Timestamp = vote.Timestamp,
                Success = true,
                Message = "Vote cast successfully"
            });
        }

        [HttpPost("profile-picture")]
        public async Task<ActionResult> UpdateProfilePicture(IFormFile profilePicture)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                if (profilePicture == null || profilePicture.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No file uploaded" });
                }

                // Validate file type
                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(profilePicture.ContentType.ToLower()))
                {
                    return BadRequest(new { success = false, message = "Only image files (JPEG, PNG, GIF) are allowed" });
                }

                // Validate file size (max 5MB)
                if (profilePicture.Length > 5 * 1024 * 1024)
                {
                    return BadRequest(new { success = false, message = "File size must be less than 5MB" });
                }

                // Create uploads directory if it doesn't exist
                var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profiles");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Delete old profile picture if exists
                if (!string.IsNullOrEmpty(user.ProfilePicture))
                {
                    var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.ProfilePicture.TrimStart('/'));
                    if (System.IO.File.Exists(oldFilePath))
                    {
                        try
                        {
                            System.IO.File.Delete(oldFilePath);
                        }
                        catch
                        {
                            // Ignore deletion errors
                        }
                    }
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(profilePicture.FileName);
                var fileName = $"{userId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await profilePicture.CopyToAsync(stream);
                }

                // Update user profile picture URL
                var profilePictureUrl = $"/uploads/profiles/{fileName}";
                user.ProfilePicture = profilePictureUrl;

                var result = await _userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    return StatusCode(500, new { success = false, message = "Failed to update user profile" });
                }

                return Ok(new {
                    success = true,
                    message = "Profile picture updated successfully",
                    profilePicture = profilePictureUrl
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while uploading the profile picture",
                    error = ex.Message
                });
            }
        }

        [HttpPut("update-profile")]
        public async Task<ActionResult> UpdateProfile([FromBody] UpdateProfileDto updateDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new {
                        success = false,
                        message = "Invalid data provided",
                        errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                    });
                }

                // Get current user
                var currentUserId = User.FindFirst("id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                var user = await _userManager.FindByIdAsync(currentUserId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Verify current password
                var passwordCheck = await _userManager.CheckPasswordAsync(user, updateDto.CurrentPassword);
                if (!passwordCheck)
                {
                    return BadRequest(new { success = false, message = "Current password is incorrect" });
                }

                // Check if email is already taken by another user
                if (user.Email != updateDto.Email)
                {
                    var existingUser = await _userManager.FindByEmailAsync(updateDto.Email);
                    if (existingUser != null && existingUser.Id != user.Id)
                    {
                        return BadRequest(new { success = false, message = "Email is already taken by another user" });
                    }
                }

                // Update user information
                user.Name = updateDto.Name.Trim();
                user.Email = updateDto.Email.Trim();
                user.UserName = updateDto.Email.Trim();

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return BadRequest(new {
                        success = false,
                        message = "Failed to update profile",
                        errors = updateResult.Errors.Select(e => e.Description)
                    });
                }

                // Update password if provided
                if (!string.IsNullOrEmpty(updateDto.NewPassword))
                {
                    var passwordResult = await _userManager.ChangePasswordAsync(user, updateDto.CurrentPassword, updateDto.NewPassword);
                    if (!passwordResult.Succeeded)
                    {
                        return BadRequest(new {
                            success = false,
                            message = "Failed to update password",
                            errors = passwordResult.Errors.Select(e => e.Description)
                        });
                    }
                }

                return Ok(new {
                    success = true,
                    message = "Profile updated successfully",
                    user = new {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        ProfilePicture = user.ProfilePicture
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while updating profile",
                    error = ex.Message
                });
            }
        }

        [HttpDelete("delete-account")]
        public async Task<ActionResult> DeleteAccount([FromBody] DeleteAccountDto deleteDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new {
                        success = false,
                        message = "Invalid data provided",
                        errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                    });
                }

                // Get current user
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                var user = await _userManager.FindByIdAsync(currentUserId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Verify password
                var passwordCheck = await _userManager.CheckPasswordAsync(user, deleteDto.Password);
                if (!passwordCheck)
                {
                    return BadRequest(new { success = false, message = "Password is incorrect" });
                }

                // Delete user's votes if any
                var userVotes = await _context.Votes.Where(v => v.UserId == currentUserId).ToListAsync();
                if (userVotes.Any())
                {
                    _context.Votes.RemoveRange(userVotes);
                    await _context.SaveChangesAsync();
                }

                // Delete profile picture if exists
                if (!string.IsNullOrEmpty(user.ProfilePicture))
                {
                    var profilePicturePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.ProfilePicture.TrimStart('/'));
                    if (System.IO.File.Exists(profilePicturePath))
                    {
                        try
                        {
                            System.IO.File.Delete(profilePicturePath);
                        }
                        catch
                        {
                            // Ignore file deletion errors
                        }
                    }
                }

                // Delete the user account
                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    return StatusCode(500, new {
                        success = false,
                        message = "Failed to delete account",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                return Ok(new {
                    success = true,
                    message = "Account deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while deleting account",
                    error = ex.Message
                });
            }
        }
    }
}
