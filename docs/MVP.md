# MVP Scope for Hackathon

> **Note:** This is a hackathon planning document. It describes the intended design; the implemented stack and features are documented in the [root README](../README.md).

## Goal

Build a **working demo** that shows:
1. An AI agent transacting on Solana
2. Spectra monitoring those transactions in real-time
3. Anomaly detection triggering an alert

**Time constraint:** ~24-48 hours of development

---

## MVP Features (Must Have)

### 1. Demo Agent
- Simple trading bot or x402 payment agent
- Runs on Solana devnet
- Can trigger "normal" and "anomalous" behavior on command

### 2. Transaction Monitoring
- Watch agent wallet via Solana RPC
- Parse and store transactions
- Display in real-time feed

### 3. Dashboard
- Agent overview (status, recent activity)
- Transaction list with details
- Basic metrics (tx count, total spend)

### 4. Anomaly Detection (Simple Rules)
- Alert if > N transactions in 1 minute
- Alert if spend > $X in 5 minutes
- Visual indicator on dashboard

### 5. Alert
- At minimum: in-app notification
- Stretch: Discord/Slack webhook

---

## MVP Features (Nice to Have)

- [ ] Behavior classification (conservative/aggressive/rogue)
- [ ] Historical charts
- [ ] Multiple agents
- [ ] Kill switch (pause agent)
- [ ] SDK for context logging

---

## Technical Implementation

### Stack for MVP

```
Frontend:  Next.js 14 + TailwindCSS + shadcn/ui
Backend:   Next.js API routes (keep it simple)
Database:  SQLite (via Prisma) or Supabase
Blockchain: Solana devnet + @solana/web3.js
```

### File Structure

```
spectra/
├── app/
│   ├── page.tsx              # Dashboard home
│   ├── agents/
│   │   └── [id]/page.tsx     # Agent detail view
│   ├── api/
│   │   ├── agents/route.ts   # CRUD agents
│   │   ├── transactions/route.ts
│   │   └── webhooks/solana/route.ts  # Receive tx notifications
│   └── layout.tsx
├── components/
│   ├── AgentCard.tsx
│   ├── TransactionFeed.tsx
│   ├── AnomalyAlert.tsx
│   └── MetricsPanel.tsx
├── lib/
│   ├── solana.ts            # Solana connection helpers
│   ├── parser.ts            # Transaction parser
│   ├── anomaly.ts           # Anomaly detection logic
│   └── db.ts                # Database helpers
├── demo-agent/
│   └── index.ts             # Simple agent for demo
└── prisma/
    └── schema.prisma
```

---

## Demo Script (For Judges)

### Setup (Before Demo)
1. Deploy demo agent to devnet
2. Fund agent wallet with devnet SOL
3. Start Spectra dashboard
4. Register agent in Spectra

### Demo Flow (3-5 minutes)

**1. Introduction (30 sec)**
> "AI agents are now spending real money autonomously via x402. Last month, 100M+ agent payments were processed on Solana. But there's no oversight—nobody knows when an agent goes rogue until it's too late. Spectra fixes that."

**2. Show Normal Operation (1 min)**
- Trigger agent to make a few normal trades
- Show transactions appearing in real-time on dashboard
- Point out metrics: "This agent typically makes 2-3 trades per minute, spending about $50"

**3. Trigger Anomaly (1 min)**
- Click button to make agent go "rogue" (rapid transactions)
- Watch dashboard light up with anomaly alert
- Show alert details: "47 transactions in 2 minutes, 10x normal rate"

**4. Alert Demo (30 sec)**
- Show Discord/Slack notification
- "In production, this would page the on-call engineer"

**5. Value Prop (30 sec)**
> "Without Spectra, this agent would have drained the treasury. With Spectra, you catch it in seconds. We're building the monitoring infrastructure that makes AI agent deployment safe for enterprises."

**6. Roadmap/Ask (30 sec)**
- Show roadmap: SDK, kill switch, ML classification
- "We're looking for design partners with AI agents to monitor"

---

## Development Tasks

### Day 1: Foundation

