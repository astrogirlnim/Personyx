# DeskResearcher Authentication Configuration Guide

This guide outlines how to configure DeskResearcher to securely integrate with data sources for real-time user insights, ensuring privacy compliance (e.g., GDPR, CCPA) and seamless workflow integration.

## Authentication Methods

### OAuth 2.0
- **Sources**: Intercom, Slack, email (IMAP, e.g., Gmail, Outlook), Discord
- **Setup**:
  1. Open DeskResearcher settings in VS Code or system tray app.
  2. Select “Connect [Source]” (e.g., “Sign in with Slack”).
  3. Authenticate via the provider’s login page, granting read-only access (e.g., Slack channels, Intercom chats).
  4. Tokens are stored securely in an encrypted local database (256-bit AES).
- **Security**: Use TLS 1.2 for transit, 256-bit AES for storage. Obtain user consent for GDPR compliance.
- **Purpose**: Secure access to PII-heavy feedback (e.g., user chats, emails) with scoped permissions.

### API Keys
- **Sources**: Linear, Google Analytics (GA), Amplitude, Hotjar
- **Setup**:
  1. Generate API key from the source’s dashboard (e.g., Linear’s developer settings, GA’s admin panel).
  2. Copy-paste key into DeskResearcher’s settings in VS Code or tray app.
  3. Keys are stored in an encrypted local database (256-bit AES).
- **Security**: Use TLS for transit, BitLocker/FileVault for storage. Avoid PII in synced data.
- **Purpose**: Simple access to aggregated data (e.g., GA metrics, Linear issues) with low PII risk.

## Source-Specific Configuration

### Intercom
- **Method**: OAuth (preferred), API keys (fallback)
- **Steps**: Use OAuth for user-specific access (e.g., chats, surveys). API keys for team-wide data in small setups.
- **Privacy**: Anonymize PII (e.g., user names) before syncing, per GDPR.

### Slack
- **Method**: OAuth
- **Steps**: Authenticate bot for read-only channel access (e.g., #user-feedback).
- **Privacy**: Filter PII (e.g., usernames) using NLP before local storage.

### Linear
- **Method**: API keys (preferred), OAuth (optional)
- **Steps**: Input API key for project-level issue access. OAuth for user-specific data in large teams.
- **Privacy**: Sync metadata only (e.g., issue titles), low PII risk.

### Google Analytics
- **Method**: API keys
- **Steps**: Input key for project-level metrics (e.g., page views).
- **Privacy**: Sync aggregated data only, compliant with GDPR.

### Amplitude
- **Method**: API keys or OAuth
- **Steps**: Use API keys for project data, OAuth for user-specific custom events.
- **Privacy**: Avoid PII in custom events, use anonymized metrics.

### Hotjar
- **Method**: API keys
- **Steps**: Input key for anonymized heatmap data.
- **Privacy**: Exclude raw session replays, sync PII-free data.

### Email
- **Method**: OAuth
- **Steps**: Authenticate via Gmail/Outlook for IMAP access.
- **Privacy**: Redact PII (e.g., emails, names) before syncing, obtain consent.

### Discord
- **Method**: OAuth or bot tokens
- **Steps**: Use OAuth for user access or bot token for community channel data.
- **Privacy**: Anonymize PII in messages, use scoped access.

## Security and Compliance
- **Encryption**: TLS 1.2 for data in transit, 256-bit AES (BitLocker/FileVault) for local storage.
- **Data Minimization**: Sync only necessary data (e.g., summarized feedback, aggregated metrics).
- **Consent**: Prompt users for consent via OAuth flows for PII-heavy sources.
- **Audits**: Implement regular data deletion (e.g., 30-day retention) for GDPR/CCPA compliance.

## Validation
- Test authentication in a beta with VS Code plugin, ensuring seamless OAuth (Intercom, Slack) and API key (Linear, GA) setup.
- Survey devs to confirm setup ease and compliance trust.