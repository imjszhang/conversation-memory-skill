#!/usr/bin/env node

/**
 * update_index.js - Update memory index
 * 
 * Usage:
 *   node update_index.js
 * 
 * Functions:
 *   1. Scan memories/active/ directory
 *   2. Read each memory's summary.md to extract keywords and metadata
 *   3. Update memories/index.md index file
 *   4. Update keywords in SKILL.md description
 */

const fs = require('fs');
const path = require('path');
const { getConfig, ensureDataDir } = require('./paths');

// Configuration (from paths.js)
const CONFIG = getConfig();

/**
 * Extract metadata from summary.md
 */
function extractMemoryInfo(summaryPath) {
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  
  const content = fs.readFileSync(summaryPath, 'utf8');
  
  // Extract topic (title) - support both English and Chinese formats
  let topic = 'Unknown Topic';
  const titleMatchEn = content.match(/^# Conversation Memory:\s*(.+)$/m);
  const titleMatchZh = content.match(/^# 对话记忆：(.+)$/m);
  if (titleMatchEn) {
    topic = titleMatchEn[1].trim();
  } else if (titleMatchZh) {
    topic = titleMatchZh[1].trim();
  }
  
  // Extract keywords - support both English and Chinese formats
  let keywords = '';
  const keywordsMatchEn = content.match(/\*\*Keywords\*\*:\s*(.+)$/m);
  const keywordsMatchZh = content.match(/\*\*关键词\*\*：(.+)$/m);
  if (keywordsMatchEn) {
    keywords = keywordsMatchEn[1].trim();
  } else if (keywordsMatchZh) {
    keywords = keywordsMatchZh[1].trim();
  }
  
  // Extract time - support both English and Chinese formats
  let time = '';
  const timeMatchEn = content.match(/\*\*Time\*\*:\s*(.+)$/m);
  const timeMatchZh = content.match(/\*\*时间\*\*：(.+)$/m);
  if (timeMatchEn) {
    time = timeMatchEn[1].trim().split(' ')[0];
  } else if (timeMatchZh) {
    time = timeMatchZh[1].trim().split(' ')[0];
  }
  
  return {
    topic,
    keywords,
    time
  };
}

/**
 * Get all active memories
 */
function getActiveMemories() {
  const activeDir = path.join(CONFIG.memoriesDir, CONFIG.activeDir);
  
  if (!fs.existsSync(activeDir)) {
    return [];
  }
  
  const memories = [];
  const dirs = fs.readdirSync(activeDir).filter(name => name.startsWith('mem-'));
  
  for (const dir of dirs) {
    const summaryPath = path.join(activeDir, dir, 'summary.md');
    const info = extractMemoryInfo(summaryPath);
    
    if (info) {
      memories.push({
        id: dir,
        ...info
      });
    }
  }
  
  // Sort by time descending
  memories.sort((a, b) => b.id.localeCompare(a.id));
  
  return memories;
}

/**
 * Generate index table Markdown
 */
function generateIndexTable(memories) {
  if (memories.length === 0) {
    return `| Memory ID | Topic | Keywords | Date |
|-----------|-------|----------|------|
| (No active memories) | - | - | - |`;
  }
  
  let table = `| Memory ID | Topic | Keywords | Date |
|-----------|-------|----------|------|
`;
  
  for (const mem of memories) {
    // Truncate long keywords
    const keywords = mem.keywords.length > 30 
      ? mem.keywords.substring(0, 30) + '...' 
      : mem.keywords;
    table += `| ${mem.id} | ${mem.topic} | ${keywords} | ${mem.time} |\n`;
  }
  
  return table.trim();
}

/**
 * Collect all keywords
 */
function collectAllKeywords(memories) {
  const keywordSet = new Set();
  
  // Template placeholders to filter out (both English and Chinese)
  const placeholders = [
    '{keyword1}', '{keyword2}', '{keyword3}',
    '{关键词1}', '{关键词2}', '{关键词3}'
  ];
  
  for (const mem of memories) {
    if (mem.keywords) {
      const keywords = mem.keywords.split(/[,，]/).map(k => k.trim());
      keywords.forEach(k => {
        if (k && !placeholders.includes(k)) {
          keywordSet.add(k);
        }
      });
    }
  }
  
  return Array.from(keywordSet);
}

/**
 * Update memories/index.md file
 */
function updateIndexFile(memories) {
  const indexTable = generateIndexTable(memories);
  const allKeywords = collectAllKeywords(memories);
  const keywordsStr = allKeywords.length > 0 
    ? allKeywords.join(', ')
    : '(No valid keywords yet)';
  
  const content = `# Active Memory Index

> This file is automatically updated by scripts, recording summary info of all active memories.

## Index Table

<!-- INDEX_START -->
${indexTable}
<!-- INDEX_END -->

## Keywords Summary

<!-- KEYWORDS_START -->
${keywordsStr}
<!-- KEYWORDS_END -->

## Usage

1. Find relevant memory from the index table
2. Read \`active/{memory-id}/summary.md\` for details
3. For raw conversation, read \`active/{memory-id}/conversation.md\`
`;

  fs.writeFileSync(CONFIG.indexFile, content, 'utf8');
}

/**
 * Update keywords in SKILL.md description
 */
function updateSkillFile(memories) {
  if (!fs.existsSync(CONFIG.skillFile)) {
    console.error('Error: SKILL.md file not found');
    return;
  }
  
  let content = fs.readFileSync(CONFIG.skillFile, 'utf8');
  
  // Update keywords in description
  const allKeywords = collectAllKeywords(memories);
  const keywordsStr = allKeywords.length > 0 
    ? allKeywords.slice(0, 15).join(', ')  // Max 15 keywords
    : '(no active memories)';
  
  // Support both English and Chinese formats
  content = content.replace(
    /Active memory keywords:\s*.+/,
    `Active memory keywords: ${keywordsStr}`
  );
  content = content.replace(
    /活跃记忆关键词：.+/,
    `Active memory keywords: ${keywordsStr}`
  );
  
  fs.writeFileSync(CONFIG.skillFile, content, 'utf8');
}

/**
 * Main function
 */
function main() {
  console.log('Updating memory index...\n');
  
  // Ensure data directory structure exists
  ensureDataDir();
  
  // Get active memories
  const memories = getActiveMemories();
  console.log(`Found ${memories.length} active memories`);
  
  // Update memories/index.md
  updateIndexFile(memories);
  console.log('✓ Updated memories/index.md');
  
  // Update SKILL.md description
  updateSkillFile(memories);
  console.log('✓ Updated keywords in SKILL.md');
  
  const allKeywords = collectAllKeywords(memories);
  console.log(`\nIndex update complete`);
  console.log(`  - Active memories: ${memories.length}`);
  console.log(`  - Keywords count: ${allKeywords.length}`);
  
  // Display index table
  if (memories.length > 0) {
    console.log('\nActive memory list:');
    memories.forEach((mem, i) => {
      console.log(`  ${i + 1}. ${mem.id} - ${mem.topic}`);
    });
  }
}

// Export for use by other scripts
module.exports = { main, getActiveMemories, updateIndexFile, updateSkillFile };

// If running directly
if (require.main === module) {
  main();
}
