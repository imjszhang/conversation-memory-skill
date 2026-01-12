# Raw Conversation Template

This template is used to save complete raw conversation content as the tracing layer.

## Template Content

```markdown
# Raw Conversation Log

## Conversation Info

- **Start Time**: {YYYY-MM-DD HH:MM:SS}
- **End Time**: {YYYY-MM-DD HH:MM:SS}
- **Turns**: {N} turns

---

## Conversation Content

### User [{HH:MM:SS}]

{User's first message}

---

### Claude [{HH:MM:SS}]

{Claude's first reply}

---

### User [{HH:MM:SS}]

{User's second message}

---

### Claude [{HH:MM:SS}]

{Claude's second reply}

---

(Continue recording all conversation turns...)
```

## Filling Instructions

### Conversation Info

- **Start Time**: Time of first message
- **End Time**: Time of last message
- **Turns**: Total number of user messages

### Conversation Content

1. **Keep Complete Content**: Don't omit or summarize - preserve full original conversation
2. **Label Speakers**: Use `### User` and `### Claude` to distinguish
3. **Label Time**: Note time in brackets if available
4. **Use Separators**: Use `---` between turns for readability

### Special Content Handling

#### Code Blocks

Preserve original code block format:

```markdown
### Claude [{HH:MM:SS}]

Here's an example:

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`
```

#### Long Content

If a message is particularly long (like large code blocks), keep it complete - don't truncate.

#### Image/File References

If images or files were involved, record their path or description:

```markdown
### User [{HH:MM:SS}]

[Attachment: screenshot.png - System architecture diagram]

Please help me analyze this architecture...
```

## Why Keep Raw Conversation

1. **Tracing**: Summaries may miss details - raw conversation is the most accurate record
2. **Context**: Understand background and discussion process of decisions
3. **Search**: Can search for specific content in raw conversation
4. **Learning**: Review previous discussion approaches and thought processes
