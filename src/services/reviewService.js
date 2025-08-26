import { loadConfig, validateConfig } from '../config/configLoader.js';
import { parseDiff, filterFiles, extractReviewableChanges, checkCustomRules } from '../utils/diffParser.js';
import { GitHubAPI } from '../utils/githubAPI.js';
import { LLMService } from './llmService.js';
import process from 'process';

/**
 * Main review service that orchestrates the code review process
 */
export class ReviewService {
  constructor() {
    this.config = null;
    this.githubAPI = null;
    this.llmService = null;
  }

  /**
   * Initializes the review service with configuration
   * @param {string} rootPath - Root path for configuration
   */
  async initialize(rootPath = process.cwd()) {
    try {
      // Load and validate configuration
      this.config = loadConfig(rootPath);
      validateConfig(this.config);

      console.log('✓ Configuration loaded successfully');
      console.log(`LLM Provider: ${this.config.llm.provider}`);
      console.log(`Model: ${this.config.llm.model}`);
      console.log(`Focus Areas: ${this.config.review.focusAreas.join(', ')}`);

      // Initialize GitHub API client
      const token = process.env.GITHUB_TOKEN;
      const owner = process.env.REPO_OWNER;
      const repo = process.env.REPO_NAME;

      if (!token || !owner || !repo) {
        throw new Error('Missing required environment variables: GITHUB_TOKEN, REPO_OWNER, REPO_NAME');
      }

      this.githubAPI = new GitHubAPI(token, owner, repo);
      console.log(`✓ GitHub API initialized for ${owner}/${repo}`);

      // Initialize LLM service
      this.llmService = new LLMService(this.config);
      console.log('✓ LLM service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize review service:', error.message);
      throw error;
    }
  }

