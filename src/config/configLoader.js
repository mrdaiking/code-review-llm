import fs from 'fs';
import path from 'path';
import process from 'process';

/**
 * Default configuration for LLM code review
 */
const defaultConfig = {
  enabled: true,
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.1,
    maxTokens: 2000
  },
  review: {
    focusAreas: ['bugs', 'security', 'readability', 'best-practices'],
    severity: 'medium',
    maxComments: 10,
    excludePatterns: [
      '*.test.js',
      '*.spec.js',
      'node_modules/**',
      'dist/**',
      'build/**'
    ]
  },
  rules: {
    custom: []
  }
};

/**
 * Loads user configuration from .llmreviewrc.json file
 * @param {string} rootPath - Root path to search for config file
 * @returns {object} Merged configuration object
 */
export function loadConfig(rootPath = process.cwd()) {
  const configPaths = [
    path.join(rootPath, '.llmreviewrc.json'),
    path.join(rootPath, '.llmreview.json'),
    path.join(rootPath, 'llmreview.config.json')
  ];

  let userConfig = {};

  // Try to find and load config file
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        userConfig = JSON.parse(configContent);
        console.log(`✓ Loaded config from ${configPath}`);
        break;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load config from ${configPath}:`, error.message);
    }
  }

  // Deep merge user config with defaults
  return mergeConfig(defaultConfig, userConfig);
}

/**
 * Deep merge two configuration objects
 * @param {object} target - Target object (defaults)
 * @param {object} source - Source object (user config)
 * @returns {object} Merged configuration
 */
function mergeConfig(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeConfig(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Validates configuration object
 * @param {object} config - Configuration to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
export function validateConfig(config) {
  const requiredFields = ['enabled', 'llm', 'review'];
  
  for (const field of requiredFields) {
    if (!(field in config)) {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  if (!config.llm.provider || !config.llm.model) {
    throw new Error('LLM provider and model are required');
  }

  const validProviders = ['openai', 'anthropic', 'azure'];
  if (!validProviders.includes(config.llm.provider)) {
    throw new Error(`Invalid LLM provider: ${config.llm.provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  return true;
}

export { defaultConfig };
