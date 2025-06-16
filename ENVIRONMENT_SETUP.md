# Environment Setup

This document explains how to configure environment variables for the MSSP Client Manager.

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your actual configuration:
   ```bash
   nano .env
   ```

3. **Configure Jira Integration** (Required for External API Widgets):
   - Set `JIRA_USERNAME` to your Jira username
   - Set `JIRA_API_TOKEN` to your Jira API token
   - Ensure `JIRA_URL` points to your Jira instance

## Environment Variables

### Core Application
- `NODE_ENV`: Application environment (production/development)
- `PORT`: Server port (default: 80)
- `SESSION_SECRET`: Secret key for session encryption

### Jira Integration
- `JIRA_ENABLED`: Enable/disable Jira integration (true/false)
- `JIRA_URL`: Your Jira instance URL
- `JIRA_USERNAME`: Jira username
- `JIRA_API_TOKEN`: Jira API token or password
- `JIRA_AUTH_TYPE`: Authentication type (bearer/basic)

### Security Notes
- Never commit `.env` files to version control
- Use strong, unique values for `SESSION_SECRET`
- Store API tokens securely
- The `.env` file is automatically ignored by git

### External API Widgets
The dashboard includes External API Widgets that can connect to:
- **JSONPlaceholder APIs**: Demo data (no authentication required)
- **Internal Jira API**: Requires proper Jira configuration
- **Custom APIs**: Any CORS-enabled REST endpoint

To use Jira widgets, ensure your Jira credentials are properly configured in the `.env` file.

## Starting the Application

After configuring your `.env` file:

```bash
./start-with-env.sh
```

The application will load your environment variables and start the server. 