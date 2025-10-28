# 🎨 Overmind Dashboard

React-based monitoring dashboard for the Overmind orchestrator.

## Features

- **Live Chat Interface**: Interact with Overmind in real-time
- **Crew Monitoring**: View active crews, task status, agent performance
- **Memory Explorer**: Browse facts, entities, and episodes
- **Routing Visualizer**: See routing decisions and cost savings
- **Metrics Dashboard**: Charts for latency, cost, provider distribution
- **Conversation History**: Browse and search past conversations

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast builds
- **TanStack Query** for server state
- **Zustand** for client state
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **shadcn/ui** for components

## Quick Start

### Installation

```bash
cd dashboard
pnpm install
```

### Development

```bash
pnpm dev  # Start at http://localhost:5173
```

### Build

```bash
pnpm build  # Output to dist/
pnpm preview  # Preview production build
```

## Configuration

Create `.env.local`:

```bash
VITE_API_URL=http://localhost:8001
VITE_WS_URL=ws://localhost:8001
```

## Project Structure

```
dashboard/
├── public/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   └── MessageList.tsx
│   │   ├── crews/
│   │   │   ├── CrewList.tsx
│   │   │   ├── CrewDetail.tsx
│   │   │   └── AgentCard.tsx
│   │   ├── memory/
│   │   │   ├── MemoryExplorer.tsx
│   │   │   ├── EntityGraph.tsx
│   │   │   └── EpisodeTimeline.tsx
│   │   ├── metrics/
│   │   │   ├── RoutingChart.tsx
│   │   │   ├── CostChart.tsx
│   │   │   └── LatencyChart.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useCrews.ts
│   │   └── useMemory.ts
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   └── websocket.ts    # WebSocket client
│   ├── stores/
│   │   └── app.ts          # Global state
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Features Detail

### Chat Interface
- Send messages to Overmind
- View routing decisions in real-time
- See token usage and cost per message
- Export conversation history

### Crew Monitor
- List all active and completed crews
- View task breakdown and dependencies
- Monitor agent performance
- Real-time status updates via WebSocket

### Memory Explorer
- Search facts and memories
- Visualize entity relationships
- Browse episodic timeline
- Memory statistics dashboard

### Metrics Dashboard
- Provider usage pie chart
- Cost savings over time
- Latency distribution histogram
- Request volume line chart

## API Integration

The dashboard connects to:
- **REST API**: `http://localhost:8001/api/v1`
- **WebSocket**: `ws://localhost:8001/api/v1/crews/{id}/stream`

## Development

### Add shadcn/ui component

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add chart
```

### Code Standards

- Use TypeScript strict mode
- Follow React best practices (hooks, composition)
- Prefer TanStack Query for server state
- Use Zustand for UI state only
- Tailwind for all styling

## Deployment

### Static Build

```bash
pnpm build
# Deploy dist/ to any static host (Vercel, Netlify, S3, etc.)
```

### Docker

```bash
docker build -t overmind-dashboard .
docker run -p 3000:80 overmind-dashboard
```

## License

MIT
