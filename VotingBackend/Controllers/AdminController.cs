using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VotingBackend.Data;
using VotingBackend.DTOs;
using VotingBackend.Models;

namespace VotingBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<AdminDashboardDto>> GetDashboard()
        {
            // Count regular users and admin users separately
            var allUsers = await _userManager.Users.ToListAsync();
            var regularUserCount = 0;
            var adminUserCount = 0;

            foreach (var user in allUsers)
            {
                var roles = await _userManager.GetRolesAsync(user);
                if (roles.Contains("Admin"))
                {
                    adminUserCount++;
                }
                else
                {
                    regularUserCount++;
                }
            }

            var totalVotes = await _context.Votes.CountAsync();
            var totalCandidates = await _context.Candidates.CountAsync();
            var activeCandidates = await _context.Candidates.CountAsync(c => !c.Disqualified);

            var candidates = await _context.Candidates
                .Include(c => c.Votes)
                .Select(c => new CandidateDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Picture = c.Picture,
                    Disqualified = c.Disqualified,
                    VoteCount = c.Votes.Count(),
                    CreatedAt = c.CreatedAt
                })
                .OrderByDescending(c => c.VoteCount)
                .ToListAsync();

            var voteStats = candidates
                .Where(c => !c.Disqualified)
                .Select(c => new VoteStatsDto
                {
                    CandidateName = c.Name,
                    VoteCount = c.VoteCount,
                    Percentage = totalVotes > 0 ? Math.Round((double)c.VoteCount / totalVotes * 100, 2) : 0
                })
                .ToList();

            var dashboard = new AdminDashboardDto
            {
                TotalUsers = regularUserCount,
                TotalAdmins = adminUserCount,
                TotalVotes = totalVotes,
                TotalCandidates = totalCandidates,
                ActiveCandidates = activeCandidates,
                Candidates = candidates,
                VoteStats = voteStats
            };

            return Ok(dashboard);
        }

        [HttpPost("add-candidate")]
        public async Task<ActionResult> AddCandidate(CreateCandidateDto createCandidateDto)
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

                // Check if candidate with same name already exists
                var existingCandidate = await _context.Candidates
                    .FirstOrDefaultAsync(c => c.Name.ToLower() == createCandidateDto.Name.ToLower());

                if (existingCandidate != null)
                {
                    return BadRequest(new {
                        success = false,
                        message = "A candidate with this name already exists"
                    });
                }

                var candidate = new Candidate
                {
                    Name = createCandidateDto.Name.Trim(),
                    Picture = string.IsNullOrEmpty(createCandidateDto.Picture)
                        ? $"https://via.placeholder.com/150x150?text={Uri.EscapeDataString(createCandidateDto.Name.Trim().Substring(0, Math.Min(2, createCandidateDto.Name.Trim().Length)).ToUpper())}"
                        : createCandidateDto.Picture.Trim(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Candidates.Add(candidate);
                await _context.SaveChangesAsync();

                var candidateDto = new CandidateDto
                {
                    Id = candidate.Id,
                    Name = candidate.Name,
                    Picture = candidate.Picture,
                    Disqualified = candidate.Disqualified,
                    VoteCount = 0,
                    CreatedAt = candidate.CreatedAt
                };

                return Ok(new {
                    success = true,
                    message = "Candidate added successfully",
                    candidate = candidateDto
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while adding the candidate",
                    error = ex.Message
                });
            }
        }

        [HttpDelete("remove-candidate/{id}")]
        public async Task<ActionResult> RemoveCandidate(int id)
        {
            var candidate = await _context.Candidates.FindAsync(id);
            if (candidate == null)
            {
                return NotFound("Candidate not found");
            }

            // Remove associated votes first
            var votes = await _context.Votes.Where(v => v.CandidateId == id).ToListAsync();
            _context.Votes.RemoveRange(votes);

            _context.Candidates.Remove(candidate);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Candidate removed successfully" });
        }

        [HttpPatch("disqualify-candidate/{id}")]
        public async Task<ActionResult> DisqualifyCandidate(int id)
        {
            var candidate = await _context.Candidates.FindAsync(id);
            if (candidate == null)
            {
                return NotFound("Candidate not found");
            }

            candidate.Disqualified = !candidate.Disqualified;
            await _context.SaveChangesAsync();

            var action = candidate.Disqualified ? "disqualified" : "requalified";
            return Ok(new { message = $"Candidate {action} successfully" });
        }

        [HttpGet("users")]
        public async Task<ActionResult> GetAllUsers()
        {
            try
            {
                var allUsers = await _userManager.Users
                    .Select(u => new
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email,
                        ProfilePicture = u.ProfilePicture,
                        CreatedAt = u.CreatedAt,
                        HasVoted = _context.Votes.Any(v => v.UserId == u.Id)
                    })
                    .ToListAsync();

                // Filter out admin users - only show regular users
                var regularUsers = new List<object>();
                foreach (var user in allUsers)
                {
                    var userEntity = await _userManager.FindByIdAsync(user.Id);
                    var roles = await _userManager.GetRolesAsync(userEntity!);
                    var role = roles.FirstOrDefault() ?? "User";

                    // Only include non-admin users
                    if (role != "Admin")
                    {
                        regularUsers.Add(new
                        {
                            user.Id,
                            user.Name,
                            user.Email,
                            user.ProfilePicture,
                            user.CreatedAt,
                            user.HasVoted,
                            Role = role
                        });
                    }
                }

                return Ok(new { success = true, users = regularUsers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while fetching users",
                    error = ex.Message
                });
            }
        }

        [HttpGet("admins")]
        public async Task<ActionResult> GetAllAdmins()
        {
            try
            {
                var allUsers = await _userManager.Users
                    .Select(u => new
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email,
                        ProfilePicture = u.ProfilePicture,
                        CreatedAt = u.CreatedAt,
                        HasVoted = _context.Votes.Any(v => v.UserId == u.Id)
                    })
                    .ToListAsync();

                // Filter to show only admin users
                var adminUsers = new List<object>();
                foreach (var user in allUsers)
                {
                    var userEntity = await _userManager.FindByIdAsync(user.Id);
                    var roles = await _userManager.GetRolesAsync(userEntity!);
                    var role = roles.FirstOrDefault() ?? "User";

                    // Only include admin users
                    if (role == "Admin")
                    {
                        adminUsers.Add(new
                        {
                            user.Id,
                            user.Name,
                            user.Email,
                            user.ProfilePicture,
                            user.CreatedAt,
                            user.HasVoted,
                            Role = role
                        });
                    }
                }

                return Ok(new { success = true, admins = adminUsers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while fetching admin users",
                    error = ex.Message
                });
            }
        }

        [HttpPut("edit-user/{userId}")]
        public async Task<ActionResult> EditUser(string userId, [FromBody] EditUserDto editUserDto)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Check if user is an admin
                var roles = await _userManager.GetRolesAsync(user);
                if (roles.Contains("Admin"))
                {
                    return BadRequest(new { success = false, message = "Cannot edit admin users through this endpoint" });
                }

                // Validate email uniqueness (if email is being changed)
                if (editUserDto.Email != user.Email)
                {
                    var existingUser = await _userManager.FindByEmailAsync(editUserDto.Email);
                    if (existingUser != null && existingUser.Id != userId)
                    {
                        return BadRequest(new { success = false, message = "Email is already in use by another user" });
                    }
                }

                // Update user information
                user.Name = editUserDto.Name.Trim();
                user.Email = editUserDto.Email.Trim();
                user.UserName = editUserDto.Email.Trim();

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return BadRequest(new {
                        success = false,
                        message = "Failed to update user",
                        errors = updateResult.Errors.Select(e => e.Description)
                    });
                }

                // Update password if provided
                if (!string.IsNullOrEmpty(editUserDto.NewPassword))
                {
                    // Remove current password and set new one (admin override)
                    var removePasswordResult = await _userManager.RemovePasswordAsync(user);
                    if (removePasswordResult.Succeeded)
                    {
                        var addPasswordResult = await _userManager.AddPasswordAsync(user, editUserDto.NewPassword);
                        if (!addPasswordResult.Succeeded)
                        {
                            return BadRequest(new {
                                success = false,
                                message = "Failed to update password",
                                errors = addPasswordResult.Errors.Select(e => e.Description)
                            });
                        }
                    }
                    else
                    {
                        return BadRequest(new {
                            success = false,
                            message = "Failed to update password",
                            errors = removePasswordResult.Errors.Select(e => e.Description)
                        });
                    }
                }

                return Ok(new { success = true, message = $"User {user.Name} has been updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while updating the user",
                    error = ex.Message
                });
            }
        }

        [HttpDelete("delete-user/{userId}")]
        public async Task<ActionResult> DeleteUser(string userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Check if trying to delete an admin user
                var userRoles = await _userManager.GetRolesAsync(user);
                if (userRoles.Contains("Admin"))
                {
                    return BadRequest(new { success = false, message = "Cannot delete admin users" });
                }

                // Delete user's votes first
                var userVotes = await _context.Votes.Where(v => v.UserId == userId).ToListAsync();
                if (userVotes.Any())
                {
                    _context.Votes.RemoveRange(userVotes);
                    await _context.SaveChangesAsync();
                }

                // Delete user's profile picture if exists
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

                // Delete the user
                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    return StatusCode(500, new {
                        success = false,
                        message = "Failed to delete user",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                return Ok(new {
                    success = true,
                    message = $"User '{user.Name}' has been deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while deleting the user",
                    error = ex.Message
                });
            }
        }

        [HttpPost("register-user")]
        public async Task<ActionResult> RegisterUser([FromBody] AdminRegisterUserDto registerDto)
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

                // Check if user already exists
                var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
                if (existingUser != null)
                {
                    return BadRequest(new {
                        success = false,
                        message = "A user with this email already exists"
                    });
                }

                // Create new user
                var newUser = new ApplicationUser
                {
                    UserName = registerDto.Email,
                    Email = registerDto.Email,
                    Name = registerDto.Name,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await _userManager.CreateAsync(newUser, registerDto.Password);

                if (!result.Succeeded)
                {
                    return BadRequest(new {
                        success = false,
                        message = "Failed to create user",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                // Assign role
                var roleResult = await _userManager.AddToRoleAsync(newUser, registerDto.Role);
                if (!roleResult.Succeeded)
                {
                    // If role assignment fails, delete the user and return error
                    await _userManager.DeleteAsync(newUser);
                    return BadRequest(new {
                        success = false,
                        message = "Failed to assign role to user"
                    });
                }

                return Ok(new {
                    success = true,
                    message = $"User '{registerDto.Name}' has been created successfully with {registerDto.Role} role",
                    user = new {
                        Id = newUser.Id,
                        Name = newUser.Name,
                        Email = newUser.Email,
                        Role = registerDto.Role,
                        CreatedAt = newUser.CreatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    success = false,
                    message = "An error occurred while creating the user",
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
                var currentUserId = User.FindFirst("id")?.Value;
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
                var currentUserId = User.FindFirst("id")?.Value;
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

                // Check if this is the last admin
                var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
                if (adminUsers.Count <= 1)
                {
                    return BadRequest(new {
                        success = false,
                        message = "Cannot delete the last admin account. At least one admin must remain in the system."
                    });
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
