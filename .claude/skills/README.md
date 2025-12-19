# Agent Skills for Mock SaaS

This directory contains Agent Skills that provide domain-specific expertise for automating the Mock SaaS suite at `localhost:3000`.

## Available Skills

| Skill | Description |
|-------|-------------|
| `aerocore-navigation` | Navigate to any AeroCore or legacy app page |
| `aerocore-admin` | Manage users in the Admin Console |
| `aerocore-dispatch` | Report incidents and broadcast alerts |
| `aerocore-fleet` | Manage drone fleet |
| `aerocore-cargo` | Create and track shipments |
| `aerocore-security` | Security monitoring and access control |
| `aerocore-hr` | Personnel and shift management |
| `aerocore-portal` | Client-facing portal features |
| `jira` | Issue tracking with Kanban board |
| `mock-saas-selectors` | Complete selector reference |

## Skill Structure

Each skill follows Anthropic's Agent Skills format:

```
skill-name/
└── SKILL.md          # Main instructions with YAML frontmatter
```

### SKILL.md Format

```markdown
---
name: skill-name
description: Brief description and when to use this skill
---

# Skill Title

## Prerequisites
[Navigation or setup steps]

## Available Actions
[Detailed instructions with selectors and examples]

## Examples
[JSON examples of tool calls]
```

## Usage

Skills are automatically loaded when relevant to the user's request. The agent will:

1. Match the request to a skill based on the `description` field
2. Read the SKILL.md file for detailed instructions
3. Execute the appropriate browser automation steps

## Selector Convention

All Mock SaaS components use `data-testid` attributes for stable selectors:

```
[data-testid=component-action-element]
```

Examples:
- `[data-testid=admin-create-user-btn]`
- `[data-testid=dispatch-submit-incident]`
- `[data-testid=jira-summary-input]`

## Adding New Skills

1. Create a new directory under `.claude/skills/`
2. Add a `SKILL.md` file with YAML frontmatter
3. Include clear instructions, selectors, and examples
4. Test the skill with the agent

## Mock SaaS Routes

| Route | Module |
|-------|--------|
| `/` | Home page with app links |
| `/jira` | Jira Software |
| `/trello` | Trello |
| `/confluence` | Confluence |
| `/aerocore/admin` | Admin Console |
| `/aerocore/dispatch` | Dispatch Command |
| `/aerocore/fleet` | Fleet Management |
| `/aerocore/hr` | WorkforceHub |
| `/aerocore/cargo` | CargoFlow |
| `/aerocore/security` | SecurePerimeter |
| `/aerocore/portal` | Client Portal |
