#!/usr/bin/env node

/**
 * activate_memory.js - 激活归档的记忆
 * 
 * 用法：
 *   node activate_memory.js <memory-name>
 *   node activate_memory.js --list          # 列出所有归档记忆
 *   node activate_memory.js --search <keyword>  # 搜索记忆
 * 
 * 功能：
 *   1. 将记忆从 archive/ 移回 active/
 *   2. 更新主技能索引
 *   3. 支持列出和搜索归档记忆
 */

const fs = require('fs');
const path = require('path');
const { getConfig, ensureDataDir } = require('./paths');

// Configuration (from paths.js)
const CONFIG = getConfig();

/**
 * 格式化日期时间
 */
function formatDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 读取记忆信息
 */
function getMemoryInfo(memoryPath) {
  const summaryPath = path.join(memoryPath, 'summary.md');
  
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  
  const content = fs.readFileSync(summaryPath, 'utf8');
  
  // 提取主题
  const titleMatch = content.match(/^# 对话记忆：(.+)$/m);
  const topic = titleMatch ? titleMatch[1].trim() : '未知主题';
  
  // 提取关键词
  const keywordsMatch = content.match(/\*\*关键词\*\*：(.+)$/m);
  const keywords = keywordsMatch ? keywordsMatch[1].trim() : '';
  
  return { topic, keywords };
}

/**
 * 获取记忆列表
 */
function getMemories(dir) {
  const fullDir = path.join(CONFIG.memoriesDir, dir);
  
  if (!fs.existsSync(fullDir)) {
    return [];
  }
  
  return fs.readdirSync(fullDir)
    .filter(name => name.startsWith('mem-'))
    .map(name => {
      const memoryPath = path.join(fullDir, name);
      const stat = fs.statSync(memoryPath);
      const info = getMemoryInfo(memoryPath);
      
      return {
        name,
        path: memoryPath,
        mtime: stat.mtime,
        topic: info ? info.topic : '未知',
        keywords: info ? info.keywords : ''
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

/**
 * 列出归档记忆
 */
function listArchivedMemories() {
  const memories = getMemories(CONFIG.archiveDir);
  
  if (memories.length === 0) {
    console.log('归档中没有记忆');
    return;
  }
  
  console.log(`归档记忆列表 (共 ${memories.length} 个)：\n`);
  
  memories.forEach((mem, index) => {
    console.log(`${index + 1}. ${mem.name}`);
    console.log(`   主题：${mem.topic}`);
    console.log(`   修改时间：${formatDateTime(mem.mtime)}`);
    if (mem.keywords) {
      const kw = mem.keywords.length > 50 
        ? mem.keywords.substring(0, 50) + '...' 
        : mem.keywords;
      console.log(`   关键词：${kw}`);
    }
    console.log('');
  });
}

/**
 * 搜索记忆
 */
function searchMemories(keyword) {
  const activeMemories = getMemories(CONFIG.activeDir);
  const archiveMemories = getMemories(CONFIG.archiveDir);
  const allMemories = [
    ...activeMemories.map(m => ({ ...m, location: 'active' })),
    ...archiveMemories.map(m => ({ ...m, location: 'archive' }))
  ];
  
  const keywordLower = keyword.toLowerCase();
  const results = allMemories.filter(mem => {
    // 搜索名称
    if (mem.name.toLowerCase().includes(keywordLower)) {
      return true;
    }
    // 搜索主题
    if (mem.topic && mem.topic.toLowerCase().includes(keywordLower)) {
      return true;
    }
    // 搜索关键词
    if (mem.keywords && mem.keywords.toLowerCase().includes(keywordLower)) {
      return true;
    }
    // 搜索原始对话内容
    const conversationPath = path.join(mem.path, 'conversation.md');
    if (fs.existsSync(conversationPath)) {
      const content = fs.readFileSync(conversationPath, 'utf8');
      if (content.toLowerCase().includes(keywordLower)) {
        return true;
      }
    }
    return false;
  });
  
  if (results.length === 0) {
    console.log(`未找到包含 "${keyword}" 的记忆`);
    return;
  }
  
  console.log(`搜索结果 (共 ${results.length} 个)：\n`);
  
  results.forEach((mem, index) => {
    const locationLabel = mem.location === 'active' ? '[活跃]' : '[归档]';
    console.log(`${index + 1}. ${locationLabel} ${mem.name}`);
    console.log(`   主题：${mem.topic}`);
    if (mem.keywords) {
      const kw = mem.keywords.length > 50 
        ? mem.keywords.substring(0, 50) + '...' 
        : mem.keywords;
      console.log(`   关键词：${kw}`);
    }
    console.log('');
  });
}

/**
 * 更新主技能索引
 */
function updateIndex() {
  try {
    const updateIndexModule = require('./update_index.js');
    console.log('');
    updateIndexModule.main();
  } catch (err) {
    console.log('');
    console.log('提示：请手动运行索引更新：');
    console.log('  node scripts/update_index.js');
  }
}

/**
 * 激活记忆
 */
function activateMemory(memoryName) {
  // Ensure data directory structure exists
  ensureDataDir();
  
  const archivePath = path.join(CONFIG.memoriesDir, CONFIG.archiveDir, memoryName);
  const activePath = path.join(CONFIG.memoriesDir, CONFIG.activeDir, memoryName);
  
  // 检查记忆是否在归档中
  if (!fs.existsSync(archivePath)) {
    // 检查是否已经在活跃目录
    if (fs.existsSync(activePath)) {
      console.log(`记忆 ${memoryName} 已经是活跃状态`);
      return;
    }
    
    console.error(`错误：未找到记忆 ${memoryName}`);
    console.log('');
    console.log('提示：使用以下命令查看归档记忆：');
    console.log('  node scripts/activate_memory.js --list');
    process.exit(1);
  }
  
  // 确保活跃目录存在
  const activeDir = path.join(CONFIG.memoriesDir, CONFIG.activeDir);
  if (!fs.existsSync(activeDir)) {
    fs.mkdirSync(activeDir, { recursive: true });
  }
  
  // 移动记忆到活跃目录
  fs.renameSync(archivePath, activePath);
  
  console.log(`✓ 记忆已激活：${memoryName}`);
  console.log(`  从：${archivePath}`);
  console.log(`  到：${activePath}`);
  
  // 显示记忆信息
  const info = getMemoryInfo(activePath);
  if (info) {
    console.log(`  主题：${info.topic}`);
  }
  
  // 更新索引
  updateIndex();
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log('activate_memory.js - 激活归档的记忆');
  console.log('');
  console.log('用法：');
  console.log('  node activate_memory.js <memory-name>     激活指定记忆');
  console.log('  node activate_memory.js --list            列出所有归档记忆');
  console.log('  node activate_memory.js --search <keyword> 搜索记忆');
  console.log('  node activate_memory.js --help            显示帮助');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    showHelp();
    return;
  }
  
  if (args[0] === '--list') {
    listArchivedMemories();
    return;
  }
  
  if (args[0] === '--search') {
    if (!args[1]) {
      console.error('错误：请提供搜索关键词');
      process.exit(1);
    }
    searchMemories(args[1]);
    return;
  }
  
  activateMemory(args[0]);
}

main();