| Task | Time | Priority |
|------|------|----------|
| Set up Next.js project with TailwindCSS | 1h | P0 |
| Set up database schema (Prisma + SQLite) | 1h | P0 |
| Build basic dashboard layout | 2h | P0 |
| Create demo agent (simple Solana transactions) | 2h | P0 |
| Implement wallet watching via RPC | 2h | P0 |

### Day 2: Core Features

| Task | Time | Priority |
|------|------|----------|
| Transaction parser | 2h | P0 |
| Real-time transaction feed component | 2h | P0 |
| Anomaly detection (simple rules) | 2h | P0 |
| Alert display in UI | 1h | P0 |
| Discord webhook integration | 1h | P1 |
| Polish UI, add metrics | 2h | P1 |

### Day 3: Polish & Demo Prep

| Task | Time | Priority |
|------|------|----------|
| Test full demo flow | 2h | P0 |
| Fix bugs | 2h | P0 |
| Prepare demo script | 1h | P0 |
| Record backup video | 1h | P1 |
| Write submission description | 1h | P0 |

---

## Database Schema (MVP)

```prisma
model Agent {
  id        String   @id @default(cuid())
  name      String
  wallets   String[] // Wallet addresses to monitor
  status    String   @default("active") // active, paused, anomaly

  // Thresholds
  maxTxPerMinute    Int @default(10)
  maxSpendPer5Min   Float @default(1000) // USD

  transactions Transaction[]
  anomalies    Anomaly[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Transaction {
  id        String   @id @default(cuid())
  agentId   String
  agent     Agent    @relation(fields: [agentId], references: [id])

  signature String   @unique
  timestamp DateTime
  type      String   // swap, transfer, x402_payment
  valueUsd  Float

  // Raw data
  data      Json

  createdAt DateTime @default(now())
}

model Anomaly {
  id        String   @id @default(cuid())
  agentId   String
  agent     Agent    @relation(fields: [agentId], references: [id])

  type      String   // spending_velocity, frequency_spike, etc
  severity  String   // low, medium, high, critical
  message   String

  acknowledged Boolean @default(false)

  createdAt DateTime @default(now())
}
```

---

## Key Code Snippets

### Wallet Monitoring

```typescript
// lib/solana.ts
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL!);

export async function watchWallet(
  walletAddress: string,
  onTransaction: (signature: string) => void
) {
  const pubkey = new PublicKey(walletAddress);

  connection.onLogs(pubkey, (logs) => {
    if (!logs.err) {
      onTransaction(logs.signature);
    }
  }, 'confirmed');
}
```

### Anomaly Detection

```typescript
// lib/anomaly.ts
import { db } from './db';

export async function checkAnomalies(agentId: string, newTx: Transaction) {
  const anomalies = [];
  const agent = await db.agent.findUnique({ where: { id: agentId } });

  // Check transaction frequency
  const recentTxCount = await db.transaction.count({
    where: {
      agentId,
      timestamp: { gte: new Date(Date.now() - 60000) } // Last 1 min
    }
  });

  if (recentTxCount > agent.maxTxPerMinute) {
    anomalies.push({
      type: 'frequency_spike',
      severity: 'high',
      message: `${recentTxCount} transactions in 1 minute (limit: ${agent.maxTxPerMinute})`
    });
  }

  // Check spending velocity
  const recentSpend = await db.transaction.aggregate({
    where: {
      agentId,
      timestamp: { gte: new Date(Date.now() - 300000) } // Last 5 min
    },
    _sum: { valueUsd: true }
  });

  if (recentSpend._sum.valueUsd > agent.maxSpendPer5Min) {
    anomalies.push({
      type: 'spending_velocity',
      severity: 'critical',
      message: `Spent $${recentSpend._sum.valueUsd.toFixed(2)} in 5 minutes (limit: $${agent.maxSpendPer5Min})`
    });
  }

  return anomalies;
}
```

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Dashboard loads | ✓ |
| Shows agent status | ✓ |
| Real-time transaction feed works | ✓ |
| Anomaly detection triggers | ✓ |
| Alert appears on anomaly | ✓ |
| Demo runs smoothly | ✓ |
| Judges understand value prop | ✓ |
