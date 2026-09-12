using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Api.Services;

public class JwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;

    public JwtService(IConfiguration config)
    {
        _secret = config["JWT_SECRET"]
            ?? Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? "dev-only-secret-change-me-please-32-chars-minimum!!";
        _issuer = config["JWT_ISSUER"] ?? "enrichly-jobs";
        _audience = config["JWT_AUDIENCE"] ?? "enrichly-jobs";
        if (_secret.Length < 32)
            throw new InvalidOperationException("JWT_SECRET must be at least 32 characters.");
    }

    public string CreateToken(User user, TimeSpan? lifetime = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("uid", user.Id.ToString()),
        };
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromDays(7)),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static Guid GetUserId(ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue("uid") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (Guid.TryParse(raw, out var id)) return id;
        throw new UnauthorizedAccessException("Invalid token subject.");
    }
}