  /**
   * Reviews a pull request
   * @param {number} prNumber - Pull request number
   * @param {string} diffText - Git diff text
   * @returns {Promise<object>} Review results
   */
  async reviewPullRequest(prNumber, diffText) {
    if (!this.config.enabled) {
      console.log('⏭️  Code review is disabled in configuration');
      return { skipped: true, reason: 'disabled' };
    }

    try {
      console.log(`🔍 Starting review for PR #${prNumber}`);

      // Parse the diff
      const parsedFiles = parseDiff(diffText);
      console.log(`📄 Found ${parsedFiles.length} changed files`);

      if (parsedFiles.length === 0) {
        console.log('⏭️  No files to review');
        return { skipped: true, reason: 'no-changes' };
      }

      // Filter files based on exclude patterns
      const filteredFiles = filterFiles(parsedFiles, this.config.review.excludePatterns);
      console.log(`📄 ${filteredFiles.length} files after filtering`);

      if (filteredFiles.length === 0) {
        console.log('⏭️  All files excluded by patterns');
        return { skipped: true, reason: 'all-excluded' };
      }

      // Extract reviewable changes (additions only)
      const reviewableChanges = extractReviewableChanges(filteredFiles);
      console.log(`📝 ${reviewableChanges.length} files with additions to review`);

      if (reviewableChanges.length === 0) {
        console.log('⏭️  No additions to review');
        return { skipped: true, reason: 'no-additions' };
      }

      // Check custom rules
      const customRuleViolations = [];
      if (this.config.rules?.custom?.length > 0) {
        filteredFiles.forEach(file => {
          const violations = checkCustomRules(file, this.config.rules.custom);
          violations.forEach(violation => {
            customRuleViolations.push({
              ...violation,
              filename: file.filename
            });
          });
        });
        console.log(`📋 Found ${customRuleViolations.length} custom rule violations`);
      }

      // Get PR information
      const prInfo = await this.githubAPI.getPullRequest(prNumber);
      const commitSha = prInfo.head.sha;

      // Get existing comments to avoid duplicates
      const existingComments = await this.githubAPI.getReviewComments(prNumber);
      console.log(`💬 Found ${existingComments.length} existing comments`);

      // Review code with LLM
      console.log('🤖 Sending code to LLM for review...');
      const llmComments = await this.llmService.reviewCode(reviewableChanges, customRuleViolations);
      console.log(`🤖 LLM generated ${llmComments.length} comments`);

      // Post comments to GitHub
      const postedComments = [];
      const skippedComments = [];

      for (const comment of llmComments) {
        try {
          // Check if we already have a comment on this line
          const existingComment = this.githubAPI.findExistingComment(
            existingComments, 
            comment.filename, 
            comment.line
          );

          if (existingComment) {
            console.log(`⏭️  Skipping comment on ${comment.filename}:${comment.line} - already exists`);
            skippedComments.push(comment);
            continue;
          }

          // Format comment body
          const commentBody = this.formatComment(comment);

          // Post the comment
          await this.githubAPI.postReviewComment(
            prNumber,
            commentBody,
            commitSha,
            comment.filename,
            comment.line
          );

          postedComments.push(comment);
          console.log(`✓ Posted comment on ${comment.filename}:${comment.line}`);

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Failed to post comment on ${comment.filename}:${comment.line}:`, error.message);
          skippedComments.push({
            ...comment,
            error: error.message
          });
        }
      }

      // Post a summary comment if there are multiple issues
      if (postedComments.length > 0) {
        const summaryBody = this.formatSummary(postedComments, customRuleViolations);
        try {
          await this.githubAPI.postReview(prNumber, summaryBody, 'COMMENT');
          console.log('✓ Posted review summary');
        } catch (error) {
          console.error('❌ Failed to post review summary:', error.message);
        }
      }

      const results = {
        success: true,
        filesReviewed: reviewableChanges.length,
        commentsGenerated: llmComments.length,
        commentsPosted: postedComments.length,
        commentsSkipped: skippedComments.length,
        customRuleViolations: customRuleViolations.length,
        postedComments,
        skippedComments
      };

      console.log('✅ Review completed successfully');
      console.log(`📊 Results: ${results.commentsPosted} posted, ${results.commentsSkipped} skipped`);

      return results;

    } catch (error) {
      console.error('❌ Review failed:', error.message);
      throw error;
    }
  }

  /**
   * Formats a review comment for GitHub
   * @param {object} comment - Comment object
   * @returns {string} Formatted comment body
   */
  formatComment(comment) {
    const severityEmoji = {
      high: '🚨',
      medium: '⚠️',
      low: '💡'
    };

    const categoryEmoji = {
      bugs: '🐛',
      security: '🔒',
      performance: '⚡',
      readability: '📖',
      maintainability: '🔧',
      'best-practices': '✅',
      testing: '🧪',
      documentation: '📚'
    };

    let body = `${severityEmoji[comment.severity] || '💭'} **${comment.category}** ${categoryEmoji[comment.category] || ''}\n\n`;
    body += `${comment.message}\n`;

    if (comment.suggestion) {
      body += `\n**Suggestion:**\n\`\`\`\n${comment.suggestion}\n\`\`\`\n`;
    }

    body += `\n---\n*Generated by AI Code Review* • Severity: \`${comment.severity}\``;

    return body;
  }

  /**
   * Formats a review summary
   * @param {Array} comments - Posted comments
   * @param {Array} violations - Custom rule violations
   * @returns {string} Formatted summary
   */
  formatSummary(comments, violations) {
    let summary = '## 🤖 AI Code Review Summary\n\n';

    if (comments.length > 0) {
      summary += `I've reviewed your code and found **${comments.length} potential improvement${comments.length === 1 ? '' : 's'}**.\n\n`;

      // Group by severity
      const bySeverity = comments.reduce((acc, comment) => {
        acc[comment.severity] = (acc[comment.severity] || 0) + 1;
        return acc;
      }, {});

      summary += '### Issues by Severity:\n';
      if (bySeverity.high) summary += `- 🚨 **High**: ${bySeverity.high}\n`;
      if (bySeverity.medium) summary += `- ⚠️ **Medium**: ${bySeverity.medium}\n`;
      if (bySeverity.low) summary += `- 💡 **Low**: ${bySeverity.low}\n`;

      // Group by category
      const byCategory = comments.reduce((acc, comment) => {
        acc[comment.category] = (acc[comment.category] || 0) + 1;
        return acc;
      }, {});

      summary += '\n### Issues by Category:\n';
      Object.entries(byCategory).forEach(([category, count]) => {
        summary += `- **${category}**: ${count}\n`;
      });
    }

    if (violations.length > 0) {
      summary += `\n### Custom Rule Violations: ${violations.length}\n`;
      violations.forEach(violation => {
        summary += `- **${violation.rule}**: ${violation.message}\n`;
      });
    }

    summary += '\n---\n*This review was generated automatically. Please review the suggestions and apply what makes sense for your codebase.*';

    return summary;
  }
}
