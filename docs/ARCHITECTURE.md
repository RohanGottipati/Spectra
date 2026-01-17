# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         SPECTRA                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  Agent   │───▶│  Spectra SDK │───▶│   Ingestion Service   │  │
│  │  Wallet  │    │  (Optional)  │    │                       │  │
│  └──────────┘    └──────────────┘    └───────────┬───────────┘  │
│                                                   │              │
│                         OR                        │              │
│                                                   ▼              │
│  ┌──────────────────────────────┐    ┌───────────────────────┐  │
│  │   Solana RPC / WebSocket     │───▶│   Transaction Parser  │  │
│  │   (Watch agent wallets)      │    │                       │  │
│  └──────────────────────────────┘    └───────────┬───────────┘  │
│                                                   │              │
│                                                   ▼              │
│                                      ┌───────────────────────┐  │
│                                      │   Analytics Engine    │  │
│                                      │   - Classification    │  │
│                                      │   - Anomaly Detection │  │
│                                      │   - Spending Patterns │  │
│                                      └───────────┬───────────┘  │
│                                                   │              │
│                    ┌──────────────────────────────┼──────────┐  │
│                    │                              │          │  │
│                    ▼                              ▼          ▼  │
│  ┌─────────────────────┐  ┌───────────────┐  ┌────────────┐   │
│  │   Alert Service     │  │   Dashboard   │  │  REST API  │   │
│  │ (Slack/Discord/SMS) │  │   (React)     │  │            │   │
│  └─────────────────────┘  └───────────────┘  └────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Data Ingestion Layer

**Two integration modes:**

#### Mode A: SDK Integration (Recommended)
```typescript
// Agent owner installs Spectra SDK
import { Spectra } from '@spectra/sdk';

const spectra = new Spectra({
  apiKey: 'sp_...',
  agentId: 'my-trading-agent',
});

// Wrap transactions
await spectra.track(async () => {
  await agent.executeTrade(params);
}, {
  context: { strategy: 'momentum', confidence: 0.85 }
});
```

**Benefits:** Full context (why agent made decision), lower latency

#### Mode B: Wallet Watching (Zero Integration)
```typescript
// Just provide wallet addresses to monitor
POST /api/agents
{
  "name": "Trading Bot Alpha",
  "wallets": ["ABC123...", "DEF456..."],
  "alertThresholds": {
    "maxTxPerMinute": 10,
    "maxSpendPerHour": 1000 // in USD
  }
}
```

**Benefits:** No code changes required, works with any existing agent

---

### 2. Transaction Parser

Parses Solana transactions and extracts:

```typescript
interface ParsedTransaction {
  signature: string;
  timestamp: number;
  agentId: string;
  walletAddress: string;

  // Transaction details
  type: 'swap' | 'transfer' | 'stake' | 'x402_payment' | 'other';
  tokenIn?: TokenAmount;
  tokenOut?: TokenAmount;
  valueUSD: number;

  // x402 specific
  x402?: {
    endpoint: string;
    provider: string;
    paymentType: 'per_call' | 'subscription';
  };

  // Program interactions
  programs: string[];  // Program IDs called

  // Context (if SDK used)
  context?: Record<string, any>;
}
```

---

### 3. Analytics Engine

#### Behavior Classification

Classifies each agent into behavioral categories:

| Category | Criteria | Risk Level |
|----------|----------|------------|
| **Conservative** | Low frequency, small positions, high success rate | Low |
| **Aggressive** | High frequency, larger positions, accepts more risk | Medium |
| **Dormant** | Inactive when expected to be trading | Warning |
| **Anomalous** | Behavior deviates significantly from baseline | High |
| **Rogue** | Spending outside parameters, possible compromise | Critical |

```python
class AgentClassifier:
    def classify(self, agent_id: str, window: str = "24h") -> Classification:
        metrics = self.compute_metrics(agent_id, window)

        # Compare to baseline
        baseline = self.get_baseline(agent_id)
        deviation = self.compute_deviation(metrics, baseline)

        if deviation > ROGUE_THRESHOLD:
            return Classification.ROGUE
        elif deviation > ANOMALY_THRESHOLD:
            return Classification.ANOMALOUS
        # ... etc
```

#### Anomaly Detection

Uses multiple detection methods:

1. **Statistical:** Z-score on transaction frequency, amounts
2. **Time-series:** Detect sudden changes in patterns
3. **ML-based:** Isolation Forest for multivariate anomalies

```python
class AnomalyDetector:
    def detect(self, transaction: ParsedTransaction) -> List[Anomaly]:
        anomalies = []

        # Check spending velocity
        recent_spend = self.get_recent_spend(tx.agent_id, window="5m")
        if recent_spend > agent.thresholds.max_spend_5m:
            anomalies.append(Anomaly(
                type="spending_velocity",
                severity="high",
                message=f"Spent ${recent_spend} in 5 min (limit: ${agent.thresholds.max_spend_5m})"
            ))

        # Check transaction frequency
        recent_tx_count = self.get_tx_count(tx.agent_id, window="1m")
        if recent_tx_count > agent.thresholds.max_tx_per_minute:
            anomalies.append(Anomaly(
                type="frequency_spike",
                severity="medium",
                message=f"{recent_tx_count} txs in 1 min (limit: {agent.thresholds.max_tx_per_minute})"
            ))

        # ML-based detection
        if self.isolation_forest.predict(tx.features) == -1:
            anomalies.append(Anomaly(
                type="ml_anomaly",
                severity="medium",
                message="Transaction pattern differs from learned baseline"
            ))

        return anomalies
```

