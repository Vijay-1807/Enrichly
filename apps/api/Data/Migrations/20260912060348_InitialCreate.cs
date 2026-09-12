using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    HeadersJson = table.Column<string>(type: "text", nullable: true),
                    Body = table.Column<string>(type: "text", nullable: true),
                    ScheduleMode = table.Column<int>(type: "integer", nullable: false),
                    IntervalSeconds = table.Column<int>(type: "integer", nullable: true),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    MaxRetries = table.Column<int>(type: "integer", nullable: false),
                    TimeoutSeconds = table.Column<int>(type: "integer", nullable: false),
                    LastRunAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextRunAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_jobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_jobs_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "executions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Attempt = table.Column<int>(type: "integer", nullable: false),
                    WorkerId = table.Column<string>(type: "text", nullable: true),
                    LockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HeartbeatAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResponseStatus = table.Column<int>(type: "integer", nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    Trigger = table.Column<string>(type: "text", nullable: false),
                    ParentExecutionId = table.Column<Guid>(type: "uuid", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_executions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_executions_jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "execution_attempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExecutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptNumber = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResponseStatus = table.Column<int>(type: "integer", nullable: true),
                    ResponseBody = table.Column<string>(type: "text", nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_execution_attempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_execution_attempts_executions_ExecutionId",
                        column: x => x.ExecutionId,
                        principalTable: "executions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "job_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExecutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_logs_executions_ExecutionId",
                        column: x => x.ExecutionId,
                        principalTable: "executions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_execution_attempts_ExecutionId_AttemptNumber",
                table: "execution_attempts",
                columns: new[] { "ExecutionId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_executions_JobId_CreatedAt",
                table: "executions",
                columns: new[] { "JobId", "CreatedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_executions_JobId_IdempotencyKey",
                table: "executions",
                columns: new[] { "JobId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_executions_NextRetryAt",
                table: "executions",
                column: "NextRetryAt");

            migrationBuilder.CreateIndex(
                name: "IX_executions_Status",
                table: "executions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_job_logs_ExecutionId_CreatedAt",
                table: "job_logs",
                columns: new[] { "ExecutionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_jobs_Enabled",
                table: "jobs",
                column: "Enabled");

            migrationBuilder.CreateIndex(
                name: "IX_jobs_NextRunAt",
                table: "jobs",
                column: "NextRunAt");

            migrationBuilder.CreateIndex(
                name: "IX_jobs_UserId",
                table: "jobs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                table: "users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "execution_attempts");

            migrationBuilder.DropTable(
                name: "job_logs");

            migrationBuilder.DropTable(
                name: "executions");

            migrationBuilder.DropTable(
                name: "jobs");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
