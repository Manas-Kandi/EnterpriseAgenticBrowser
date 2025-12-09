# Enterprise Agentic Browser

## Overview
The **Enterprise Agentic Browser** is a specialized workspace browser designed to function as an operating system for a company's SaaS portfolio. Unlike traditional consumer browsers that focus on passive consumption, this browser is an **active integration layer**. It unifies fragmented workflows across tools like Jira, Slack, Salesforce, and Dropbox into a single, cohesive agentic interface.

By sitting at the browser level, the application has native access to session contexts, auth tokens, and workflows, allowing AI agents to orchestrate complex multi-step tasks that would otherwise require manual context switching.

## Vision
To transform the browser from a passive window into an intelligent enterprise operating system that automates the "glue work" between disparate SaaS applications.

## Key Features
- **Unified Command Center:** A natural language interface to drive complex workflows across multiple apps.
- **Context Awareness:** The browser understands what you are looking at and can act on it (e.g., "Attach this Confluence page to the Jira ticket I was just looking at").
- **Local-First Intelligence:** Built on Electron, ensuring data privacy and local execution of sensitive workflows.
- **Hybrid Automation Engine:** Utilizes robust public APIs for speed and falls back to DOM-based web automation (Playwright) for capabilities missing from APIs.
- **Enterprise Security:** Secure credential storage, detailed audit logging, and granular permission scopes.

## Tech Stack
- **Core:** Electron, React, TypeScript, Node.js
- **Agent Framework:** LangChain, OpenAI GPT-4 / Anthropic Claude 3.5 Sonnet
- **Automation:** Playwright (Headless/Headed), Composio (optional)
- **State Management:** TanStack Query, Zustand
- **Styling:** Tailwind CSS, shadcn/ui (Radix Primitives)
- **Security:** keytar (System Keychain integration), SQLite (Encrypted Audit Logs)

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Git

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Manas-Kandi/EnterpriseAgenticBrowser.git
   cd EnterpriseAgenticBrowser
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup Environment Variables:
   Copy `.env.example` to `.env` and add your API keys (OpenAI/Anthropic).

### Development
```bash
npm run dev
```
This runs the Electron main process and the React renderer in development mode with hot reloading.

## License
Proprietary - Internal Enterprise Use Only