---

### 4. Alert Service

Multi-channel alerting:

```typescript
interface AlertConfig {
  channels: {
    slack?: { webhookUrl: string };
    discord?: { webhookUrl: string };
    email?: { addresses: string[] };
    sms?: { phoneNumbers: string[] };
    webhook?: { url: string };
  };

  rules: AlertRule[];
}

interface AlertRule {
  condition: 'anomaly_detected' | 'threshold_exceeded' | 'agent_dormant' | 'classification_changed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];  // Which channels to notify
  cooldown: number;    // Seconds between repeat alerts
}
```

Example Slack alert:
```
🚨 SPECTRA ALERT - HIGH SEVERITY

Agent: Trading Bot Alpha
Type: Spending Velocity Anomaly
Time: 2026-01-16 14:32:05 UTC

Details:
- Spent $4,523 in last 5 minutes
- Normal baseline: ~$800/5min
- Deviation: 5.6x

Recent Transactions:
- Swap 1000 USDC → SOL (tx: abc123...)
- Swap 2000 USDC → SOL (tx: def456...)
- Swap 1523 USDC → SOL (tx: ghi789...)

[View Dashboard] [Pause Agent] [Dismiss]
```

---

### 5. Dashboard (Frontend)

**Key Views:**

#### Fleet Overview
- All agents at a glance
- Health status (green/yellow/red)
- 24h transaction volume per agent

#### Agent Detail
- Real-time transaction feed
- Behavioral classification history
- Spending charts (hourly, daily, weekly)
- Anomaly timeline

#### Alerts
- Alert history
- Acknowledge/dismiss workflow
- Configure alert rules

#### Settings
- Add/remove agents
- Set thresholds
- Configure integrations

---

## Data Model

### PostgreSQL Schema

```sql
-- Agents being monitored
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name VARCHAR(255),
    wallets TEXT[],  -- Array of wallet addresses
    thresholds JSONB,
    classification VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Transactions (time-series, use TimescaleDB)
CREATE TABLE transactions (
    id UUID,
    agent_id UUID REFERENCES agents(id),
    signature VARCHAR(100),
    timestamp TIMESTAMPTZ,
    type VARCHAR(50),
    value_usd DECIMAL(18, 6),
    token_in JSONB,
    token_out JSONB,
    programs TEXT[],
    context JSONB,
    PRIMARY KEY (id, timestamp)
);
SELECT create_hypertable('transactions', 'timestamp');

-- Anomalies detected
CREATE TABLE anomalies (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    transaction_id UUID,
    type VARCHAR(100),
    severity VARCHAR(20),
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ
);

-- Classification history
CREATE TABLE classifications (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    classification VARCHAR(50),
    confidence DECIMAL(5, 4),
    computed_at TIMESTAMPTZ
);
```

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | Next.js 14 + TailwindCSS + shadcn/ui | Fast development, great DX |
| **Backend API** | FastAPI (Python) or Node.js | Python better for ML, Node better for real-time |
| **Database** | PostgreSQL + TimescaleDB | Time-series optimized for transaction data |
| **Cache** | Redis | Real-time metrics, rate limiting |
| **Message Queue** | Redis Pub/Sub or BullMQ | Async processing of transactions |
| **ML** | scikit-learn (Isolation Forest) | Simple, effective anomaly detection |
| **Blockchain** | Solana Web3.js + Helius/Triton RPC | Reliable transaction monitoring |
| **Hosting** | Vercel (frontend) + Railway/Fly.io (backend) | Easy deployment |

---

## Integration with Solana

### Wallet Monitoring via WebSocket

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection('wss://api.mainnet-beta.solana.com');

// Subscribe to agent wallet
connection.onLogs(
  agentWalletPubkey,
  (logs) => {
    // Parse transaction
    const tx = await connection.getTransaction(logs.signature);
    await processTransaction(tx);
  },
  'confirmed'
);
```

### x402 Payment Detection

```typescript
function isX402Payment(tx: ParsedTransaction): boolean {
  // Check for x402 program interaction
  return tx.programs.includes(X402_PROGRAM_ID) ||
         tx.memo?.includes('x402');
}
```

---

## Scaling Considerations

| Scale | Architecture |
|-------|-------------|
| **MVP (hackathon)** | Single server, SQLite/PostgreSQL |
| **100 agents** | Add Redis cache, separate worker process |
| **1,000 agents** | Horizontal scaling, dedicated DB, message queue |
| **10,000+ agents** | Kubernetes, sharded DB, dedicated ML pipeline |

For hackathon: **Keep it simple.** Single Next.js app with API routes is fine.
