---
name: conversation-memory-zh
description: >
  对话记忆管理。当用户说"保存记忆"、"记住这次对话"、"存一下"、"保存对话"、"找找之前的讨论"时触发。
  活跃记忆关键词：（无活跃记忆）
---

# 对话记忆技能

将对话上下文保存为可召回的记忆文件，实现对话的持久化和自动召回。

## 活跃记忆

查看 `../../data/conversation-memory-zh/memories/index.md` 获取活跃记忆索引表。

> 注意：记忆数据存储在 `.claude/data/conversation-memory-zh/` 目录下，与技能代码分离。

## 触发场景

### 保存记忆

当用户说以下话语时触发保存：

- "保存记忆"
- "记住这次对话"
- "存一下"
- "保存对话"
- "保存上下文"

### 召回记忆

- 对话中涉及某主题时，根据索引表找到相关记忆
- 用户说"找找之前关于xxx的讨论"时，搜索记忆

## 保存流程

当触发保存时，执行以下步骤：

### 1. 生成记忆名称

格式：`mem-{YYYYMMDD}-{HHMMSS}`

### 2. 提取关键信息

从当前对话中提取：

1. **主题**：用一句话概括对话主题
2. **关键词**：提取 3-8 个用于召回匹配的关键词
3. **关键决策**：对话中做出的重要决定
4. **重要结论**：得出的结论或成果
5. **相关文件**：涉及的代码/文档路径

### 3. 创建记忆文件

调用脚本创建记忆目录和文件：

```bash
node scripts/save_memory.js [memory-name]
```

脚本会在 `memories/active/` 下创建：

```
mem-{timestamp}/
├── summary.md      # 摘要
└── conversation.md # 原始对话
```

### 4. 编写记忆内容

参照模板填写：
- summary.md：参考 [summary_template.md](references/summary_template.md)
- conversation.md：参考 [conversation_template.md](references/conversation_template.md)

### 5. 更新索引

保存完成后，脚本会自动更新索引。也可手动运行：

```bash
node scripts/update_index.js
```

这会更新 `.claude/data/conversation-memory-zh/memories/index.md` 索引表和本文件 description 中的关键词。

## 召回机制

### 四层加载机制

```
第 0 层：description 中的关键词列表                                 → 始终加载
第 1 层：.claude/data/conversation-memory-zh/memories/index.md     → 匹配后读取
第 2 层：记忆的 summary.md                                          → 按需读取
第 3 层：记忆的 conversation.md                                     → 溯源时读取
```

### 召回流程

1. 根据 description 中的关键词判断是否相关
2. 读取 `.claude/data/conversation-memory-zh/memories/index.md` 查看索引表
3. 读取对应记忆的 `summary.md` 了解详情
4. 如需更多细节，读取 `conversation.md`

### 主动搜索

用户说"找找之前关于xxx的讨论"时：

```bash
node scripts/activate_memory.js --search <keyword>
```

## 激活机制

当归档记忆被召回时，需要激活：

```bash
node scripts/activate_memory.js <memory-name>
```

激活操作：
- 将记忆从 `.claude/data/conversation-memory-zh/memories/archive/` 移回 `active/`
- 自动更新索引

## 归档机制

### 自动归档规则

- 超过 14 天未激活的记忆会被归档
- 保持 active/ 数量 <= 20 个
- 归档的记忆不在索引中，但可以被搜索和激活

### 执行归档

```bash
node scripts/archive_old_memories.js
```

归档后会自动更新索引。

## 存储位置

技能代码和数据分离存储：

```
.claude/
├── skills/conversation-memory-zh/    # 技能代码（本目录）
│   ├── SKILL.md                      # 本文件（技能定义）
│   ├── scripts/                      # 管理脚本
│   │   ├── paths.js                  # 路径解析工具
│   │   ├── save_memory.js            # 保存记忆
│   │   ├── activate_memory.js        # 激活记忆
│   │   ├── archive_old_memories.js   # 归档记忆
│   │   └── update_index.js           # 更新索引
│   └── references/                   # 模板文件
│       ├── summary_template.md
│       └── conversation_template.md
│
└── data/conversation-memory-zh/      # 数据目录（与技能分离）
    └── memories/                     # 记忆存储
        ├── index.md                  # 活跃记忆索引
        ├── active/                   # 活跃记忆
        │   └── mem-xxx/
        │       ├── summary.md
        │       └── conversation.md
        └── archive/                  # 归档记忆
```

> 这种分离设计便于技能迁移和升级，数据不会随技能代码一起被覆盖。

## 注意事项

1. **接受冗余**：同一主题多次保存没关系，更多召回入口
2. **自动提取**：关键信息由 Claude 自动提取，无需用户确认
3. **渐进加载**：先查索引，再读摘要，最后看原始对话
4. **用进废退**：常用记忆保持活跃，不常用的自然归档
5. **索引同步**：每次保存、激活、归档后都要更新索引
