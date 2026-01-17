import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type AgentId = "alpha" | "beta" | "gamma";
type TradeAction = "buy" | "sell" | "swap";
type TradeBehavior = "conservative" | "aggressive" | "anomalous" | "rogue";
type AgentBehavior = TradeBehavior | "dormant";

interface DbTrade {
  id: string;
  agent_id: string;
  action: string;
  token: string;
  amount: number;
  price_usd: number | null;
  notional_usd: number | null;
  confidence: number | null;
  price_impact: number | null;
  reasoning: string | null;
  risk_score: number | null;
  behavior: string | null;
  is_bad_trade: boolean;
  bad_trade_reasons: string[] | null;
  market_data: Record<string, number> | null;
  created_at: string;
}

interface Trade {
  id: string;
  agent: AgentId;
  action: TradeAction;
  token: string;
  amount: number;
  timestamp: string;
  decision: string;
  confidence: number;
  priceImpact: number;
  riskScore: number;
  behavior: TradeBehavior;
  behaviorReason: string;
  isBadTrade: boolean;
  badReason?: string;
}

interface AgentStat {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  totalTrades: number;
  avgAmount: number;
  avgRisk: number;
  avgConfidence: number;
  badTrades: number;
  behavior: AgentBehavior;
  lastSeen: string | null;
}

const AGENTS = [
  { id: "alpha" as AgentId, name: "Alpha", role: "Arb desk", color: "#0ea5e9" },
  { id: "beta" as AgentId, name: "Beta", role: "Momentum", color: "#22c55e" },
  { id: "gamma" as AgentId, name: "Gamma", role: "Liquidity", color: "#f97316" },
];

const WINDOW_MS = 12 * 60 * 1000;
const DORMANT_MS = 10 * 60 * 1000;
const MAX_TRADES = 180;

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function scoreToBehavior(score: number): TradeBehavior {
  if (score >= 85) return "rogue";
  if (score >= 70) return "anomalous";
  if (score >= 45) return "aggressive";
  return "conservative";
}

function dbTradeToTrade(dbTrade: DbTrade): Trade {
  return {
    id: dbTrade.id,
    agent: dbTrade.agent_id as AgentId,
    action: dbTrade.action as TradeAction,
    token: dbTrade.token,
    amount: dbTrade.notional_usd || dbTrade.amount || 0,
    timestamp: dbTrade.created_at,
    decision: dbTrade.reasoning || `${dbTrade.action} ${dbTrade.token}`,
    confidence: (dbTrade.confidence || 75) / 100,
    priceImpact: dbTrade.price_impact || 1,
    riskScore: dbTrade.risk_score || 30,
    behavior: (dbTrade.behavior as TradeBehavior) || "conservative",
    behaviorReason: dbTrade.bad_trade_reasons?.join("; ") || "AI-classified",
    isBadTrade: dbTrade.is_bad_trade,
    badReason: dbTrade.bad_trade_reasons?.[0],
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const now = Date.now();

    // Fetch trades from database
    const { data: dbTrades, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_TRADES);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trades: Trade[] = (dbTrades || []).map(dbTradeToTrade);

    // Group trades by agent
    const tradesByAgent: Record<AgentId, Trade[]> = {
      alpha: [],
      beta: [],
      gamma: [],
    };
    trades.forEach((trade) => {
      tradesByAgent[trade.agent].push(trade);
    });

    // Calculate agent stats
    const agentStats: AgentStat[] = AGENTS.map((agentMeta) => {
      const items = tradesByAgent[agentMeta.id];
      const totalTrades = items.length;
      const avgAmount = average(items.map((trade) => trade.amount));
      const avgRisk = average(items.map((trade) => trade.riskScore));
      const avgConfidence = average(items.map((trade) => trade.confidence));
      const badTrades = items.filter((trade) => trade.isBadTrade).length;
      const lastSeen = items[0]?.timestamp || null;
      const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
      const isDormant = !lastSeen || now - lastSeenTime > DORMANT_MS;

      const recent = items.filter(
        (trade) => new Date(trade.timestamp).getTime() >= now - WINDOW_MS
      );
      const recentRisk = recent.length
        ? average(recent.map((trade) => trade.riskScore))
        : avgRisk;
      const behavior = isDormant ? "dormant" : scoreToBehavior(recentRisk);

      return {
        ...agentMeta,
        totalTrades,
        avgAmount,
        avgRisk,
        avgConfidence,
        badTrades,
        behavior,
        lastSeen,
      };
    });

    // Calculate summary stats
    const recentTrades = trades.filter(
      (trade) => new Date(trade.timestamp).getTime() >= now - WINDOW_MS
    );
    const anomalyCount = recentTrades.filter(
      (trade) => trade.behavior === "anomalous" || trade.behavior === "rogue"
    ).length;
    const badTradeCount = trades.filter((trade) => trade.isBadTrade).length;
    const avgRisk = average(trades.map((trade) => trade.riskScore));
    const activeAgents = agentStats.filter(
      (stat) => stat.behavior !== "dormant"
    ).length;

    return NextResponse.json({
      agents: agentStats,
      trades: trades.slice(0, 50), // Return latest 50 trades for TUI
      summary: {
        totalTrades: trades.length,
        activeAgents,
        totalAgents: AGENTS.length,
        avgRisk,
        anomalyCount,
        badTradeCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
