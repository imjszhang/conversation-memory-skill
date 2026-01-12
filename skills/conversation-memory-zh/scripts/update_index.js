#!/usr/bin/env node

/**
 * update_index.js - 更新记忆索引
 * 
 * 用法：
 *   node update_index.js
 * 
 * 功能：
 *   1. 扫描 memories/active/ 目录
 *   2. 读取每个记忆的 summary.md 提取关键词和元信息
 *   3. 更新 memories/index.md 索引文件
 *   4. 更新 SKILL.md 的 description 中的关键词列表
 */

const fs = require('fs');
const path = require('path');
const { getConfig, ensureDataDir } = require('./paths');

// 配置（从 paths.js 获取）
const CONFIG = getConfig();

/**
 * 从 summary.md 中提取元信息
 */
function extractMemoryInfo(summaryPath) {
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  
  const content = fs.readFileSync(summaryPath, 'utf8');
  
  // 提取主题（标题）
  const titleMatch = content.match(/^# 对话记忆：(.+)$/m);
  const topic = titleMatch ? titleMatch[1].trim() : '未知主题';
  
  // 提取关键词
  const keywordsMatch = content.match(/\*\*关键词\*\*：(.+)$/m);
  const keywords = keywordsMatch ? keywordsMatch[1].trim() : '';
  
  // 提取时间
  const timeMatch = content.match(/\*\*时间\*\*：(.+)$/m);
  const time = timeMatch ? timeMatch[1].trim().split(' ')[0] : '';
  
  return {
    topic,
    keywords,
    time
  };
}

/**
 * 获取所有活跃记忆
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
  
  // 按时间降序排序
  memories.sort((a, b) => b.id.localeCompare(a.id));
  
  return memories;
}

/**
 * 生成索引表 Markdown
 */
function generateIndexTable(memories) {
  if (memories.length === 0) {
    return `| 记忆ID | 主题 | 关键词 | 时间 |
|--------|------|--------|------|
| （暂无活跃记忆） | - | - | - |`;
  }
  
  let table = `| 记忆ID | 主题 | 关键词 | 时间 |
|--------|------|--------|------|
`;
  
  for (const mem of memories) {
    // 截断过长的关键词
    const keywords = mem.keywords.length > 30 
      ? mem.keywords.substring(0, 30) + '...' 
      : mem.keywords;
    table += `| ${mem.id} | ${mem.topic} | ${keywords} | ${mem.time} |\n`;
  }
  
  return table.trim();
}

/**
 * 收集所有关键词
 */
function collectAllKeywords(memories) {
  const keywordSet = new Set();
  
  // 过滤掉模板占位符
  const placeholders = ['{关键词1}', '{关键词2}', '{关键词3}'];
  
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
 * 更新 memories/index.md 文件
 */
function updateIndexFile(memories) {
  const indexTable = generateIndexTable(memories);
  const allKeywords = collectAllKeywords(memories);
  const keywordsStr = allKeywords.length > 0 
    ? allKeywords.join(', ')
    : '（暂无有效关键词）';
  
  const content = `# 活跃记忆索引

> 此文件由脚本自动更新，记录所有活跃记忆的摘要信息。

## 索引表

<!-- INDEX_START -->
${indexTable}
<!-- INDEX_END -->

## 关键词汇总

<!-- KEYWORDS_START -->
${keywordsStr}
<!-- KEYWORDS_END -->

## 使用说明

1. 根据索引表找到相关记忆
2. 读取对应记忆的 \`active/{记忆ID}/summary.md\` 了解详情
3. 如需原始对话，读取 \`active/{记忆ID}/conversation.md\`
`;

  fs.writeFileSync(CONFIG.indexFile, content, 'utf8');
}

/**
 * 更新 SKILL.md 的 description 中的关键词
 */
function updateSkillFile(memories) {
  if (!fs.existsSync(CONFIG.skillFile)) {
    console.error('错误：找不到 SKILL.md 文件');
    return;
  }
  
  let content = fs.readFileSync(CONFIG.skillFile, 'utf8');
  
  // 更新 description 中的关键词
  const allKeywords = collectAllKeywords(memories);
  const keywordsStr = allKeywords.length > 0 
    ? allKeywords.slice(0, 15).join(', ')  // 最多 15 个关键词
    : '（无活跃记忆）';
  
  content = content.replace(
    /活跃记忆关键词：.+/,
    `活跃记忆关键词：${keywordsStr}`
  );
  
  fs.writeFileSync(CONFIG.skillFile, content, 'utf8');
}

/**
 * 主函数
 */
function main() {
  console.log('正在更新记忆索引...\n');
  
  // 确保数据目录结构存在
  ensureDataDir();
  
  // 获取活跃记忆
  const memories = getActiveMemories();
  console.log(`找到 ${memories.length} 个活跃记忆`);
  
  // 更新 memories/index.md
  updateIndexFile(memories);
  console.log('✓ 已更新 memories/index.md');
  
  // 更新 SKILL.md 的 description
  updateSkillFile(memories);
  console.log('✓ 已更新 SKILL.md 中的关键词');
  
  const allKeywords = collectAllKeywords(memories);
  console.log(`\n索引更新完成`);
  console.log(`  - 活跃记忆：${memories.length} 个`);
  console.log(`  - 关键词数：${allKeywords.length} 个`);
  
  // 显示索引表
  if (memories.length > 0) {
    console.log('\n活跃记忆列表：');
    memories.forEach((mem, i) => {
      console.log(`  ${i + 1}. ${mem.id} - ${mem.topic}`);
    });
  }
}

// 导出供其他脚本调用
module.exports = { main, getActiveMemories, updateIndexFile, updateSkillFile };

// 如果直接运行此脚本
if (require.main === module) {
  main();
}
