# AI-Powered Code Review System

An intelligent code review system that automatically analyzes pull requests using Large Language Models (LLMs) and provides constructive feedback directly on GitHub.

## 🏗️ Architecture

The system follows this flow:

```
GitHub PR opened/updated
        ↓
 GitHub Action triggers
        ↓
 Collect PR diff
        ↓
 Review Service
    - Loads user config (.llmreviewrc.json)
    - Builds review prompt
        • General guidelines (bugs, readability, best practices)
        • Custom rules (from config)
    - Calls LLM API
        ↓
 Parse output into structured comments
        ↓
 GitHub API posts review
```

## 🚀 Features

- **Multi-LLM Support**: Works with OpenAI GPT, Anthropic Claude, and Azure OpenAI
- **Configurable Rules**: Customize review focus areas and rules via `.llmreviewrc.json`
- **Smart Filtering**: Excludes test files, build artifacts, and other configured patterns
- **Custom Rules Engine**: Define regex-based rules for project-specific requirements
- **GitHub Integration**: Posts comments directly to pull requests with structured feedback
- **Duplicate Prevention**: Avoids posting multiple comments on the same line
- **Rate Limiting**: Respects GitHub API limits with built-in delays

## 📋 Setup

### 1. Environment Variables

Add these secrets to your GitHub repository:

```bash
# Required
GITHUB_TOKEN=your_github_token_with_pr_permissions
OPENAI_API_KEY=your_openai_api_key  # Or other LLM provider key

# For Azure OpenAI (if using)
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint

# For Anthropic (if using)
ANTHROPIC_API_KEY=your_anthropic_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

Create a `.llmreviewrc.json` file in your repository root:

```json
{
  "enabled": true,
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.1,
    "maxTokens": 2000
  },
  "review": {
    "focusAreas": [
      "bugs",
      "security", 
      "readability",
      "best-practices"
    ],
    "severity": "medium",
    "maxComments": 10,
    "excludePatterns": [
      "*.test.js",
      "*.spec.js",
      "node_modules/**",
      "dist/**",
      "build/**"
    ]
  },
  "rules": {
    "custom": [
      {
        "name": "no-console-log",
        "description": "Avoid console.log in production code",
        "pattern": "console\\.log\\(",
        "message": "Consider using a proper logging library instead of console.log",
        "severity": "low"
      }
    ]
  }
}
```

### 4. GitHub Action

The system includes a GitHub Action workflow (`.github/workflows/code-review.yml`) that:
- Triggers on PR events (opened, synchronize, reopened)
- Collects the PR diff
- Runs the AI review
- Posts comments back to the PR

## 🔧 Configuration Options

### LLM Providers

#### OpenAI
```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4", // or "gpt-3.5-turbo"
    "temperature": 0.1,
    "maxTokens": 2000
  }
}
```

#### Anthropic Claude
```json
{
  "llm": {
    "provider": "anthropic", 
    "model": "claude-3-sonnet-20240229",
    "temperature": 0.1,
    "maxTokens": 2000
  }
}
```

#### Azure OpenAI
```json
{
  "llm": {
    "provider": "azure",
    "model": "your-deployment-name",
    "temperature": 0.1,
    "maxTokens": 2000
  }
}
```

### Review Focus Areas

- `bugs`: Logic errors, null checks, edge cases
- `security`: Security vulnerabilities, data validation
- `performance`: Performance optimizations, inefficient code
- `readability`: Code clarity, naming conventions
- `maintainability`: Code structure, modularity
- `best-practices`: Language/framework best practices
- `testing`: Test coverage, test quality
- `documentation`: Code documentation, comments

### Custom Rules

Define regex-based rules for project-specific requirements:

```json
{
  "rules": {
    "custom": [
      {
        "name": "require-error-handling",
        "description": "API calls should have error handling",
        "pattern": "fetch\\(.*\\)(?!.*catch)",
        "message": "API calls should include proper error handling with .catch() or try/catch",
        "severity": "high"
      },
      {
        "name": "react-key-prop",
        "description": "React list items should have key prop",
        "pattern": "\\.map\\(.*=>.*<(?!.*key=)",
        "message": "List items should have a unique 'key' prop",
        "severity": "medium"
      }
    ]
  }
}
```

## 🎯 Usage

### Automatic (Recommended)

The system runs automatically on every PR when the GitHub Action is set up.

### Manual

You can also run reviews manually:

```bash
# Set environment variables
export GITHUB_TOKEN=your_token
export REPO_OWNER=your_username
export REPO_NAME=your_repo
export PR_NUMBER=123
export PR_DIFF="$(git diff main...feature-branch)"
export OPENAI_API_KEY=your_openai_key

# Run review
npm run review
```

## 📊 Output

The system provides:

1. **Inline Comments**: Posted directly on relevant lines in the PR
2. **Review Summary**: Overview comment with statistics and categorization
3. **GitHub Actions Output**: Metrics for CI/CD integration

### Comment Format

Comments include:
- Severity indicator (🚨 High, ⚠️ Medium, 💡 Low)
- Category icon and label
- Detailed explanation
- Code suggestions (when applicable)
- AI attribution

### Example Comment

```
⚠️ **security** 🔒

This API endpoint doesn't validate user input, which could lead to injection attacks. Consider adding input validation before processing the request.

**Suggestion:**
```javascript
const { error, value } = userInputSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

---
*Generated by AI Code Review* • Severity: `medium`
```

## 🔍 File Structure

```
src/
├── config/
│   └── configLoader.js          # Configuration loading and validation
├── services/
│   ├── llmService.js           # LLM provider abstraction
│   ├── reviewService.js        # Main review orchestration
│   └── reviewRunner.js         # CLI entry point
└── utils/
    ├── diffParser.js           # Git diff parsing utilities
    └── githubAPI.js            # GitHub API client

.github/workflows/
└── code-review.yml             # GitHub Action workflow

.llmreviewrc.json              # User configuration
.llmreviewrc.schema.json       # Configuration schema
```

## 🛠️ Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Create a test configuration
5. Run manual reviews on sample diffs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For issues and questions:
1. Check the configuration documentation
2. Review GitHub Action logs
3. Open an issue with reproduction steps

## 🔮 Roadmap

- [ ] Support for more LLM providers (Google PaLM, Cohere)
- [ ] Integration with other Git platforms (GitLab, Bitbucket)
- [ ] Web dashboard for review analytics
- [ ] Machine learning-based rule suggestions
- [ ] Team-specific review templates
