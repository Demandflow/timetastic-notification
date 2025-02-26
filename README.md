# Time-tastic Weekly Report Generator

Automatically generates and sends weekly reports of team absences from Time-tastic to your Slack workspace. The report runs every Friday and provides information about absences for the upcoming week.

## Setup

1. Install dependencies: `npm install`
2. Create a `.env` file with your Timetastic API key and Slack webhook URL
3. Choose how to run the script:
   - One-time run: `node weekly-reports.js`
   - Scheduled: Use the startup script as described below

## Environment Variables

Required:
- `TIMETASTIC_API_KEY`: Your Time-tastic API key
- `SLACK_WEBHOOK_URL`: Slack webhook URL for receiving notifications

## How to Get a Slack Webhook URL

1. Go to your Slack workspace and create a new app at https://api.slack.com/apps
2. Give your app a name like "Timetastic Reports" and select your workspace
3. After creating, go to "Incoming Webhooks" from the features menu
4. Activate incoming webhooks by toggling the switch to On
5. Click "Add New Webhook to Workspace"
6. Choose the channel where you want to post the reports
7. Copy the webhook URL provided and add it to your `.env` file

## Testing the Slack Integration

Run the Slack test script to check your webhook configuration:
```
node test-slack.js
```

This will send a test message to your configured Slack channel.

## Running the Report on a Schedule (Every Friday)

We've set up the script to run automatically every Friday at 2:00 PM. To start the scheduler:

1. Make sure you've installed the node-cron package:
   ```
   npm install node-cron
   ```

2. Start the scheduler using the provided script:
   ```
   ./start.sh
   ```
   
   This will run the scheduler in the background, and it will continue running even if you close the terminal.

3. To stop the scheduler:
   ```
   ./stop.sh
   ```

4. To check the logs:
   ```
   tail -f timetastic-report.log
   ```

## How It Works

- The script connects to the Timetastic API to fetch information about planned absences
- Every Friday at 2:00 PM, it generates a report for the upcoming week (next Monday to Sunday)
- It sends this report to your configured Slack channel
- If there are no absences planned, it will still send a notification confirming that everyone is available

## Troubleshooting

If you're not seeing any absences in the report:
1. Check that there are actually absences scheduled in Timetastic for the upcoming week
2. Verify that your API key has the correct permissions
3. Check the logs for any error messages 

## Deployment

### GitHub Repository Setup

1. Create a new GitHub repository for this project
2. Initialize your local git repository (if not already done):
   ```
   git init
   ```
3. Add your files to the git repository:
   ```
   git add .
   ```
4. Make your initial commit:
   ```
   git commit -m "Initial commit"
   ```
5. Add your GitHub repository as a remote:
   ```
   git remote add origin https://github.com/your-username/your-repo-name.git
   ```
6. Push your code to GitHub:
   ```
   git push -u origin main
   ```

> **IMPORTANT**: The `.env` file containing your API keys and other sensitive information is excluded from the repository via `.gitignore`. Never commit sensitive information to a public repository!

### Deploying to Cloudflare Workers

1. Install Cloudflare Workers CLI if you haven't already:
   ```
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```
   wrangler login
   ```

3. Initialize a new Workers project (in a new directory):
   ```
   wrangler init your-worker-name
   ```

4. Configure your `wrangler.toml` file with necessary settings:
   ```toml
   name = "timetastic-weekly-report"
   type = "javascript"
   account_id = "your-account-id"
   workers_dev = true
   
   [triggers]
   crons = ["0 14 * * 5"] # Runs every Friday at 2:00 PM UTC
   ```

5. Set up environment variables in Cloudflare:
   - Go to your Workers dashboard on Cloudflare
   - Select your worker
   - Navigate to "Settings" > "Variables"
   - Add all the environment variables from your `.env.example` file with their actual values

6. Deploy your worker:
   ```
   wrangler publish
   ```

7. For local testing with your environment variables:
   ```
   wrangler dev
   ```

## Security Considerations

- **Never commit the `.env` file** to your repository
- The `.gitignore` file is set up to exclude sensitive files
- When setting up Cloudflare Workers, use their encrypted environment variables for storing sensitive keys
- Regularly rotate your API keys and update them in your deployment environment 