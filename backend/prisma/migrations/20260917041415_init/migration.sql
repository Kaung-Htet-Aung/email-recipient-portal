BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[applications] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [applications_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [applications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [applications_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [applications_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[application_credentials] (
    [id] NVARCHAR(1000) NOT NULL,
    [applicationId] NVARCHAR(1000) NOT NULL,
    [apiKey] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [application_credentials_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [application_credentials_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [application_credentials_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [application_credentials_apiKey_key] UNIQUE NONCLUSTERED ([apiKey])
);

-- CreateTable
CREATE TABLE [dbo].[departments] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [departments_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [departments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [departments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [departments_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[email_recipients] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeCode] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [departmentId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [email_recipients_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [email_recipients_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [email_recipients_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [email_recipients_employeeCode_key] UNIQUE NONCLUSTERED ([employeeCode]),
    CONSTRAINT [email_recipients_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[email_lists] (
    [id] NVARCHAR(1000) NOT NULL,
    [applicationId] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [email_lists_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [email_lists_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [email_lists_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [email_lists_applicationId_code_key] UNIQUE NONCLUSTERED ([applicationId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[email_list_recipients] (
    [id] NVARCHAR(1000) NOT NULL,
    [emailListId] NVARCHAR(1000) NOT NULL,
    [recipientId] NVARCHAR(1000) NOT NULL,
    [recipientType] NVARCHAR(1000) NOT NULL CONSTRAINT [email_list_recipients_recipientType_df] DEFAULT 'TO',
    [priority] INT NOT NULL CONSTRAINT [email_list_recipients_priority_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [email_list_recipients_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [email_list_recipients_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [email_list_recipients_emailListId_recipientId_key] UNIQUE NONCLUSTERED ([emailListId],[recipientId])
);

-- CreateTable
CREATE TABLE [dbo].[admin_users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [admin_users_role_df] DEFAULT 'VIEWER',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [admin_users_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [admin_users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [admin_users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [admin_users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000),
    [oldValue] NVARCHAR(1000),
    [newValue] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[application_credentials] ADD CONSTRAINT [application_credentials_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[applications]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[email_recipients] ADD CONSTRAINT [email_recipients_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[departments]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[email_lists] ADD CONSTRAINT [email_lists_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[applications]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[email_list_recipients] ADD CONSTRAINT [email_list_recipients_emailListId_fkey] FOREIGN KEY ([emailListId]) REFERENCES [dbo].[email_lists]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[email_list_recipients] ADD CONSTRAINT [email_list_recipients_recipientId_fkey] FOREIGN KEY ([recipientId]) REFERENCES [dbo].[email_recipients]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[admin_users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

