const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // For Slack interactive components


require('dotenv').config();
const webhookUrl = process.env.WEBHOOK_URL;
// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;


// Root endpoint
app.get('/', (req, res) => {
  res.send('Slack Backend Server is running!');
});

// // Send a test message when the server starts
// axios.post(webhookUrl, { text: 'Test: Code review result sent from backend!' })
//   .then(() => console.log('Test message sent to Slack'))
//   .catch(err => console.error('Error sending to Slack:', err));


// Endpoint for Slack interactivity
app.post('/slack/events', (req, res) => {
  // Handle Slack button clicks or comments here
  console.log('Slack event:', req.body);
  res.status(200).send();
});

// Endpoint for Slack interactive components (button clicks)
app.post('/slack/interactive', async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    console.log('Interactive payload:', payload);
    
    const { actions, user, response_url } = payload;
    const action = actions[0];
    
    if (action.action_id === 'approve_action') {
      // Extract PR number from the button value
      const prNumber = action.value.replace('approve_', '');

      // Get PR details from GitHub to check author
      let prAuthor = null;
      try {
        const prResp = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}`, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Slack-GitHub-Integration'
          }
        });
        prAuthor = prResp.data.user.login;
      } catch (err) {
        console.error('Error fetching PR details:', err.response?.data || err.message);
      }

      // Compare Slack user with PR author
      if (prAuthor && prAuthor.toLowerCase() === user.name.toLowerCase()) {
        await axios.post(response_url, {
          text: `❌ You cannot approve your own pull request. Please ask someone else to review it.`,
          replace_original: true
        });
        return res.status(200).send();
      }

      // Approve the GitHub merge request
      const result = await approveGitHubPR({ prNumber });

      // Update the Slack message based on the result
      if (result.success) {
        await axios.post(response_url, {
          text: `✅ PR #${prNumber} approved by ${user.name}`,
          replace_original: true
        });
      } else {
        await axios.post(response_url, {
          text: `❌ ${result.message}`,
          replace_original: true
        });
      }
      
    } else if (action.action_id === 'comment_action') {
      // Extract PR number from the button value
      const prNumber = action.value.replace('comment_', '');
      
      // For now, we'll add a default comment - you can enhance this with a modal later
      const result = await commentOnGitHubPR(prNumber, `Changes requested by ${user.name} via Slack integration.`);
      
      // Update the Slack message based on the result
      if (result.success) {
        await axios.post(response_url, {
          text: `💬 Changes requested for PR #${prNumber} by ${user.name}`,
          replace_original: true
        });
      } else {
        await axios.post(response_url, {
          text: `❌ ${result.message}`,
          replace_original: true
        });
      }
    }
    
    res.status(200).send();
  } catch (error) {
    console.error('Error handling interactive component:', error);
    res.status(500).send('Error processing request');
  }
});

// Example endpoint to send review results to Slack
app.post('/send-review', async (req, res) => {
  const { webhookUrl, message } = req.body;
  await axios.post(webhookUrl, { text: message });
  res.status(200).send('Sent to Slack');
});

// Test endpoint to send interactive message
app.post('/test-interactive', async (req, res) => {
  const { prNumber = 1, prTitle = 'Test PR' } = req.body;
  await sendInteractiveMessage(prNumber, prTitle);
  res.status(200).send(`Test interactive message sent for PR #${prNumber}`);
});

// Endpoint to trigger code review for a specific PR
app.post('/review-pr', async (req, res) => {
  try {
    const { prNumber, prTitle, review } = req.body;
    if (!prNumber) {
      return res.status(400).send('PR number is required');
    }
    await sendInteractiveMessage(prNumber, prTitle || `PR #${prNumber}`, review);
    res.status(200).send(`Review request sent for PR #${prNumber}`);
  } catch (error) {
    console.error('Error sending review request:', error);
    res.status(500).send('Error sending review request');
  }
});

// GitHub API functions
async function approveGitHubPR(slackPayload) {
  try {
    // Extract PR number from the payload
    const prNumber = slackPayload.prNumber || extractPRNumber(slackPayload) || 1;
    
    const response = await axios.post(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}/reviews`,
      {
        event: 'APPROVE',
        body: 'Approved via Slack integration'
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Slack-GitHub-Integration'
        }
      }
    );
    
    console.log('GitHub PR approved:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error approving GitHub PR:', error.response?.data || error.message);
    
    // Handle specific GitHub errors
    if (error.response?.status === 422) {
      const errorMessage = error.response.data?.errors?.[0] || error.response.data?.message;
      if (errorMessage.includes('Can not approve your own pull request')) {
        return { 
          success: false, 
          error: 'Cannot approve your own pull request',
          message: 'You cannot approve your own pull request. Please ask someone else to review it.'
        };
      }
    }
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      message: 'Failed to approve the pull request'
    };
  }
}

async function commentOnGitHubPR(prNumber, comment) {
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${prNumber}/comments`,
      {
        body: comment
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Slack-GitHub-Integration'
        }
      }
    );
    
    console.log('GitHub comment added:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error commenting on GitHub PR:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      message: 'Failed to add comment to the pull request'
    };
  }
}

function extractPRNumber(slackPayload) {
  // Try to extract PR number from the message text or blocks
  // This is a simple implementation - you might want to make it more robust
  const messageText = slackPayload.message?.text || '';
  const prMatch = messageText.match(/PR[#\s]*(\d+)/i) || messageText.match(/pull[#\s]*(\d+)/i);
  return prMatch ? parseInt(prMatch[1]) : null;
}

const botToken = 'xoxb-9469022353861-9469048776485-tdCJRnc2B9qgpCW2IeM9hNlf'; // Replace with your bot token

// Function to send interactive message
async function sendInteractiveMessage(prNumber = 1, prTitle = 'Sample PR') {
  try {
    // Accept review text as third argument
    let reviewText = arguments.length > 2 ? arguments[2] : '';
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: 'test-bot',
      text: `Code review for PR #${prNumber}: ${prTitle}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Code Review Request*\n*PR #${prNumber}:* ${prTitle}\n\n*LLM Review:*\n${reviewText}\n\nPlease review and take action below:`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Approve' },
              value: `approve_${prNumber}`,
              action_id: 'approve_action',
              style: 'primary'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '💬 Request Changes' },
              value: `comment_${prNumber}`,
              action_id: 'comment_action',
              style: 'danger'
            }
          ]
        }
      ]
    }, {
      headers: { Authorization: `Bearer ${botToken}` }
    });
    console.log('Slack API Response:', response.data);
    if (response.data.ok) {
      console.log('Interactive message sent to Slack successfully!');
    } else {
      console.error('Slack API Error:', response.data.error);
    }
  } catch (err) {
    console.error('Error sending to Slack:', err.response?.data || err.message);
  }
}

// Send test message when server starts (uncomment to test)
// sendInteractiveMessage();

app.listen(3000, () => console.log('Server running on http://localhost:3000'));