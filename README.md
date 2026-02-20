# Tsinghua SEM Business Simulation Platform

A web-based business strategy simulation platform designed for research experiments on decision-making processes at Tsinghua University School of Economics and Management.

## Features

- **Customizable Scenarios**: JSON-based scenario definitions for flexible research experiments
- **Decision Tracking**: Comprehensive logging of all participant decisions and outcomes
- **Research Analytics**: Built-in analytics dashboard for researchers
- **Multi-round Simulations**: Support for complex, multi-period business scenarios

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Deployment**: Docker

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Set up the database (see backend/database/README.md)
4. Configure environment variables (see .env.example files)
5. Start the development servers:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (in another terminal)
   cd frontend && npm start
   ```

### C1 AI Assist Configuration

The C1 condition uses a server-side DeepSeek integration. Add these variables to the backend `.env`:

```
DEEPSEEK_API_KEY=your_deepseek_key_here
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=300
```

### C2 Agentic Copilot (Local)

C2 uses a local, rule-based copilot (no external LLM required). To test locally:

1. Start the backend and frontend servers.
2. On the landing page, select mode `C2`.
3. Enter a participant ID and click **Begin Simulation**.
4. Open any act and use the copilot panel on the right:
   - Click **Clarify my goals**, **Stress test my choice**, or **Help me write my CEO rationale**.
   - Save a CEO rationale (required before submitting a decision).

Copilot interactions are logged to the `interaction_events` table with `c2_*` event types.

## Project Structure

```
tsinghua-sem-simulation/
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── shared/            # Shared TypeScript types
└── docker-compose.yml # Docker configuration
```

## Development

See individual README files in frontend/ and backend/ directories for detailed development instructions.

## License

For research use at Tsinghua University SEM.