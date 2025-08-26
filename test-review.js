#!/usr/bin/env node

import { ReviewService } from './src/services/reviewService.js';
import process from 'process';

/**
 * Test script to validate the code review system
 */
async function testReview() {
  console.log('🧪 Testing AI Code Review System...\n');

  // Sample diff text for testing
  const sampleDiff = `diff --git a/src/components/UserForm.jsx b/src/components/UserForm.jsx
new file mode 100644
index 0000000..123456789
--- /dev/null
+++ b/src/components/UserForm.jsx
@@ -0,0 +1,25 @@
+import React, { useState } from 'react';
+
+function UserForm() {
+  const [user, setUser] = useState({});
+  
+  const handleSubmit = async (e) => {
+    e.preventDefault();
+    console.log('Submitting user:', user);
+    
+    // No error handling - this is a potential issue
+    const response = await fetch('/api/users', {
+      method: 'POST',
+      body: JSON.stringify(user)
+    });
+    
+    const data = await response.json();
+    alert('User created: ' + data.id);
+  };
+  
+  return (
+    <form onSubmit={handleSubmit}>
+      <input onChange={(e) => setUser({...user, name: e.target.value})} />
+      <button type="submit">Submit</button>
+    </form>
+  );
+}
+
+export default UserForm;`;

  try {
    // Set test environment variables
    process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'test-token';
    process.env.REPO_OWNER = process.env.REPO_OWNER || 'test-owner';
    process.env.REPO_NAME = process.env.REPO_NAME || 'test-repo';
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';

    // Initialize review service
    const reviewService = new ReviewService();
    
    // Test configuration loading
    console.log('📝 Testing configuration loading...');
    await reviewService.initialize();
    console.log('✅ Configuration loaded successfully\n');

    // Test diff parsing
    console.log('📄 Testing diff parsing...');
    const { parseDiff } = await import('./src/utils/diffParser.js');
    const parsedFiles = parseDiff(sampleDiff);
    console.log(`✅ Parsed ${parsedFiles.length} files from diff`);
    console.log(`   - ${parsedFiles[0]?.filename || 'No files'}`);
    console.log(`   - Additions: ${parsedFiles[0]?.additions || 0}`);
    console.log(`   - Deletions: ${parsedFiles[0]?.deletions || 0}\n`);

    // Test custom rule checking
    console.log('📋 Testing custom rules...');
    const { checkCustomRules } = await import('./src/utils/diffParser.js');
    const customRules = [
      {
        name: 'no-console-log',
        pattern: 'console\\.log\\(',
        message: 'Avoid console.log in production code',
        severity: 'low'
      },
      {
        name: 'require-error-handling',
        pattern: 'fetch\\(.*\\)(?!.*catch)',
        message: 'API calls should include error handling',
        severity: 'high'
      }
    ];
    
    if (parsedFiles.length > 0) {
      const violations = checkCustomRules(parsedFiles[0], customRules);
      console.log(`✅ Found ${violations.length} custom rule violations:`);
      violations.forEach(v => console.log(`   - ${v.rule}: ${v.message}`));
    }
    console.log();

    // Test LLM service initialization (without actual API call)
    console.log('🤖 Testing LLM service...');
    const { LLMService } = await import('./src/services/llmService.js');
    const llmService = new LLMService(reviewService.config);
    console.log(`✅ LLM service initialized with ${llmService.provider} provider\n`);

    // Test GitHub API initialization (without actual API call)
    console.log('🐙 Testing GitHub API client...');
    const { GitHubAPI } = await import('./src/utils/githubAPI.js');
    new GitHubAPI('test-token', 'test-owner', 'test-repo');
    console.log('✅ GitHub API client initialized\n');

    console.log('🎉 All tests passed! The code review system is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('1. Set up GitHub secrets (GITHUB_TOKEN, OPENAI_API_KEY)');
    console.log('2. Customize .llmreviewrc.json for your project');
    console.log('3. Create a pull request to test the system');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testReview();
}

export { testReview };
