#!/usr/bin/env node

/**
 * paths.js - Path resolution utility module
 * 
 * Provides unified path resolution, separating data directory from skill directory to .claude/data/
 * 
 * Directory structure:
 *   workdir/
 *   ├── .claude/
 *   │   ├── skills/conversation-memory/  # Skill code
 *   │   │   └── scripts/                 # Scripts directory (this module's location)
 *   │   └── data/conversation-memory/    # Data directory
 *   │       └── memories/                # Memory storage
 *   │           ├── index.md
 *   │           ├── active/
 *   │           └── archive/
 */

const fs = require('fs');
const path = require('path');

// Skill name
const SKILL_NAME = 'conversation-memory';

/**
 * Find .claude directory by traversing up
 * @param {string} startDir - Starting directory, defaults to current script directory
 * @returns {string|null} Path to .claude directory, null if not found
 */
function findClaudeRoot(startDir = __dirname) {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    const claudeDir = path.join(currentDir, '.claude');
    if (fs.existsSync(claudeDir) && fs.statSync(claudeDir).isDirectory()) {
      return claudeDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

/**
 * Get workspace root path
 * @returns {string} Workspace directory path
 * @throws {Error} If .claude directory not found
 */
function getWorkDir() {
  const claudeRoot = findClaudeRoot();
  if (!claudeRoot) {
    throw new Error('Cannot find .claude directory, ensure running in correct workspace');
  }
  return path.dirname(claudeRoot);
}

/**
 * Get skill directory path
 * @returns {string} Skill directory path
 */
function getSkillDir() {
  const claudeRoot = findClaudeRoot();
  if (!claudeRoot) {
    throw new Error('Cannot find .claude directory');
  }
  return path.join(claudeRoot, 'skills', SKILL_NAME);
}

/**
 * Get data directory path
 * @returns {string} Data directory path (.claude/data/conversation-memory/)
 */
function getDataDir() {
  const claudeRoot = findClaudeRoot();
  if (!claudeRoot) {
    throw new Error('Cannot find .claude directory');
  }
  return path.join(claudeRoot, 'data', SKILL_NAME);
}

/**
 * Get memories directory path
 * @returns {string} Memories directory path (.claude/data/conversation-memory/memories/)
 */
function getMemoriesDir() {
  return path.join(getDataDir(), 'memories');
}

/**
 * Get active memories directory path
 * @returns {string} Active memories directory path
 */
function getActiveDir() {
  return path.join(getMemoriesDir(), 'active');
}

/**
 * Get archive memories directory path
 * @returns {string} Archive memories directory path
 */
function getArchiveDir() {
  return path.join(getMemoriesDir(), 'archive');
}

/**
 * Get index file path
 * @returns {string} Index file path
 */
function getIndexFile() {
  return path.join(getMemoriesDir(), 'index.md');
}

/**
 * Get SKILL.md file path
 * @returns {string} SKILL.md file path
 */
function getSkillFile() {
  return path.join(getSkillDir(), 'SKILL.md');
}

/**
 * Ensure data directory exists
 * Creates complete directory structure: memories/active/, memories/archive/
 */
function ensureDataDir() {
  const dirs = [
    getMemoriesDir(),
    getActiveDir(),
    getArchiveDir()
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Ensure index.md exists
  const indexFile = getIndexFile();
  if (!fs.existsSync(indexFile)) {
    const initialContent = `# Active Memory Index

> This file is auto-updated by scripts, recording summary info of all active memories.

## Index Table

<!-- INDEX_START -->
| Memory ID | Topic | Keywords | Time |
|-----------|-------|----------|------|
| (no active memories) | - | - | - |
<!-- INDEX_END -->

## Keywords Summary

<!-- KEYWORDS_START -->
(no valid keywords)
<!-- KEYWORDS_END -->

## Usage

1. Find related memories from the index table
2. Read the memory's \`active/{MemoryID}/summary.md\` for details
3. If needed, read \`active/{MemoryID}/conversation.md\` for raw conversation
`;
    fs.writeFileSync(indexFile, initialContent, 'utf8');
  }
}

/**
 * Get config object (compatible with existing script CONFIG structure)
 * @returns {Object} Config object
 */
function getConfig() {
  return {
    skillDir: getSkillDir(),
    memoriesDir: getMemoriesDir(),
    skillFile: getSkillFile(),
    indexFile: getIndexFile(),
    activeDir: 'active',
    archiveDir: 'archive',
    maxActiveMemories: 20,
    archiveAfterDays: 14
  };
}

module.exports = {
  SKILL_NAME,
  findClaudeRoot,
  getWorkDir,
  getSkillDir,
  getDataDir,
  getMemoriesDir,
  getActiveDir,
  getArchiveDir,
  getIndexFile,
  getSkillFile,
  ensureDataDir,
  getConfig
};
