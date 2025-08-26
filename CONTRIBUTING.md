# Contributing to AI Code Review System

Thank you for your interest in contributing to the AI Code Review System! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Access to an LLM provider (OpenAI, Anthropic, or Azure OpenAI)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd code-review
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

4. **Run tests**
   ```bash
   npm run test-review
   ```

## 🏗️ Architecture Overview

The system is organized into several key components:

### Core Services
- **ReviewService** (`src/services/reviewService.js`) - Main orchestration logic
- **LLMService** (`src/services/llmService.js`) - LLM provider abstraction
- **ReviewRunner** (`src/services/reviewRunner.js`) - CLI entry point

### Utilities
- **diffParser** (`src/utils/diffParser.js`) - Git diff parsing and analysis
- **githubAPI** (`src/utils/githubAPI.js`) - GitHub API client
- **configLoader** (`src/config/configLoader.js`) - Configuration management

### Configuration
- **Schema** (`.llmreviewrc.schema.json`) - JSON schema for validation
- **Default Config** (`.llmreviewrc.json`) - Default configuration

## 🔧 Development Guidelines

### Code Style

- Use ES6+ features and modules
- Follow JSDoc conventions for documentation
- Use meaningful variable and function names
- Keep functions focused and small
- Handle errors gracefully with proper logging

### Error Handling

Always include proper error handling:

```javascript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error.message);
  throw new Error(`Failed to complete operation: ${error.message}`);
}
```

### Logging

Use consistent logging patterns:

```javascript
console.log('✓ Success message');
console.warn('⚠️  Warning message');
console.error('❌ Error message');
console.log('🔍 Info message with emoji');
```

## 🎯 Common Contribution Areas

### Adding New LLM Providers

1. **Add provider to LLMService**
   ```javascript
   // In src/services/llmService.js
   async callNewProvider(prompt) {
     const apiKey = process.env.NEW_PROVIDER_API_KEY;
     // Implementation here
   }
   ```

2. **Update configuration schema**
   ```json
   // In .llmreviewrc.schema.json
   "provider": {
     "enum": ["openai", "anthropic", "azure", "new-provider"]
   }
   ```

3. **Add environment variables**
   ```bash
   # In .env.example
   NEW_PROVIDER_API_KEY=your_api_key_here
   ```

### Adding Custom Rule Types

1. **Extend the diffParser utility**
   ```javascript
   // In src/utils/diffParser.js
   export function checkNewRuleType(file, rules) {
     // Implementation
   }
   ```

2. **Update configuration schema**
   ```json
   // Add new rule type to schema
   ```

### Improving GitHub Integration

1. **Extend GitHubAPI class**
   ```javascript
   // In src/utils/githubAPI.js
   async newGitHubFeature() {
     // Implementation
   }
   ```

2. **Update ReviewService to use new features**

## 🧪 Testing

### Running Tests

```bash
# Run the built-in test suite
npm run test-review

# Run linting
npm run lint
```

### Testing with Sample Data

Create test diffs and configurations:

```javascript
const sampleDiff = `diff --git a/test.js b/test.js
new file mode 100644
index 0000000..123456789
--- /dev/null
+++ b/test.js
@@ -0,0 +1,10 @@
+function testFunction() {
+  console.log('test');
+  return true;
+}`;

// Test your changes
const parsedFiles = parseDiff(sampleDiff);
```

### Manual Testing

1. **Set up a test repository**
2. **Create test pull requests**
3. **Verify GitHub Action execution**
4. **Check comment formatting and accuracy**

## 📝 Documentation

### Code Documentation

- Use JSDoc for all public functions
- Include parameter types and return values
- Add usage examples for complex functions

```javascript
/**
 * Parses git diff output into structured format
 * @param {string} diffText - Raw git diff output
 * @returns {Array<Object>} Array of file changes with line information
 * @example
 * const files = parseDiff(gitDiffOutput);
 * console.log(files[0].filename); // "src/example.js"
 */
export function parseDiff(diffText) {
  // Implementation
}
```

### README Updates

When adding features:
1. Update the main README.md
2. Add configuration examples
3. Update the feature list
4. Include setup instructions

## 🚨 Security Considerations

### API Keys

- Never commit API keys to the repository
- Use environment variables for all secrets
- Update .env.example when adding new variables

### Input Validation

- Validate all user inputs
- Sanitize data before sending to LLMs
- Check file paths for security issues

### Rate Limiting

- Respect API rate limits
- Add appropriate delays between requests
- Handle rate limit errors gracefully

## 🔄 Pull Request Process

### Before Submitting

1. **Test your changes thoroughly**
2. **Update documentation**
3. **Run linting and fix any issues**
4. **Add tests for new functionality**

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added tests
- [ ] Updated documentation

## Configuration Changes
- [ ] Updated schema
- [ ] Updated example config
- [ ] Backward compatible
```

### Review Process

1. **Automated checks** must pass
2. **Manual review** by maintainers
3. **Testing** on sample repositories
4. **Documentation** review

## 🎨 UI/UX Guidelines

### GitHub Comments

- Use consistent emoji for categorization
- Keep messages concise but informative
- Provide actionable suggestions
- Include code examples when helpful

### Console Output

- Use progress indicators for long operations
- Color code messages by type (success, warning, error)
- Provide clear next steps after completion

## 🌟 Feature Ideas

Looking for contribution ideas? Consider:

- **Web Dashboard**: Review analytics and management
- **IDE Extensions**: VS Code, IntelliJ integration
- **Advanced Rules**: Machine learning-based suggestions
- **Team Features**: Team-specific configurations and reporting
- **Multi-Platform**: GitLab, Bitbucket support
- **Performance**: Caching and optimization improvements

## 💬 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Request Reviews**: Code-specific discussions

### Common Issues

1. **Configuration Problems**: Check schema validation
2. **API Failures**: Verify environment variables
3. **GitHub Action Issues**: Check workflow logs
4. **LLM Errors**: Review API key and rate limits

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

## 🙏 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors graph

Thank you for helping make code reviews better for everyone! 🚀
