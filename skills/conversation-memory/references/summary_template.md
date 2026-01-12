# Summary Template

This template is used to generate the summary.md file for each conversation memory.

## Template Content

```markdown
# Conversation Memory: {Topic Title}

## Metadata

- **Time**: {YYYY-MM-DD HH:MM}
- **Duration**: ~{N} minutes
- **Turns**: {N} turns
- **Keywords**: {keyword1}, {keyword2}, {keyword3}

## Topic Summary

{1-2 paragraphs summarizing the topic and background of this conversation}

## Key Decisions

1. {Decision 1}
2. {Decision 2}
3. ...

## Important Conclusions

- {Conclusion 1}
- {Conclusion 2}
- ...

## TODOs

- [ ] {Todo 1}
- [ ] {Todo 2}
- ...

(Delete this section if no TODOs)

## Related Files

- `{file_path_1}` - {brief description}
- `{file_path_2}` - {brief description}
- ...

(Delete this section if no related files)

## Tracing

For full raw conversation, see [conversation.md](conversation.md)
```

## Filling Instructions

### Topic Title

Use short words to describe the conversation topic, e.g.:
- "Memory System Design"
- "Kaichi Workflow Refactor"
- "API Optimization"

### Keywords

**This is the most important field** - determines if the memory can be correctly recalled.

Requirements:
- Extract 3-8 keywords
- Include core terms related to the topic
- Easy to search and match later

Example:
```
skills, memory, recall, index, progressive-loading
```

### Metadata

- **Time**: When the conversation started
- **Duration**: Estimated conversation length
- **Turns**: Number of user messages

### Topic Summary

Describe the core content in natural language for quick understanding of what was discussed.

### Key Decisions

List important decisions made during the conversation, start with verbs:
- "Adopted xxx approach"
- "Decided to use xxx"
- "Chose xxx over yyy"

### Important Conclusions

List conclusions or outcomes from the conversation:
- Design solutions
- Answers to questions
- Consensus reached

### TODOs

If follow-up tasks were mentioned, record them here.

### Related Files

List code files, documents, configs, etc. mentioned in the conversation.

## Difference from Old Version

New summary.md vs old SKILL.md:

| Item | Old SKILL.md | New summary.md |
|------|-------------|----------------|
| YAML frontmatter | Yes | **No** |
| As independent skill | Yes | **No** |
| Auto-loaded | Metadata loaded | **Not auto-loaded** |
| Indexing | Skills mechanism | **Main skill index table** |

New version manages memories through the main skill's index table, not as independent skills.
