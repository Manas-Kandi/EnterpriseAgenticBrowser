# Enterprise Agentic Browser (SuiteOS)

## Overview
The **Enterprise Agentic Browser** is a white-label browser platform designed for multi-product SaaS vendors (e.g., Atlassian, Salesforce, Adobe). It functions as a unifying "Operating System" for a vendor's fragmented portfolio, transforming a collection of siloed apps into a cohesive, intelligent suite.

By sitting at the browser level, the application has native access to session contexts, auth tokens, and workflows, allowing AI agents to orchestrate complex multi-step tasks that would otherwise require manual context switching.

## Vision
**The "Google Chrome" for Enterprise Suites.**
Just as Chrome unifies Google's ecosystem (Docs, Drive, Gmail), this browser allows other enterprise vendors to ship a native integration layer to their customers. It solves the fragmentation problem where a vendor's acquired products (e.g., Jira, Confluence, Trello) struggle to talk to each other.

## Key Features
- **Suite Unification:** A shared agentic layer that weaves together workflows across a specific vendor's distinct products.
- **Vendor-Specific Context:** The agent is pre-trained on the specific domain knowledge and APIs of the vendor's suite.
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
