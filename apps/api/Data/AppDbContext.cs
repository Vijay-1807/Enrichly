using Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Execution> Executions => Set<Execution>();
    public DbSet<ExecutionAttempt> ExecutionAttempts => Set<ExecutionAttempt>();
    public DbSet<JobLog> JobLogs => Set<JobLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
        });

        b.Entity<Job>(e =>
        {
            e.ToTable("jobs");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.Enabled);
            e.HasIndex(x => x.NextRunAt);
            e.Property(x => x.RowVersion).IsRowVersion().HasColumnName("xmin");
            e.Property(x => x.ScheduleMode).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.User).WithMany(u => u.Jobs).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Execution>(e =>
        {
            e.ToTable("executions");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.JobId, x.CreatedAt }).IsDescending(false, true);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.NextRetryAt);
            e.HasIndex(x => new { x.JobId, x.IdempotencyKey }).IsUnique()
                .HasFilter("\"IdempotencyKey\" IS NOT NULL");
            e.HasOne(x => x.Job).WithMany(j => j.Executions).HasForeignKey(x => x.JobId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        });

        b.Entity<ExecutionAttempt>(e =>
        {
            e.ToTable("execution_attempts");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ExecutionId, x.AttemptNumber }).IsUnique();
            e.HasOne(x => x.Execution).WithMany(x => x.Attempts).HasForeignKey(x => x.ExecutionId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        });

        b.Entity<JobLog>(e =>
        {
            e.ToTable("job_logs");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ExecutionId, x.CreatedAt });
            e.HasOne(x => x.Execution).WithMany(x => x.Logs).HasForeignKey(x => x.ExecutionId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
