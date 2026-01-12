---
name: conversation-memory
description: >
  Conversation memory management. Triggers when user says "save memory", "remember this", "store context", "save conversation", "find previous discussion".
  Active memory keywords: (no active memories)
---

# Conversation Memory Skill

Save conversation context as recallable memory files, enabling persistence and automatic recall across sessions.

## Active Memories

See `../../data/conversation-memory/memories/index.md` for the active memory index table.

> Note: Memory data is stored in `.claude/data/conversation-memory/` directory, separate from skill code.

## Trigger Scenarios

### Save Memory

Triggered when user says:

- "Save this conversation"
- "Remember this discussion"
- "Store the context"
- "Save memory"

### Recall Memory

- When conversation involves a topic, find related memories from the index
- When user says "find previous discussion about xxx", search memories

## Save Workflow

When triggered, execute these steps:

### 1. Generate Memory Name

Format: `mem-{YYYYMMDD}-{HHMMSS}`

### 2. Extract Key Information

Extract from current conversation:

1. **Topic**: One sentence summary of the conversation topic
2. **Keywords**: 3-8 keywords for recall matching
3. **Key Decisions**: Important decisions made during the conversation
4. **Important Conclusions**: Results or outcomes reached
5. **Related Files**: Code/document paths involved

### 3. Create Memory Files

Run script to create memory directory and files:

```bash
node scripts/save_memory.js [memory-name]
```

Script creates under `memories/active/`:

```
mem-{timestamp}/
├── summary.md      # Summary
└── conversation.md # Raw conversation
```

### 4. Write Memory Content

Fill in according to templates:
- summary.md: See [summary_template.md](references/summary_template.md)
- conversation.md: See [conversation_template.md](references/conversation_template.md)

### 5. Update Index

After saving, script automatically updates index. Can also run manually:

```bash
node scripts/update_index.js
```

This updates the `.claude/data/conversation-memory/memories/index.md` index table and keywords in this file's description.

## Recall Mechanism

### Four-Layer Loading

```
Layer 0: Keywords in description                                → Always loaded
Layer 1: .claude/data/conversation-memory/memories/index.md     → Read on match
Layer 2: Memory's summary.md                                    → Read on demand
Layer 3: Memory's conversation.md                               → Read for tracing
```

### Recall Flow

1. Check if relevant based on keywords in description
2. Read `.claude/data/conversation-memory/memories/index.md` to view index table
3. Read corresponding memory's `summary.md` for details
4. If more detail needed, read `conversation.md`

### Active Search

When user says "find previous discussion about xxx":

```bash
node scripts/activate_memory.js --search <keyword>
```

## Activation Mechanism

When archived memory needs to be recalled:

```bash
node scripts/activate_memory.js <memory-name>
```

Activation:
- Moves memory from `.claude/data/conversation-memory/memories/archive/` back to `active/`
- Automatically updates index

## Archive Mechanism

### Auto-Archive Rules

- Memories inactive for 14+ days get archived
- Keep active/ count <= 20
- Archived memories not in index, but can be searched and activated

### Execute Archive

```bash
node scripts/archive_old_memories.js
```

Index automatically updated after archiving.

## Storage Structure

Skill code and data are stored separately:

```
.claude/
├── skills/conversation-memory/    # Skill code (this directory)
│   ├── SKILL.md                   # This file (skill definition)
│   ├── scripts/                   # Management scripts
│   │   ├── paths.js               # Path resolution utility
│   │   ├── save_memory.js         # Save memory
│   │   ├── activate_memory.js     # Activate memory
│   │   ├── archive_old_memories.js # Archive memories
│   │   └── update_index.js        # Update index
│   └── references/                # Template files
│       ├── summary_template.md
│       └── conversation_template.md
│
└── data/conversation-memory/      # Data directory (separate from skill)
    └── memories/                  # Memory storage
        ├── index.md               # Active memory index
        ├── active/                # Active memories
        │   └── mem-xxx/
        │       ├── summary.md
        │       └── conversation.md
        └── archive/               # Archived memories
```

> This separation design makes skill migration and upgrades easier - data won't be overwritten with skill code.

## Notes

1. **Accept Redundancy**: Multiple saves of same topic is fine - more recall entry points
2. **Auto Extract**: Key info extracted by Claude automatically, no user confirmation needed
3. **Progressive Loading**: Check index first, then summary, finally raw conversation
4. **Use It or Lose It**: Active memories stay active, inactive ones naturally archive
5. **Index Sync**: Update index after every save, activate, or archive operation
