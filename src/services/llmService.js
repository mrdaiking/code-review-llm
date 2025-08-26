import fetch from 'node-fetch';
import process from 'process';

/**
 * LLM Service for code review using various AI providers
 */
export class LLMService {
  constructor(config) {
    this.config = config;
    this.provider = config.llm.provider;
    this.model = config.llm.model;
    this.temperature = config.llm.temperature || 0.1;
    this.maxTokens = config.llm.maxTokens || 2000;
  }

  /**
   * Reviews code changes using the configured LLM
   * @param {Array} changes - Array of code changes to review
   * @param {Array} customRuleViolations - Custom rule violations
   * @returns {Promise<Array>} Array of review comments
   */
  async reviewCode(changes, customRuleViolations = []) {
    try {
      const prompt = this.buildReviewPrompt(changes, customRuleViolations);
      const response = await this.callLLM(prompt);
      return this.parseReviewResponse(response);
    } catch (error) {
      console.error('LLM review failed:', error);
      throw error;
    }
  }

  /**
   * Builds the review prompt for the LLM
   * @param {Array} changes - Code changes
   * @param {Array} violations - Custom rule violations
   * @returns {string} Formatted prompt
   */
  buildReviewPrompt(changes, violations) {
    const focusAreas = this.config.review.focusAreas.join(', ');
    const severity = this.config.review.severity;
    
    let prompt = `You are an expert code reviewer. Please review the following code changes and provide constructive feedback.

Focus Areas: ${focusAreas}
Minimum Severity: ${severity}
Maximum Comments: ${this.config.review.maxComments}

Guidelines:
- Only comment on significant issues that match the focus areas
- Provide specific, actionable feedback
- Include line numbers in your comments
- Be constructive and helpful, not just critical
- Consider security, performance, maintainability, and best practices
- Ignore minor style issues unless they impact readability significantly

For each issue found, respond in this JSON format:
{
  "filename": "path/to/file.js",
  "line": 42,
  "severity": "high|medium|low",
  "category": "bugs|security|performance|readability|maintainability|best-practices|testing|documentation",
  "message": "Clear explanation of the issue and suggested fix",
  "suggestion": "Optional code suggestion"
}

Code Changes to Review:
`;

    changes.forEach((change, index) => {
      prompt += `\n--- File ${index + 1}: ${change.filename} ---\n`;
      prompt += `Additions: ${change.additions}, Deletions: ${change.deletions}\n`;
      prompt += `Added lines (with line numbers):\n`;
      
      change.addedLines.forEach((line, lineIndex) => {
        const lineNum = change.lineNumbers[lineIndex] || 'unknown';
        prompt += `${lineNum}: ${line.content}\n`;
      });
      prompt += '\n';
    });

    if (violations.length > 0) {
      prompt += '\nCustom Rule Violations:\n';
      violations.forEach(violation => {
        prompt += `- ${violation.rule}: ${violation.message} (Line ${violation.line})\n`;
      });
    }

    prompt += '\nProvide your review as a JSON array of comment objects. If no significant issues are found, return an empty array [].\n';

    return prompt;
  }

  /**
   * Calls the appropriate LLM provider
   * @param {string} prompt - Review prompt
   * @returns {Promise<string>} LLM response
   */
  async callLLM(prompt) {
    switch (this.provider) {
      case 'openai':
        return await this.callOpenAI(prompt);
      case 'anthropic':
        return await this.callAnthropic(prompt);
      case 'azure':
        return await this.callAzureOpenAI(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Calls OpenAI API
   * @param {string} prompt - Review prompt
   * @returns {Promise<string>} Response text
   */
  async callOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Calls Anthropic Claude API
   * @param {string} prompt - Review prompt
   * @returns {Promise<string>} Response text
   */
  async callAnthropic(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Calls Azure OpenAI API
   * @param {string} prompt - Review prompt
   * @returns {Promise<string>} Response text
   */
  async callAzureOpenAI(prompt) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    
    if (!apiKey || !endpoint) {
      throw new Error('AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables are required');
    }

    const response = await fetch(`${endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2023-12-01-preview`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parses LLM response into structured comments
   * @param {string} response - Raw LLM response
   * @returns {Array} Parsed comment objects
   */
  parseReviewResponse(response) {
    try {
      // Try to extract JSON from the response
      let jsonText = response.trim();
      
      // Handle cases where the response is wrapped in code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      // Parse the JSON
      const comments = JSON.parse(jsonText);
      
      if (!Array.isArray(comments)) {
        throw new Error('Response is not an array');
      }

      // Validate and filter comments
      return comments
        .filter(comment => this.validateComment(comment))
        .slice(0, this.config.review.maxComments); // Respect max comments limit

    } catch (error) {
      console.warn('Failed to parse LLM response as JSON:', error.message);
      console.warn('Raw response:', response);
      
      // Fallback: try to extract comments from text format
      return this.extractCommentsFromText(response);
    }
  }

  /**
   * Validates a comment object
   * @param {object} comment - Comment to validate
   * @returns {boolean} True if valid
   */
  validateComment(comment) {
    const required = ['filename', 'line', 'severity', 'category', 'message'];
    return required.every(field => comment[field] !== undefined && comment[field] !== null);
  }

  /**
   * Fallback method to extract comments from text response
   * @param {string} response - Text response
   * @returns {Array} Extracted comments
   */
  extractCommentsFromText(response) {
    // This is a simple fallback - in practice, you might want more sophisticated parsing
    const comments = [];
    const lines = response.split('\n');
    
    let currentComment = null;
    
    for (const line of lines) {
      if (line.includes('filename:') || line.includes('File:')) {
        if (currentComment) {
          comments.push(currentComment);
        }
        currentComment = {
          filename: line.split(':')[1]?.trim() || '',
          line: 1,
          severity: 'medium',
          category: 'general',
          message: '',
          suggestion: ''
        };
      } else if (line.includes('line:') && currentComment) {
        const lineMatch = line.match(/line:?\s*(\d+)/i);
        if (lineMatch) {
          currentComment.line = parseInt(lineMatch[1]);
        }
      } else if (line.trim() && currentComment) {
        currentComment.message += line.trim() + ' ';
      }
    }
    
    if (currentComment) {
      comments.push(currentComment);
    }
    
    return comments.slice(0, this.config.review.maxComments);
  }
}
