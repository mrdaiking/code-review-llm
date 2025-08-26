import fetch from 'node-fetch';

/**
 * GitHub API client for posting review comments
 */
export class GitHubAPI {
  constructor(token, owner, repo) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Makes authenticated request to GitHub API
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Code-Review-Bot',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error ${response.status}: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GitHub API request failed:`, error);
      throw error;
    }
  }

  /**
   * Posts a review comment on a pull request
   * @param {number} prNumber - Pull request number
   * @param {string} body - Comment body
   * @param {string} commitSha - Commit SHA
   * @param {string} path - File path
   * @param {number} line - Line number
   * @returns {Promise} Response data
   */
  async postReviewComment(prNumber, body, commitSha, path, line) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/comments`;
    
    return await this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body,
        commit_id: commitSha,
        path,
        line,
        side: 'RIGHT'
      })
    });
  }

  /**
   * Posts a general review on a pull request
   * @param {number} prNumber - Pull request number
   * @param {string} body - Review body
   * @param {string} event - Review event (COMMENT, APPROVE, REQUEST_CHANGES)
   * @param {Array} comments - Array of review comments
   * @returns {Promise} Response data
   */
  async postReview(prNumber, body, event = 'COMMENT', comments = []) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/reviews`;
    
    return await this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body,
        event,
        comments: comments.map(comment => ({
          path: comment.path,
          line: comment.line,
          body: comment.body
        }))
      })
    });
  }

  /**
   * Gets pull request information
   * @param {number} prNumber - Pull request number
   * @returns {Promise} Pull request data
   */
  async getPullRequest(prNumber) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/${prNumber}`;
    return await this.request(endpoint);
  }

  /**
   * Gets pull request files
   * @param {number} prNumber - Pull request number
   * @returns {Promise} Array of changed files
   */
  async getPullRequestFiles(prNumber) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/files`;
    return await this.request(endpoint);
  }

  /**
   * Gets existing review comments for a PR
   * @param {number} prNumber - Pull request number
   * @returns {Promise} Array of existing comments
   */
  async getReviewComments(prNumber) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/comments`;
    return await this.request(endpoint);
  }

  /**
   * Deletes a review comment
   * @param {number} commentId - Comment ID
   * @returns {Promise} Response data
   */
  async deleteReviewComment(commentId) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/comments/${commentId}`;
    return await this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Updates an existing review comment
   * @param {number} commentId - Comment ID
   * @param {string} body - New comment body
   * @returns {Promise} Response data
   */
  async updateReviewComment(commentId, body) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls/comments/${commentId}`;
    return await this.request(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    });
  }

  /**
   * Checks if the bot has already commented on a specific line
   * @param {Array} existingComments - Existing comments array
   * @param {string} path - File path
   * @param {number} line - Line number
   * @returns {object|null} Existing comment if found, null otherwise
   */
  findExistingComment(existingComments, path, line) {
    return existingComments.find(comment => 
      comment.path === path && 
      comment.line === line &&
      comment.user.login.includes('bot')
    ) || null;
  }
}
