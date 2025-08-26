/**
 * Parses git diff output into structured format
 * @param {string} diffText - Raw git diff output
 * @returns {Array} Array of file changes with line information
 */
export function parseDiff(diffText) {
  if (!diffText || diffText.trim() === '') {
    return [];
  }

  const files = [];
  const diffLines = diffText.split('\n');
  let currentFile = null;
  let currentHunk = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];

    // File header (diff --git a/file b/file)
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        files.push(currentFile);
      }
      
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match) {
        currentFile = {
          filename: match[2],
          oldFilename: match[1],
          hunks: [],
          additions: 0,
          deletions: 0,
          changes: []
        };
      }
      continue;
    }

    // Skip index and mode lines
    if (line.startsWith('index ') || line.startsWith('new file mode') || 
        line.startsWith('deleted file mode') || line.startsWith('---') || 
        line.startsWith('+++')) {
      continue;
    }

    // Hunk header (@@ -oldStart,oldLength +newStart,newLength @@)
    if (line.startsWith('@@')) {
      const hunkMatch = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
      if (hunkMatch) {
        currentHunk = {
          oldStart: parseInt(hunkMatch[1]),
          oldLength: parseInt(hunkMatch[2] || '1'),
          newStart: parseInt(hunkMatch[3]),
          newLength: parseInt(hunkMatch[4] || '1'),
          context: hunkMatch[5].trim(),
          lines: []
        };
        
        oldLineNum = currentHunk.oldStart;
        newLineNum = currentHunk.newStart;
        
        if (currentFile) {
          currentFile.hunks.push(currentHunk);
        }
      }
      continue;
    }

    // Content lines
    if (currentFile && currentHunk) {
      const changeType = line.charAt(0);
      const content = line.substring(1);

      const change = {
        type: changeType === '+' ? 'addition' : changeType === '-' ? 'deletion' : 'context',
        content: content,
        oldLineNumber: changeType === '+' ? null : oldLineNum,
        newLineNumber: changeType === '-' ? null : newLineNum
      };

      currentHunk.lines.push(change);
      currentFile.changes.push(change);

      // Update line numbers
      if (changeType === '+') {
        currentFile.additions++;
        newLineNum++;
      } else if (changeType === '-') {
        currentFile.deletions++;
        oldLineNum++;
      } else {
        oldLineNum++;
        newLineNum++;
      }
    }
  }

  // Add the last file
  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

/**
 * Filters files based on exclude patterns
 * @param {Array} files - Array of file objects
 * @param {Array} excludePatterns - Array of glob patterns to exclude
 * @returns {Array} Filtered array of files
 */
export function filterFiles(files, excludePatterns) {
  if (!excludePatterns || excludePatterns.length === 0) {
    return files;
  }

  return files.filter(file => {
    return !excludePatterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(file.filename);
    });
  });
}

/**
 * Extracts added/modified lines from diff files for review
 * @param {Array} files - Array of parsed diff files
 * @returns {Array} Array of reviewable changes
 */
export function extractReviewableChanges(files) {
  const reviewableChanges = [];

  files.forEach(file => {
    const addedLines = file.changes.filter(change => change.type === 'addition');
    
    if (addedLines.length > 0) {
      reviewableChanges.push({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
        addedLines: addedLines,
        content: addedLines.map(line => line.content).join('\n'),
        lineNumbers: addedLines.map(line => line.newLineNumber).filter(Boolean)
      });
    }
  });

  return reviewableChanges;
}

/**
 * Checks if a file matches custom rules
 * @param {object} file - File object from diff
 * @param {Array} customRules - Array of custom rules
 * @returns {Array} Array of rule violations
 */
export function checkCustomRules(file, customRules) {
  const violations = [];

  if (!customRules || customRules.length === 0) {
    return violations;
  }

  const addedContent = file.changes
    .filter(change => change.type === 'addition')
    .map(change => change.content)
    .join('\n');

  customRules.forEach(rule => {
    try {
      const regex = new RegExp(rule.pattern, 'g');
      let match;

      while ((match = regex.exec(addedContent)) !== null) {
        violations.push({
          rule: rule.name,
          message: rule.message,
          severity: rule.severity || 'medium',
          line: findLineNumber(addedContent, match.index),
          match: match[0]
        });
      }
    } catch (error) {
      console.warn(`⚠️  Invalid regex pattern in rule ${rule.name}:`, error.message);
    }
  });

  return violations;
}

/**
 * Helper function to find line number from character index
 * @param {string} content - Content string
 * @param {number} index - Character index
 * @returns {number} Line number (1-based)
 */
function findLineNumber(content, index) {
  const beforeMatch = content.substring(0, index);
  return beforeMatch.split('\n').length;
}
