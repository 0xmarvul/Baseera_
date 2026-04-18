-- ============================================================
-- Security Scanner Database - Initial Schema
-- Database: SecurityScanner
-- ============================================================

-- Create database if it does not exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SecurityScanner')
BEGIN
    CREATE DATABASE SecurityScanner;
END
GO

USE SecurityScanner;
GO

-- ============================================================
-- Table: Users
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [Email]        NVARCHAR(100)  NOT NULL,
        [Username]     NVARCHAR(50)   NOT NULL,
        [FirstName]    NVARCHAR(50)   NOT NULL,
        [LastName]     NVARCHAR(50)   NOT NULL,
        [PasswordHash] NVARCHAR(MAX)  NOT NULL,
        [Role]         NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Users_Role] DEFAULT ('User'),
        [IsActive]     BIT            NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT (1),
        [CreatedAt]    DATETIME2      NOT NULL,
        [UpdatedAt]    DATETIME2      NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    CREATE UNIQUE INDEX [IX_Users_Email]    ON [dbo].[Users] ([Email]);
    CREATE UNIQUE INDEX [IX_Users_Username] ON [dbo].[Users] ([Username]);

    PRINT 'Table [Users] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [Users] already exists.';
END
GO

-- ============================================================
-- Table: Scans
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Scans' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Scans] (
        [Id]            INT            IDENTITY(1,1) NOT NULL,
        [UserId]        INT            NOT NULL,
        [TargetURL]     NVARCHAR(500)  NOT NULL,
        [Status]        NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Scans_Status] DEFAULT ('Pending'),
        [TotalVulns]    INT            NOT NULL CONSTRAINT [DF_Scans_TotalVulns] DEFAULT (0),
        [CriticalCount] INT            NOT NULL CONSTRAINT [DF_Scans_CriticalCount] DEFAULT (0),
        [HighCount]     INT            NOT NULL CONSTRAINT [DF_Scans_HighCount] DEFAULT (0),
        [MediumCount]   INT            NOT NULL CONSTRAINT [DF_Scans_MediumCount] DEFAULT (0),
        [LowCount]      INT            NOT NULL CONSTRAINT [DF_Scans_LowCount] DEFAULT (0),
        [CreatedAt]     DATETIME2      NOT NULL,
        [CompletedAt]   DATETIME2      NULL,
        CONSTRAINT [PK_Scans] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Scans_Users_UserId] FOREIGN KEY ([UserId])
            REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_Scans_UserId]    ON [dbo].[Scans] ([UserId]);
    CREATE INDEX [IX_Scans_CreatedAt] ON [dbo].[Scans] ([CreatedAt]);

    PRINT 'Table [Scans] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [Scans] already exists.';
END
GO

-- ============================================================
-- Table: Vulnerabilities
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vulnerabilities' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Vulnerabilities] (
        [Id]             INT             IDENTITY(1,1) NOT NULL,
        [ScanId]         INT             NOT NULL,
        [Type]           NVARCHAR(100)   NOT NULL,
        [Severity]       NVARCHAR(20)    NOT NULL,
        [Description]    NVARCHAR(1000)  NOT NULL,
        [Location]       NVARCHAR(500)   NOT NULL,
        [Recommendation] NVARCHAR(1000)  NULL,
        [DetectedAt]     DATETIME2       NOT NULL,
        CONSTRAINT [PK_Vulnerabilities] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Vulnerabilities_Scans_ScanId] FOREIGN KEY ([ScanId])
            REFERENCES [dbo].[Scans] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_Vulnerabilities_ScanId]   ON [dbo].[Vulnerabilities] ([ScanId]);
    CREATE INDEX [IX_Vulnerabilities_Severity] ON [dbo].[Vulnerabilities] ([Severity]);

    PRINT 'Table [Vulnerabilities] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [Vulnerabilities] already exists.';
END
GO

-- ============================================================
-- Table: Reports
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reports' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Reports] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [ScanId]      INT            NOT NULL,
        [FilePath]    NVARCHAR(500)  NOT NULL,
        [Format]      NVARCHAR(10)   NOT NULL,
        [GeneratedAt] DATETIME2      NOT NULL,
        CONSTRAINT [PK_Reports] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Reports_Scans_ScanId] FOREIGN KEY ([ScanId])
            REFERENCES [dbo].[Scans] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_Reports_ScanId] ON [dbo].[Reports] ([ScanId]);

    PRINT 'Table [Reports] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [Reports] already exists.';
END
GO

-- ============================================================
-- EF Core Migrations History Table (required by Entity Framework)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='__EFMigrationsHistory' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[__EFMigrationsHistory] (
        [MigrationId]    NVARCHAR(150) NOT NULL,
        [ProductVersion] NVARCHAR(32)  NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY CLUSTERED ([MigrationId] ASC)
    );

    -- Mark existing migrations as applied so EF Core won't re-run them
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES
        ('20260217060843_InitialCreate',         '8.0.0'),
        ('20260219045546_AddVulnerabilityColumns','8.0.0');

    PRINT 'Table [__EFMigrationsHistory] created and migrations marked as applied.';
END
GO

PRINT 'SecurityScanner database schema created successfully.';
GO
