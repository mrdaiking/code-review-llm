#!/usr/bin/env node

import { ReviewService } from './reviewService.js';
import process from 'process';

/**
 * Main entry point for the review runner
 * Called by GitHub Actions to perform code review
 */
async function runReview() {
  console.log('🚀 Starting AI Code Review...');
  
  try {
    // Get environment variables
    const prNumber = process.env.PR_NUMBER;
    const diffText = process.env.PR_DIFF;

    if (!prNumber) {
      throw new Error('PR_NUMBER environment variable is required');
    }

    if (!diffText || diffText.trim() === '') {
      console.log('⏭️  No diff provided, skipping review');
      process.exit(0);
    }

    // Initialize review service
    const reviewService = new ReviewService();
    await reviewService.initialize();

    // Run the review
    const results = await reviewService.reviewPullRequest(parseInt(prNumber), diffText);

    // Output results for GitHub Actions
    if (results.skipped) {
      console.log(`⏭️  Review skipped: ${results.reason}`);
    } else {
      console.log('📊 Review Results:');
      console.log(`   Files reviewed: ${results.filesReviewed}`);
      console.log(`   Comments generated: ${results.commentsGenerated}`);
      console.log(`   Comments posted: ${results.commentsPosted}`);
      console.log(`   Comments skipped: ${results.commentsSkipped}`);
      console.log(`   Custom rule violations: ${results.customRuleViolations}`);

      // Set GitHub Actions output
      if (process.env.GITHUB_ACTIONS) {
        console.log(`::set-output name=files-reviewed::${results.filesReviewed}`);
        console.log(`::set-output name=comments-posted::${results.commentsPosted}`);
        console.log(`::set-output name=comments-skipped::${results.commentsSkipped}`);
      }
    }

    console.log('✅ Review completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Review failed:', error.message);
    
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    // Set GitHub Actions output for failure
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=error::${error.message}`);
      console.log('::error::AI Code Review failed');
    }

    process.exit(1);
  }
}

// Run the review if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runReview();
}

export { runReview };
