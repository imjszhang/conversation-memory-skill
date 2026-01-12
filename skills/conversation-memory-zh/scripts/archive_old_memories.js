#!/usr/bin/env node

/**
 * archive_old_memories.js - 归档旧记忆
 * 
 * 用法：
 *   node archive_old_memories.js           # 自动归档超期记忆
 *   node archive_old_memories.js --dry-run # 预览将被归档的记忆
 *   node archive_old_memories.js --force   # 强制归档最旧的记忆（即使未超期）
 *   node archive_old_memories.js --stats   # 显示记忆统计信息
 * 
 * 归档规则：
 *   1. 超过 14 天未激活的记忆会被归档
 *   2. 如果活跃记忆超过 20 个，最旧的会被归档
 */

const fs = require('fs');
const path = require('path');
const { getConfig, ensureDataDir } = require('./paths');

// 配置（从 paths.js 获取）
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
 * 获取活跃记忆列表
 */
function getActiveMemories() {
  const activeDir = path.join(CONFIG.memoriesDir, CONFIG.activeDir);
  
  if (!fs.existsSync(activeDir)) {
    return [];
  }
  
  return fs.readdirSync(activeDir)
    .filter(name => name.startsWith('mem-'))
    .map(name => {
      const memoryPath = path.join(activeDir, name);
      const stat = fs.statSync(memoryPath);
      const info = getMemoryInfo(memoryPath);
      const daysSinceModified = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
      
      return {
        name,
        path: memoryPath,
        mtime: stat.mtime,
        daysSinceModified,
        topic: info ? info.topic : '未知',
        keywords: info ? info.keywords : ''
      };
    })
    .sort((a, b) => a.mtime - b.mtime); // 按修改时间升序（最旧的在前）
}

/**
 * 获取归档记忆列表
 */
function getArchivedMemories() {
  const archiveDir = path.join(CONFIG.memoriesDir, CONFIG.archiveDir);
  
  if (!fs.existsSync(archiveDir)) {
    return [];
  }
  
  return fs.readdirSync(archiveDir)
    .filter(name => name.startsWith('mem-'));
}

/**
 * 确定需要归档的记忆
 */
function getMemoriesToArchive(force = false) {
  const memories = getActiveMemories();
  const toArchive = [];
  
  // 规则 1：超过 14 天未修改的记忆
  memories.forEach(mem => {
    if (mem.daysSinceModified > CONFIG.archiveAfterDays) {
      toArchive.push({
        ...mem,
        reason: `超过 ${CONFIG.archiveAfterDays} 天未修改`
      });
    }
  });
  
  // 规则 2：如果活跃记忆超过限制
  const remaining = memories.filter(m => !toArchive.find(a => a.name === m.name));
  if (remaining.length > CONFIG.maxActiveMemories || force) {
    const excess = remaining.length - CONFIG.maxActiveMemories;
    if (excess > 0 || force) {
      const count = force ? 1 : excess;
      // 归档最旧的
      remaining.slice(0, count).forEach(mem => {
        if (!toArchive.find(a => a.name === mem.name)) {
          toArchive.push({
            ...mem,
            reason: force ? '强制归档' : `活跃记忆超过 ${CONFIG.maxActiveMemories} 个限制`
          });
        }
      });
    }
  }
  
  return toArchive;
}

/**
 * 归档记忆
 */
function archiveMemory(memory) {
  // 确保数据目录结构存在
  ensureDataDir();
  
  const archiveDir = path.join(CONFIG.memoriesDir, CONFIG.archiveDir);
  const targetPath = path.join(archiveDir, memory.name);
  
  // 移动记忆到归档目录
  fs.renameSync(memory.path, targetPath);
  
  return targetPath;
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
 * 显示统计信息
 */
function showStats() {
  const activeMemories = getActiveMemories();
  const archivedMemories = getArchivedMemories();
  
  console.log('=== 记忆统计信息 ===\n');
  console.log(`活跃记忆：${activeMemories.length} 个（限制：${CONFIG.maxActiveMemories}）`);
  console.log(`归档记忆：${archivedMemories.length} 个`);
  console.log(`归档阈值：${CONFIG.archiveAfterDays} 天未修改`);
  console.log('');
  
  if (activeMemories.length > 0) {
    console.log('--- 活跃记忆 ---\n');
    activeMemories.forEach((mem, index) => {
      const daysAgo = Math.floor(mem.daysSinceModified);
      const status = daysAgo > CONFIG.archiveAfterDays ? '⚠️ 即将归档' : '✓';
      console.log(`${index + 1}. ${mem.name} ${status}`);
      console.log(`   主题：${mem.topic}`);
      console.log(`   修改时间：${formatDateTime(mem.mtime)} (${daysAgo} 天前)`);
      console.log('');
    });
  }
}

/**
 * 执行归档
 */
function runArchive(dryRun = false, force = false) {
  const toArchive = getMemoriesToArchive(force);
  
  if (toArchive.length === 0) {
    console.log('没有需要归档的记忆');
    return;
  }
  
  console.log(`${dryRun ? '[预览] ' : ''}将归档 ${toArchive.length} 个记忆：\n`);
  
  toArchive.forEach((mem, index) => {
    const daysAgo = Math.floor(mem.daysSinceModified);
    console.log(`${index + 1}. ${mem.name}`);
    console.log(`   主题：${mem.topic}`);
    console.log(`   原因：${mem.reason}`);
    console.log(`   修改时间：${formatDateTime(mem.mtime)} (${daysAgo} 天前)`);
    
    if (!dryRun) {
      const newPath = archiveMemory(mem);
      console.log(`   ✓ 已移动到：${newPath}`);
    }
    console.log('');
  });
  
  if (dryRun) {
    console.log('这是预览模式，未实际执行归档。');
    console.log('要执行归档，请运行：node scripts/archive_old_memories.js');
  } else {
    console.log(`✓ 归档完成，共归档 ${toArchive.length} 个记忆`);
    // 更新索引
    updateIndex();
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log('archive_old_memories.js - 归档旧记忆');
  console.log('');
  console.log('用法：');
  console.log('  node archive_old_memories.js           自动归档超期记忆');
  console.log('  node archive_old_memories.js --dry-run 预览将被归档的记忆');
  console.log('  node archive_old_memories.js --force   强制归档最旧的记忆');
  console.log('  node archive_old_memories.js --stats   显示记忆统计信息');
  console.log('  node archive_old_memories.js --help    显示帮助');
  console.log('');
  console.log('归档规则：');
  console.log(`  - 超过 ${CONFIG.archiveAfterDays} 天未修改的记忆会被归档`);
  console.log(`  - 如果活跃记忆超过 ${CONFIG.maxActiveMemories} 个，最旧的会被归档`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    return;
  }
  
  if (args.includes('--stats')) {
    showStats();
    return;
  }
  
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  
  runArchive(dryRun, force);
}

main();
