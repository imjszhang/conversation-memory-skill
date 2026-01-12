#!/usr/bin/env node

/**
 * save_memory.js - 创建新的对话记忆
 * 
 * 用法：
 *   node save_memory.js [memory-name]
 * 
 * 如果不提供 memory-name，将自动生成基于时间戳的名称
 * 
 * 功能：
 *   1. 在 memories/active/ 下创建记忆目录
 *   2. 生成 summary.md 和 conversation.md 的模板文件
 *   3. 更新主技能索引
 *   4. 检查并提示归档（如果活跃记忆超过限制）
 */

const fs = require('fs');
const path = require('path');
const { getConfig, ensureDataDir } = require('./paths');

// Configuration (from paths.js)
const CONFIG = getConfig();

/**
 * 生成记忆名称
 * 格式：mem-YYYYMMDD-HHMMSS
 */
function generateMemoryName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `mem-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

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
 * 生成 summary.md 模板内容
 */
function generateSummaryTemplate(memoryName) {
  const now = formatDateTime();
  
  return `# 对话记忆：{主题标题}

## 元信息

- **时间**：${now}
- **持续**：约 {N} 分钟
- **对话轮次**：{N} 轮
- **关键词**：{关键词1}, {关键词2}, {关键词3}

## 主题摘要

{用 1-2 段话概括这次对话的主题和背景}

## 关键决策

1. {决策1}
2. {决策2}
3. ...

## 重要结论

- {结论1}
- {结论2}
- ...

## 待办事项

- [ ] {待办1}
- [ ] {待办2}
- ...

## 相关文件

- \`{文件路径1}\` - {简要说明}
- \`{文件路径2}\` - {简要说明}
- ...

## 溯源

如需查看完整原始对话，请参阅 [conversation.md](conversation.md)
`;
}

/**
 * 生成 conversation.md 模板内容
 */
function generateConversationTemplate() {
  const now = new Date();
  const timeStr = formatDateTime(now);
  const timeWithSeconds = `${timeStr}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  return `# 原始对话记录

## 对话信息

- **开始时间**：${timeWithSeconds}
- **结束时间**：{YYYY-MM-DD HH:MM:SS}
- **对话轮次**：{N} 轮

---

## 对话内容

### 用户 [{HH:MM:SS}]

{用户的第一条消息}

---

### Claude [{HH:MM:SS}]

{Claude 的第一条回复}

---

{继续记录所有对话轮次...}
`;
}

/**
 * 创建记忆目录和文件
 */
function createMemory(memoryName) {
  // Ensure data directory structure exists
  ensureDataDir();
  
  const activeDir = path.join(CONFIG.memoriesDir, CONFIG.activeDir);
  const memoryDir = path.join(activeDir, memoryName);
  
  // 检查记忆是否已存在
  if (fs.existsSync(memoryDir)) {
    console.error(`错误：记忆 ${memoryName} 已存在`);
    process.exit(1);
  }
  
  // 创建目录
  fs.mkdirSync(memoryDir, { recursive: true });
  
  // 创建 summary.md
  const summaryContent = generateSummaryTemplate(memoryName);
  fs.writeFileSync(path.join(memoryDir, 'summary.md'), summaryContent, 'utf8');
  
  // 创建 conversation.md
  const conversationContent = generateConversationTemplate();
  fs.writeFileSync(path.join(memoryDir, 'conversation.md'), conversationContent, 'utf8');
  
  console.log(`✓ 记忆创建成功：${memoryName}`);
  console.log(`  路径：${memoryDir}`);
  console.log('');
  console.log('请编辑以下文件完成记忆保存：');
  console.log(`  1. ${path.join(memoryDir, 'summary.md')} - 填写摘要信息`);
  console.log(`  2. ${path.join(memoryDir, 'conversation.md')} - 填写原始对话`);
  
  return memoryDir;
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
      return {
        name,
        path: memoryPath,
        mtime: stat.mtime
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
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
    console.log('提示：记忆已创建，请手动运行索引更新：');
    console.log('  node scripts/update_index.js');
  }
}

/**
 * 检查是否需要归档
 */
function checkAndArchive() {
  const memories = getActiveMemories();
  
  if (memories.length > CONFIG.maxActiveMemories) {
    console.log('');
    console.log(`⚠️ 活跃记忆数量 (${memories.length}) 超过限制 (${CONFIG.maxActiveMemories})，建议执行归档：`);
    console.log('  node scripts/archive_old_memories.js');
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const memoryName = args[0] || generateMemoryName();
  
  // 验证记忆名称格式
  if (!/^mem-\d{8}-\d{6}$/.test(memoryName)) {
    console.warn(`警告：记忆名称 "${memoryName}" 不符合标准格式 (mem-YYYYMMDD-HHMMSS)`);
  }
  
  createMemory(memoryName);
  updateIndex();
  checkAndArchive();
}

main();
