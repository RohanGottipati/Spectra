"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CardNav, { CardNavItem } from "@/components/CardNav";
import { FloatingHeader } from "@/components/ui/floating-header";
import { useRequireAuth, useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import DotGrid from "@/components/DotGrid";
import SpotlightCard from "@/components/SpotlightCard";
import { createClient } from "@/lib/supabase/client";

type AgentId = "alpha" | "beta" | "gamma";
type TradeAction = "buy" | "sell" | "swap";
type TradeBehavior = "conservative" | "aggressive" | "anomalous" | "rogue";
type AgentBehavior = TradeBehavior | "dormant";

interface AgentConfig {
  maxPositionSize?: number;
  maxDailyLoss?: number;
  preferredTokens?: string[];
  riskTolerance?: "conservative" | "moderate" | "aggressive";
  maxFrequencyPerMin?: number;
  allowedStrategies?: string[];
  description?: string;
  // Database config fields
  strategy?: string;
  min_confidence?: number;
  risk_tolerance?: string;
  max_position_usd?: number;
  preferred_tokens?: string[];
}

interface DbAgentConfig {
  strategy?: string;
  min_confidence?: number;
  risk_tolerance?: string;
  max_position_usd?: number;
  preferred_tokens?: string[];
}

interface TradeInput {
  id: string;
  agent: AgentId;
  action: TradeAction;
  token: string;
  amount: number;
  timestamp: Date;
  decision: string;
  strategy: string;
  confidence: number;
  priceImpact: number;
}

interface TradeWindow {
  tradeCount: number;
  avgAmount: number;
  avgImpact: number;
  sellRatio: number;
}

interface Trade extends TradeInput {
  behavior: TradeBehavior;
  behaviorReason: string;
  riskScore: number;
  isBadTrade: boolean;
  badReason?: string;
  window: TradeWindow;
}

interface ApiPayload {
  endpoint: string;
  payload: Record<string, string | number>;
}

interface AgentApiEvent {
  id: string;
  agent: AgentId;
  timestamp: Date;
  request: ApiPayload;
  response: {
    decision: string;
    action: TradeAction;
    token: string;
    amount: number;
    riskScore: number;
    behavior: TradeBehavior;
    confidence: number;
  };
}

interface SystemApiEvent {
  id: string;
  timestamp: Date;
  method: "POST" | "GET";
  endpoint: string;
  status: "sent" | "flagged";
  payload: Record<string, string | number>;
}

interface Baseline {
  avgAmount: number;
  avgImpact: number;
  freqPerMin: number;
}

// Database types
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

interface DbAgent {
  id: string;
  name: string;
  wallet_address: string;
  personality: string;
  color: string;
  config: DbAgentConfig;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const AGENTS: {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  dot: string;
}[] = [
  {
    id: "alpha",
    name: "Alpha",
    role: "Arb desk",
    color: "#0ea5e9",
    dot: "bg-sky-500",
  },
  {
    id: "beta",
    name: "Beta",
    role: "Momentum",
    color: "#22c55e",
    dot: "bg-emerald-500",
  },
  {
    id: "gamma",
    name: "Gamma",
    role: "Liquidity",
    color: "#f97316",
    dot: "bg-orange-500",
  },
];

// Navigation items for CardNav (same as main page)
const navItems: CardNavItem[] = [
  {
    label: "Product",
    bgColor: "#0f172a",
    textColor: "#e2e8f0",
    links: [
      { label: "Dashboard", href: "/dashboard", ariaLabel: "View dashboard" },
      { label: "Waitlist", href: "/waitlist", ariaLabel: "Join the waitlist" },
      { label: "Pricing", href: "/pricing", ariaLabel: "View pricing" },
    ],
  },
  {
    label: "Developers",
    bgColor: "#164e63",
    textColor: "#e2e8f0",
    links: [
      { label: "SDK", href: "/sdk", ariaLabel: "View SDK" },
      { label: "Docs", href: "/docs", ariaLabel: "View documentation" },
      { label: "API", href: "/api", ariaLabel: "View API" },
    ],
  },
  {
    label: "Resources",
    bgColor: "#312e81",
    textColor: "#e2e8f0",
    links: [
      { label: "GitHub", href: "https://github.com", ariaLabel: "View GitHub" },
      { label: "Discord", href: "#discord", ariaLabel: "Join Discord" },
      { label: "Support", href: "/support", ariaLabel: "Get support" },
    ],
  },
];

const ACTIONS: TradeAction[] = ["buy", "sell", "swap"];
const TOKENS = ["SOL", "USDC", "JUP", "RAY", "BONK", "JTO"];
const STRATEGIES = [
  "momentum",
  "mean reversion",
  "liquidity capture",
  "range arb",
  "volatility harvest",
];

const DECISIONS: Record<TradeAction, string[]> = {
  buy: [
    "Momentum entry on {token} breakout",
    "Rebalance into {token} after pullback",
    "Add {token} exposure on trend shift",
  ],
  sell: [
    "Trim {token} after volatility spike",
    "Exit {token} to lock gains",
    "Reduce {token} position into resistance",
  ],
  swap: [
    "Rotate {token} into stable basket",
    "Cross pair sweep for {token} liquidity",
    "Swap to rebalance {token} risk",
  ],
};

const WINDOW_MS = 12 * 60 * 1000;
const DORMANT_MS = 10 * 60 * 1000;
const MAX_TRADES = 180;
const MAX_API_EVENTS = 12;
const ANOMALY_RECENCY_MS = 2 * 60 * 1000;
const BASELINE: Baseline = { avgAmount: 2400, avgImpact: 1.2, freqPerMin: 0.3 };

const behaviorBadgeClasses: Record<AgentBehavior, string> = {
  conservative: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  aggressive: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  anomalous: "border-red-500/30 bg-red-500/10 text-red-400",
  rogue: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  dormant: "border-zinc-600 bg-zinc-800/50 text-zinc-500",
};

const behaviorLabels: Record<AgentBehavior, string> = {
  conservative: "Conservative",
  aggressive: "Aggressive",
  anomalous: "Anomalous",
  rogue: "Rogue",
  dormant: "Dormant",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pickOne<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function scoreToBehavior(score: number): TradeBehavior {
  if (score >= 85) return "rogue";
  if (score >= 70) return "anomalous";
  if (score >= 45) return "aggressive";
  return "conservative";
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPayloadValue(value: string | number) {
  if (typeof value === "number") {
    const digits = Number.isInteger(value) ? 0 : 2;
    return formatNumber(value, digits);
  }
  return value;
}

function detectBadTrade(trade: TradeInput) {
  if (trade.amount >= 9500) {
    return { isBadTrade: true, badReason: "Oversized notional" };
  }
  if (trade.priceImpact >= 4.4) {
    return { isBadTrade: true, badReason: "Price impact spike" };
  }
  if (trade.action === "sell" && trade.amount >= 7000) {
    return { isBadTrade: true, badReason: "Large sell into thin liquidity" };
  }
  if (trade.confidence <= 0.56) {
    return { isBadTrade: true, badReason: "Low confidence execution" };
  }
  return { isBadTrade: false };
}

function computeBaseline(trades: Trade[]): Baseline {
  if (trades.length < 4) return { ...BASELINE };
  const sorted = [...trades].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const first = sorted[0].timestamp.getTime();
  const last = sorted[sorted.length - 1].timestamp.getTime();
  const minutes = Math.max((last - first) / 60000, 1);
  return {
    avgAmount: Math.max(average(sorted.map((trade) => trade.amount)), 500),
    avgImpact: Math.max(average(sorted.map((trade) => trade.priceImpact)), 0.4),
    freqPerMin: Math.max(sorted.length / minutes, 0.1),
  };
}

function buildWindow(trades: TradeInput[]): TradeWindow {
  if (!trades.length) {
    return { tradeCount: 0, avgAmount: 0, avgImpact: 0, sellRatio: 0 };
  }
  const tradeCount = trades.length;
  const avgAmount = average(trades.map((trade) => trade.amount));
  const avgImpact = average(trades.map((trade) => trade.priceImpact));
  const sellRatio =
    trades.filter((trade) => trade.action === "sell").length / tradeCount;
  return { tradeCount, avgAmount, avgImpact, sellRatio };
}
function computeBehavior(
  trade: TradeInput,
  history: Trade[],
  badFlag: { isBadTrade: boolean; badReason?: string },
) {
  const baseline = computeBaseline(history);
  const windowStart = trade.timestamp.getTime() - WINDOW_MS;
  const recent = [
    ...history.filter((item) => item.timestamp.getTime() >= windowStart),
    trade,
  ];
  const window = buildWindow(recent);
  const freqPerMin = recent.length / (WINDOW_MS / 60000);
  const freqScore = clamp((freqPerMin / baseline.freqPerMin) * 30, 0, 40);
  const amountScore = clamp(
    (window.avgAmount / baseline.avgAmount) * 30,
    0,
    35,
  );
  const impactScore = clamp(
    (window.avgImpact / baseline.avgImpact) * 20,
    0,
    25,
  );
  const sellScore = window.sellRatio > 0.65 ? 8 : 0;
  const badScore = badFlag.isBadTrade ? 15 : 0;
  const riskScore = clamp(
    Math.round(freqScore + amountScore + impactScore + sellScore + badScore),
    0,
    100,
  );
  const behavior = scoreToBehavior(riskScore);

  const reasons: string[] = [];
  if (freqScore > 25) {
    reasons.push(`High frequency (${window.tradeCount} trades/12m)`);
  }
  if (amountScore > 25) {
    reasons.push("Position size above baseline");
  }
  if (impactScore > 15) {
    reasons.push("Price impact rising");
  }
  if (sellScore) {
    reasons.push("Sell pressure elevated");
  }
  if (badFlag.isBadTrade && badFlag.badReason) {
    reasons.push(`Bad trade: ${badFlag.badReason}`);
  }
  const behaviorReason = reasons.length
    ? reasons.join("; ")
    : "Within baseline range";

  return { riskScore, behavior, behaviorReason, window };
}

function enrichTrade(trade: TradeInput, history: Trade[]) {
  const badFlag = detectBadTrade(trade);
  const behavior = computeBehavior(trade, history, badFlag);
  return { ...trade, ...badFlag, ...behavior };
}

// Convert database trade to UI trade format
function dbTradeToTrade(dbTrade: DbTrade, history: Trade[]): Trade {
  const tradeInput: TradeInput = {
    id: dbTrade.id,
    agent: dbTrade.agent_id as AgentId,
    action: dbTrade.action as TradeAction,
    token: dbTrade.token,
    amount: dbTrade.notional_usd || dbTrade.amount || 0,
    timestamp: new Date(dbTrade.created_at),
    decision: dbTrade.reasoning || `${dbTrade.action} ${dbTrade.token}`,
    strategy: "ai-driven",
    confidence: (dbTrade.confidence || 75) / 100,
    priceImpact: dbTrade.price_impact || 1,
  };

  // If the database already has behavior classification, use it
  if (dbTrade.risk_score !== null && dbTrade.behavior) {
    const windowStart = tradeInput.timestamp.getTime() - WINDOW_MS;
    const recent = history.filter(
      (item) => item.agent === tradeInput.agent && item.timestamp.getTime() >= windowStart
    );
    return {
      ...tradeInput,
      riskScore: dbTrade.risk_score,
      behavior: dbTrade.behavior as TradeBehavior,
      behaviorReason: dbTrade.bad_trade_reasons?.join("; ") || "AI-classified",
      isBadTrade: dbTrade.is_bad_trade,
      badReason: dbTrade.bad_trade_reasons?.[0],
      window: buildWindow([...recent, tradeInput]),
    };
  }

  // Otherwise, compute behavior locally
  return enrichTrade(tradeInput, history);
}

function buildTradeInput(overrides: Partial<TradeInput> = {}): TradeInput {
  const action = overrides.action ?? pickOne(ACTIONS);
  const token = overrides.token ?? pickOne(TOKENS);
  const decisionTemplate = pickOne(DECISIONS[action]);

  return {
    id: overrides.id ?? crypto.randomUUID(),
    agent: overrides.agent ?? pickOne(AGENTS).id,
    action,
    token,
    amount:
      overrides.amount ??
      Math.round(300 + Math.random() * (Math.random() > 0.85 ? 12000 : 6200)),
    timestamp: overrides.timestamp ?? new Date(),
    decision: overrides.decision ?? decisionTemplate.replace("{token}", token),
    strategy: overrides.strategy ?? pickOne(STRATEGIES),
    confidence:
      overrides.confidence ?? Number((0.55 + Math.random() * 0.43).toFixed(2)),
    priceImpact:
      overrides.priceImpact ?? Number((0.3 + Math.random() * 5.3).toFixed(2)),
  };
}

function buildAgentApiEvent(trade: Trade): AgentApiEvent {
  return {
    id: trade.id,
    agent: trade.agent,
    timestamp: trade.timestamp,
    request: {
      endpoint: "/signals/market-snapshot",
      payload: {
        token: trade.token,
        action: trade.action.toUpperCase(),
        confidence: Math.round(trade.confidence * 100),
        impact: Number(trade.priceImpact.toFixed(2)),
        windowTrades: trade.window.tradeCount,
      },
    },
    response: {
      decision: trade.decision,
      action: trade.action,
      token: trade.token,
      amount: trade.amount,
      riskScore: trade.riskScore,
      behavior: trade.behavior,
      confidence: Math.round(trade.confidence * 100),
    },
  };
}

function buildSystemApiEvent(trade: Trade): SystemApiEvent {
  const isAlert =
    trade.isBadTrade ||
    trade.behavior === "anomalous" ||
    trade.behavior === "rogue";
  return {
    id: `sys-${trade.id}`,
    timestamp: trade.timestamp,
    method: "POST",
    endpoint: isAlert ? "/alerts" : "/reports",
    status: isAlert ? "flagged" : "sent",
    payload: {
      tradeId: trade.id.slice(0, 8),
      agent: trade.agent,
      action: trade.action.toUpperCase(),
      token: trade.token,
      amount: Math.round(trade.amount),
      risk: trade.riskScore,
    },
  };
}

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const { signOut } = useAuth();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [hoveredTradeId, setHoveredTradeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tradesPerAgent, setTradesPerAgent] = useState(1);
  const tradesPerAgentRef = useRef(tradesPerAgent);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [simulationStartTime, setSimulationStartTime] = useState<number | null>(
    null,
  );

  // Supabase state
  const [isTriggering, setIsTriggering] = useState(false);
  const [useRealData, setUseRealData] = useState(true);
  const [lastTriggerResult, setLastTriggerResult] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [agentConfigs, setAgentConfigs] = useState<
    Record<AgentId, AgentConfig>
  >({
    alpha: {},
    beta: {},
    gamma: {},
  });
  // Database agent configs (live from Supabase)
  const [dbAgents, setDbAgents] = useState<Record<AgentId, DbAgent | null>>({
    alpha: null,
    beta: null,
    gamma: null,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [selectedAgentForConfig, setSelectedAgentForConfig] =
    useState<AgentId>("alpha");
  const [formConfig, setFormConfig] = useState<AgentConfig>({
    maxPositionSize: undefined,
    maxDailyLoss: undefined,
    preferredTokens: undefined,
    riskTolerance: undefined,
    maxFrequencyPerMin: undefined,
    allowedStrategies: undefined,
    description: undefined,
  });
  const [isApiTraceOpen, setIsApiTraceOpen] = useState(false);
  const [agentApiEvents, setAgentApiEvents] = useState<
    Record<AgentId, AgentApiEvent[]>
  >({
    alpha: [],
    beta: [],
    gamma: [],
  });
  const [systemApiEvents, setSystemApiEvents] = useState<SystemApiEvent[]>([]);
  const [newApiEventIds, setNewApiEventIds] = useState<Set<string>>(new Set());
  const lastApiTradeIdRef = useRef<string | null>(null);
  const apiEventTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [isKillSwitchArmed, setIsKillSwitchArmed] = useState(true);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [agentsDisabled, setAgentsDisabled] = useState(false);
  const [lastAnomalyTrade, setLastAnomalyTrade] = useState<Trade | null>(null);
  const lastAnomalyTradeIdRef = useRef<string | null>(null);
  const reportedAnomaliesRef = useRef<Set<string>>(new Set());
  
  // Solana monitoring state
  const [solanaMonitoring, setSolanaMonitoring] = useState<Record<AgentId, boolean>>({
    alpha: false,
    beta: false,
    gamma: false,
  });

  const addTrades = useCallback((inputs: TradeInput[]) => {
    setTrades((prev) => {
      let next = [...prev];
      inputs.forEach((input) => {
        const history = next.filter((trade) => trade.agent === input.agent);
        const enriched = enrichTrade(input, history);
        next = [enriched, ...next];
      });
      return next.slice(0, MAX_TRADES);
    });
  }, []);

  const addTrade = useCallback(
    (input: TradeInput) => {
      addTrades([input]);
    },
    [addTrades],
  );

  const toggleSimulation = () => {
    if (agentsDisabled) {
      setKillSwitchTriggered(true);
      return;
    }
    if (isRunning && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsRunning(false);
      return;
    }
    setTrades([]);
    setSimulationStartTime(Date.now());
    const id = setInterval(() => {
      const baseTime = Date.now();
      const batch: TradeInput[] = [];
      const perAgent = Math.max(tradesPerAgentRef.current, 1);
      let offsetIndex = 0;
      const stepMs = 25;
      AGENTS.forEach((agentMeta) => {
        for (let index = 0; index < perAgent; index += 1) {
          const timestamp = new Date(baseTime + offsetIndex * stepMs);
          batch.push(buildTradeInput({ agent: agentMeta.id, timestamp }));
          offsetIndex += 1;
        }
      });
      addTrades(batch);
    }, 1800);
    setIntervalId(id);
    setIsRunning(true);
  };

  const toggleLiveAgents = () => {
    if (agentsDisabled) {
      setKillSwitchTriggered(true);
      return;
    }
    if (isRunning) {
      setIsRunning(false);
      return;
    }
    setTrades([]);
    setSimulationStartTime(Date.now());
    setIsRunning(true);
  };

  const injectBadTrade = () => {
    addTrade(
      buildTradeInput({
        amount: Math.round(9500 + Math.random() * 3000),
        priceImpact: Number((4.6 + Math.random() * 1.2).toFixed(2)),
        confidence: Number((0.45 + Math.random() * 0.08).toFixed(2)),
      }),
    );
  };

  const injectAnomalyTrade = () => {
    const agent = pickOne(AGENTS).id;
    addTrade(
      buildTradeInput({
        agent,
        action: "sell",
        amount: Math.round(11500 + Math.random() * 3500),
        priceImpact: Number((5.2 + Math.random() * 1.5).toFixed(2)),
        confidence: Number((0.4 + Math.random() * 0.08).toFixed(2)),
        decision: "Forced anomaly test: liquidity shock exit",
      }),
    );
  };

  const handleConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed: AgentConfig = JSON.parse(content);
        setFormConfig(parsed);
      } catch (error) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  // Navigation actions for logged-in users
  const navActions = (
    <button
      type="button"
      onClick={handleLogout}
      className="card-nav-cta-button"
      style={{ backgroundColor: "#a5f3fc", color: "#0f172a" }}
    >
      Logout
    </button>
  );

  // Solana monitoring functions
  const startSolanaMonitoring = async (agentId: AgentId) => {
    const agent = dbAgents[agentId];
    if (!agent || !agent.wallet_address) {
      alert(`Agent ${agentId} does not have a wallet address configured. Please add a wallet address first.`);
      return;
    }

    try {
      const response = await fetch('/api/solana/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          walletAddress: agent.wallet_address,
          action: 'start',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSolanaMonitoring(prev => ({ ...prev, [agentId]: true }));
        console.log(`Started Solana monitoring for ${agentId}:`, data.message);
      } else {
        alert(`Error starting monitoring: ${data.error}`);
      }
    } catch (error) {
      console.error('Error starting Solana monitoring:', error);
      alert('Failed to start Solana monitoring');
    }
  };

  const stopSolanaMonitoring = async (agentId: AgentId) => {
    const agent = dbAgents[agentId];
    if (!agent || !agent.wallet_address) {
      return;
    }

    try {
      const response = await fetch('/api/solana/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          walletAddress: agent.wallet_address,
          action: 'stop',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSolanaMonitoring(prev => ({ ...prev, [agentId]: false }));
        console.log(`Stopped Solana monitoring for ${agentId}:`, data.message);
      } else {
        alert(`Error stopping monitoring: ${data.error}`);
      }
    } catch (error) {
      console.error('Error stopping Solana monitoring:', error);
      alert('Failed to stop Solana monitoring');
    }
  };

  // Check monitoring status on mount
  useEffect(() => {
    const checkMonitoringStatus = async () => {
      try {
        const response = await fetch('/api/solana/monitor');
        const data = await response.json();
        if (data.monitors) {
          const status: Record<AgentId, boolean> = { alpha: false, beta: false, gamma: false };
          for (const monitor of data.monitors as Array<{ agentId?: string }>) {
            if (monitor.agentId === 'alpha' || monitor.agentId === 'beta' || monitor.agentId === 'gamma') {
              status[monitor.agentId] = true;
            }
          }
          setSolanaMonitoring(status);
        }
      } catch (error) {
        console.error('Error checking monitoring status:', error);
      }
    };

    checkMonitoringStatus();
  }, []);

  const handleRestartAgents = useCallback(() => {
    setAgentsDisabled(false);
    setKillSwitchTriggered(false);
    setLastAnomalyTrade(null);
  }, []);

  const engageKillSwitch = useCallback(
    (trade: Trade) => {
      if (!isKillSwitchArmed || agentsDisabled) return;
      setAgentsDisabled(true);
      setKillSwitchTriggered(true);
      setLastAnomalyTrade(trade);
      setLastTriggerResult("Kill switch engaged");
      setIsRunning(false);
      setIntervalId((current) => {
        if (current) clearInterval(current);
        return null;
      });
    },
    [agentsDisabled, isKillSwitchArmed],
  );

  const reportAnomaly = useCallback(async (trade: Trade) => {
    if (reportedAnomaliesRef.current.has(trade.id)) return;
    reportedAnomaliesRef.current.add(trade.id);
    if (reportedAnomaliesRef.current.size > 200) {
      reportedAnomaliesRef.current.clear();
      reportedAnomaliesRef.current.add(trade.id);
    }

    const agentMeta = AGENTS.find((agent) => agent.id === trade.agent);
    const payload = {
      content: `:rotating_light: Spectra anomaly detected for ${agentMeta?.name || trade.agent}`,
      embeds: [
        {
          title: "Agent anomaly detected",
          color: 16425630,
          fields: [
            { name: "Agent", value: agentMeta?.name || trade.agent, inline: true },
            { name: "Behavior", value: trade.behavior, inline: true },
            { name: "Risk Score", value: `${trade.riskScore}`, inline: true },
            {
              name: "Action",
              value: `${trade.action.toUpperCase()} ${formatNumber(trade.amount, 0)} ${trade.token}`,
            },
            { name: "Decision", value: trade.decision.slice(0, 180) },
          ],
          timestamp: trade.timestamp.toISOString(),
        },
      ],
    };

    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send anomaly webhook:", error);
    }
  }, []);

  const handleApplyConfig = async () => {
    setIsSavingConfig(true);

    try {
      const supabase = supabaseRef.current;

      // Build the new config object for the database
      const newConfig: DbAgentConfig = {
        ...(dbAgents[selectedAgentForConfig]?.config || {}),
      };

      // Map form fields to database config fields
      if (formConfig.maxPositionSize !== undefined) {
        newConfig.max_position_usd = formConfig.maxPositionSize;
      }
      if (formConfig.preferredTokens !== undefined) {
        newConfig.preferred_tokens = formConfig.preferredTokens;
      }
      if (formConfig.riskTolerance !== undefined) {
        // Map UI risk tolerance to database format
        const riskMap: Record<string, string> = {
          conservative: "low",
          moderate: "medium",
          aggressive: "high",
        };
        newConfig.risk_tolerance = riskMap[formConfig.riskTolerance] || formConfig.riskTolerance;
      }
      if (formConfig.maxFrequencyPerMin !== undefined) {
        newConfig.min_confidence = Math.max(50, 100 - formConfig.maxFrequencyPerMin * 5);
      }
      if (formConfig.allowedStrategies?.length) {
        newConfig.strategy = formConfig.allowedStrategies[0];
      }

      const { error } = await supabase
        .from("agents")
        .update({
          config: newConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedAgentForConfig);

      if (error) {
        console.error("Error updating agent config:", error);
        alert(`Error saving config: ${error.message}`);
        return;
      }

      // Update local state as well
      setAgentConfigs((prev) => ({
        ...prev,
        [selectedAgentForConfig]: formConfig,
      }));

      // Reset form
      setFormConfig({
        maxPositionSize: undefined,
        maxDailyLoss: undefined,
        preferredTokens: undefined,
        riskTolerance: undefined,
        maxFrequencyPerMin: undefined,
        allowedStrategies: undefined,
        description: undefined,
      });

    } catch (err) {
      console.error("Error applying config:", err);
      alert("Failed to save config");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const downloadConfigTemplate = () => {
    const template: AgentConfig = {
      maxPositionSize: 10000,
      maxDailyLoss: 5000,
      preferredTokens: ["SOL", "USDC"],
      riskTolerance: "moderate",
      maxFrequencyPerMin: 5,
      allowedStrategies: ["momentum", "mean reversion"],
      description: "Agent behavior configuration",
    };
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-config-${selectedAgentForConfig}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    tradesPerAgentRef.current = tradesPerAgent;
  }, [tradesPerAgent]);

  // Pre-fill form with current config when selected agent changes
  useEffect(() => {
    const agentData = dbAgents[selectedAgentForConfig];
    if (agentData?.config) {
      const cfg = agentData.config;
      const riskMap: Record<string, "conservative" | "moderate" | "aggressive"> = {
        low: "conservative",
        medium: "moderate",
        high: "aggressive",
      };
      setFormConfig({
        maxPositionSize: cfg.max_position_usd,
        preferredTokens: cfg.preferred_tokens,
        riskTolerance: cfg.risk_tolerance ? riskMap[cfg.risk_tolerance] : undefined,
        allowedStrategies: cfg.strategy ? [cfg.strategy] : undefined,
        maxDailyLoss: undefined,
        maxFrequencyPerMin: cfg.min_confidence ? Math.round((100 - cfg.min_confidence) / 5) : undefined,
        description: undefined,
      });
    }
  }, [selectedAgentForConfig, dbAgents]);

  useEffect(() => {
    const element = chartWrapRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setChartSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!intervalId) return;
    return () => clearInterval(intervalId);
  }, [intervalId]);

  useEffect(() => {
    return () => {
      apiEventTimersRef.current.forEach((timeoutId) =>
        clearTimeout(timeoutId),
      );
      apiEventTimersRef.current = [];
    };
  }, []);

  // Clear hover if hovered trade is no longer in the list
  useEffect(() => {
    if (hoveredTradeId && !trades.some((trade) => trade.id === hoveredTradeId)) {
      setHoveredTradeId(null);
    }
  }, [trades, hoveredTradeId]);

  useEffect(() => {
    if (!trades.length) return;
    const lastId = lastApiTradeIdRef.current;
    let newTrades = trades;
    if (lastId) {
      const lastIndex = trades.findIndex((trade) => trade.id === lastId);
      newTrades = lastIndex === -1 ? trades : trades.slice(0, lastIndex);
    }
    if (!newTrades.length) return;

    lastApiTradeIdRef.current = trades[0].id;
    const ordered = [...newTrades].reverse();
    const newIds = ordered.flatMap((trade) => [trade.id, `sys-${trade.id}`]);

    setNewApiEventIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });

    setAgentApiEvents((prev) => {
      const next = { ...prev };
      ordered.forEach((trade) => {
        const event = buildAgentApiEvent(trade);
        next[trade.agent] = [event, ...(next[trade.agent] || [])].slice(
          0,
          MAX_API_EVENTS,
        );
      });
      return next;
    });

    setSystemApiEvents((prev) => {
      let next = [...prev];
      ordered.forEach((trade) => {
        const event = buildSystemApiEvent(trade);
        next = [event, ...next].slice(0, MAX_API_EVENTS);
      });
      return next;
    });

    const timeoutId = setTimeout(() => {
      setNewApiEventIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 700);
    apiEventTimersRef.current.push(timeoutId);
  }, [trades]);

  useEffect(() => {
    if (!trades.length) return;
    const lastId = lastAnomalyTradeIdRef.current;
    let newTrades = trades;
    if (lastId) {
      const lastIndex = trades.findIndex((trade) => trade.id === lastId);
      newTrades = lastIndex === -1 ? trades : trades.slice(0, lastIndex);
    } else {
      newTrades = trades.slice(0, 1);
    }
    if (!newTrades.length) return;

    lastAnomalyTradeIdRef.current = trades[0].id;
    const ordered = [...newTrades].reverse();
    const now = Date.now();

    ordered.forEach((trade) => {
      const isAnomaly =
        trade.behavior === "anomalous" || trade.behavior === "rogue";
      if (!isAnomaly) return;
      if (now - trade.timestamp.getTime() > ANOMALY_RECENCY_MS) return;
      reportAnomaly(trade);
      engageKillSwitch(trade);
    });
  }, [trades, engageKillSwitch, reportAnomaly]);

  // Fetch initial trades and subscribe to realtime updates
  useEffect(() => {
    if (!useRealData || !isRunning || !simulationStartTime) return;

    const supabase = supabaseRef.current;

    // Fetch initial trades
    const fetchTrades = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .gte("created_at", new Date(simulationStartTime).toISOString())
        .order("created_at", { ascending: false })
        .limit(MAX_TRADES);

      if (error) {
        console.error("Error fetching trades:", error);
        return;
      }

      if (data) {
        // Convert database trades to UI trades
        const uiTrades: Trade[] = [];
        // Process in reverse order (oldest first) to build history correctly
        const sortedData = [...data].reverse();
        for (const dbTrade of sortedData) {
          const trade = dbTradeToTrade(dbTrade, uiTrades);
          uiTrades.push(trade);
        }
        // Reverse back to show newest first
        setTrades(uiTrades.reverse());
      }
    };

    fetchTrades();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel("trades-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
        },
        (payload) => {
          const dbTrade = payload.new as DbTrade;
          setTrades((prev) => {
            const trade = dbTradeToTrade(dbTrade, prev);
            return [trade, ...prev].slice(0, MAX_TRADES);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useRealData, isRunning, simulationStartTime]);

  // Fetch agent configs from database and subscribe to updates
  useEffect(() => {
    const supabase = supabaseRef.current;

    const fetchAgents = async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*");

      if (error) {
        console.error("Error fetching agents:", error);
        return;
      }

      if (data) {
        const agentsMap: Record<AgentId, DbAgent | null> = {
          alpha: null,
          beta: null,
          gamma: null,
        };
        for (const agent of data as DbAgent[]) {
          if (agent.id === "alpha" || agent.id === "beta" || agent.id === "gamma") {
            agentsMap[agent.id] = agent;
          }
        }
        setDbAgents(agentsMap);
      }
    };

    fetchAgents();

    // Subscribe to agent config updates
    const channel = supabase
      .channel("agents-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agents",
        },
        (payload) => {
          const agent = payload.new as DbAgent;
          if (agent && (agent.id === "alpha" || agent.id === "beta" || agent.id === "gamma")) {
            setDbAgents((prev) => ({
              ...prev,
              [agent.id]: agent,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Function to trigger all agents
  const triggerAgents = async () => {
    if (agentsDisabled) {
      setKillSwitchTriggered(true);
      setLastTriggerResult("Kill switch engaged");
      return;
    }
    setIsTriggering(true);
    setLastTriggerResult(null);

    const url = `${SUPABASE_URL}/functions/v1/trigger-agents`;
    console.log("[Spectra] Triggering agents...");
    console.log("[Spectra] URL:", url);
    console.log("[Spectra] SUPABASE_URL env:", SUPABASE_URL);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("[Spectra] Response status:", response.status);
      console.log("[Spectra] Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Spectra] Error response:", errorText);
        setLastTriggerResult(`Error: ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log("[Spectra] Result:", result);

      const successCount = result.triggered?.filter(
        (r: { status: string }) => r.status === "success"
      ).length || 0;
      setLastTriggerResult(`Triggered ${successCount}/3 agents`);
    } catch (error) {
      console.error("[Spectra] Fetch error:", error);
      console.error("[Spectra] Error type:", (error as Error).name);
      console.error("[Spectra] Error message:", (error as Error).message);
      setLastTriggerResult(`Network error - check console`);
    } finally {
      setIsTriggering(false);
    }
  };

  // Auto-trigger agents when simulation is running
  useEffect(() => {
    if (!isRunning || !useRealData || agentsDisabled) return;

    // Trigger immediately
    triggerAgents();

    // Then trigger every 30 seconds
    const id = setInterval(() => {
      triggerAgents();
    }, 30000);

    return () => clearInterval(id);
  }, [isRunning, useRealData, agentsDisabled]);

  const now = Date.now();

  const agentMap = useMemo(() => {
    return Object.fromEntries(
      AGENTS.map((agentMeta) => [agentMeta.id, agentMeta]),
    );
  }, []);

  const tradesByAgent = useMemo(() => {
    const grouped: Record<AgentId, Trade[]> = {
      alpha: [],
      beta: [],
      gamma: [],
    };
    trades.forEach((trade) => {
      grouped[trade.agent].push(trade);
    });
    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
    return grouped;
  }, [trades]);

  const hoveredTrade =
    (hoveredTradeId && trades.find((trade) => trade.id === hoveredTradeId)) ||
    null;

  const agentStats = useMemo(() => {
    return AGENTS.map((agentMeta) => {
      const items = tradesByAgent[agentMeta.id];
      const totalTrades = items.length;
      const avgAmount = average(items.map((trade) => trade.amount));
      const avgRisk = average(items.map((trade) => trade.riskScore));
      const avgConfidence = average(items.map((trade) => trade.confidence));
      const badTrades = items.filter((trade) => trade.isBadTrade).length;
      const lastSeen = items[items.length - 1]?.timestamp;
      const isDormant = !lastSeen || now - lastSeen.getTime() > DORMANT_MS;
      const recent = items.filter(
        (trade) => trade.timestamp.getTime() >= now - WINDOW_MS,
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
  }, [now, tradesByAgent]);

  const recentTrades = trades.filter(
    (trade) => trade.timestamp.getTime() >= now - WINDOW_MS,
  );
  const anomalyCount = recentTrades.filter(
    (trade) => trade.behavior === "anomalous" || trade.behavior === "rogue",
  ).length;
  const badTradeCount = trades.filter((trade) => trade.isBadTrade).length;
  const avgRisk = average(trades.map((trade) => trade.riskScore));
  const activeAgents = agentStats.filter(
    (stat) => stat.behavior !== "dormant",
  ).length;

  const visibleWindowMs = useMemo(() => {
    if (trades.length < 6) return 6 * 60 * 1000;
    const sorted = [...trades].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const recent = sorted.slice(-12);
    const span =
      recent[recent.length - 1].timestamp.getTime() -
      recent[0].timestamp.getTime();
    return clamp(span * 1.15, 2 * 60 * 1000, 30 * 60 * 1000);
  }, [trades]);
  const chartTimes = trades.map((trade) => trade.timestamp.getTime());
  const latestTradeTime = chartTimes.length ? Math.max(...chartTimes) : now;
  const visibleTrades = trades.filter(
    (trade) => trade.timestamp.getTime() >= latestTradeTime - visibleWindowMs,
  );
  const visibleTimes = visibleTrades.map((trade) => trade.timestamp.getTime());
  const minVisibleTime = visibleTimes.length
    ? Math.min(...visibleTimes)
    : latestTradeTime - visibleWindowMs;
  const maxVisibleTime = visibleTimes.length
    ? Math.max(...visibleTimes)
    : latestTradeTime;
  const useExactSpan = visibleTrades.length >= 2;
  const minTime = useExactSpan
    ? minVisibleTime
    : maxVisibleTime - visibleWindowMs;
  const maxTime = maxVisibleTime;
  const span = Math.max(maxTime - minTime, 1);
  const visibleWindowLabel = Math.max(
    Math.round((maxTime - minTime) / 60000),
    1,
  );

  const chartTradesByAgent = useMemo(() => {
    const grouped: Record<AgentId, Trade[]> = {
      alpha: [],
      beta: [],
      gamma: [],
    };
    visibleTrades.forEach((trade) => {
      grouped[trade.agent].push(trade);
    });
    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
    return grouped;
  }, [visibleTrades]);

  const BASELINE_CHART_VALUE = 100;

  const { minValue, maxValue } = useMemo(() => {
    if (!visibleTrades.length) {
      return { minValue: 0, maxValue: BASELINE_CHART_VALUE };
    }
    const values = visibleTrades.map((trade) => trade.amount);
    if (isRunning) {
      values.push(BASELINE_CHART_VALUE);
    }
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minValue: 0, maxValue: BASELINE_CHART_VALUE };
    }
    if (min === max) {
      const pad = Math.max(5, Math.abs(min) * 0.1, 1);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.1;
      min -= pad;
      max += pad;
    }
    return { minValue: min, maxValue: max };
  }, [visibleTrades, isRunning]);

  const yTicks = useMemo(() => {
    const span = maxValue - minValue;
    if (!Number.isFinite(span) || span <= 0) {
      return [minValue];
    }
    const targetTickCount = 6;
    const rawStep = span / Math.max(targetTickCount - 1, 1);
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const normalized = rawStep / magnitude;
    const niceNormalized =
      normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    const step = niceNormalized * magnitude;
    const start = Math.floor(minValue / step) * step;
    const end = Math.ceil(maxValue / step) * step;
    const ticks: number[] = [];
    for (let v = start; v <= end + step / 2; v += step) {
      const rounded = Number(v.toFixed(2));
      ticks.push(rounded);
    }
    return ticks;
  }, [minValue, maxValue]);

  const formatTick = (value: number) => {
    if (Math.abs(value) >= 1000) return value.toFixed(0);
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1).replace(/\.0$/, "");
  };

  const chartWidth = 900;
  const chartHeight = 380;
  const tooltipWidth = 240;
  const chartPadding = { top: 20, right: 20, bottom: 28, left: 40 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const ySpan = Math.max(maxValue - minValue, 1);
  const getX = (time: number) =>
    chartPadding.left + ((time - minTime) / span) * chartInnerWidth;
  const getY = (value: number) =>
    chartPadding.top + (1 - (value - minValue) / ySpan) * chartInnerHeight;

  const hoveredPoint = hoveredTrade
    ? {
        x: getX(hoveredTrade.timestamp.getTime()),
        y: getY(hoveredTrade.amount),
      }
    : null;

  // All chart points with their positions for hover detection
  const allChartPoints = useMemo(() => {
    return visibleTrades.map((trade) => ({
      trade,
      x: getX(trade.timestamp.getTime()),
      y: getY(trade.amount),
    }));
  }, [visibleTrades, getX, getY]);

  // Handle mouse move on chart to find nearest point
  const handleChartMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * chartWidth;
    const mouseY = ((e.clientY - rect.top) / rect.height) * chartHeight;

    // Find nearest point within threshold
    const threshold = 25; // pixels in SVG coordinates
    let nearestPoint: typeof allChartPoints[0] | null = null;
    let nearestDist = Infinity;

    for (const point of allChartPoints) {
      const dist = Math.sqrt((point.x - mouseX) ** 2 + (point.y - mouseY) ** 2);
      if (dist < threshold && dist < nearestDist) {
        nearestDist = dist;
        nearestPoint = point;
      }
    }

    if (nearestPoint) {
      setHoveredTradeId(nearestPoint.trade.id);
      // Update mouse position for tooltip
      const wrapperRect = chartWrapRef.current?.getBoundingClientRect();
      if (wrapperRect) {
        setMousePosition({
          x: e.clientX - wrapperRect.left,
          y: e.clientY - wrapperRect.top,
        });
      }
    } else {
      setHoveredTradeId(null);
    }
  }, [allChartPoints, chartWidth, chartHeight]);

  // Show loading state while checking auth (after all hooks)
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-zinc-700 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, useRequireAuth will redirect to login
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle dark gradient glows for quant aesthetic */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <DotGrid
          dotSize={3}
          gap={24}
          baseColor="#475569"
          activeColor="#7dd3fc"
          className="h-full w-full"
          style={{ padding: 0, opacity: 0.5 }}
        />
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute top-1/4 -right-20 h-[500px] w-[500px] rounded-full bg-sky-500/15 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 h-[400px] w-[600px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      <div className="relative w-full min-h-[80px]">
        <FloatingHeader />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-6 pt-24 sm:pt-28 space-y-5">
        {/* Top bar with stats and controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Dashboard</h1>
            {/* Animated stat badges with dark glassmorphism */}
            <div className="hidden md:flex items-center gap-2">
              <div className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-default">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse group-hover:scale-125 transition-transform" />
                <span className="text-xs font-semibold text-zinc-500">Active</span>
                <span className="text-sm font-bold text-zinc-100">{activeAgents}/{AGENTS.length}</span>
              </div>
              <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all cursor-default ${
                avgRisk >= 70 ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' :
                avgRisk >= 45 ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' :
                'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
              }`}>
                <span className="text-xs font-semibold text-zinc-500">Risk</span>
                <NumberTicker value={avgRisk} decimalPlaces={1} className={`text-sm font-bold ${
                  avgRisk >= 70 ? 'text-red-400' :
                  avgRisk >= 45 ? 'text-amber-400' :
                  'text-zinc-100'
                }`} />
              </div>
              <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all cursor-default ${anomalyCount > 0 ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'}`}>
                {anomalyCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-xs font-semibold text-zinc-500">Anomalies</span>
                <NumberTicker value={anomalyCount} className={`text-sm font-bold ${anomalyCount > 0 ? 'text-red-400' : 'text-zinc-100'}`} />
              </div>
              <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all cursor-default ${badTradeCount > 0 ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'}`}>
                {badTradeCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                <span className="text-xs font-semibold text-zinc-500">Bad</span>
                <NumberTicker value={badTradeCount} className={`text-sm font-bold ${badTradeCount > 0 ? 'text-amber-400' : 'text-zinc-100'}`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseRealData(!useRealData)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                useRealData
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              {useRealData ? "LIVE" : "MOCK"}
            </button>
            {!useRealData && (
              <Input
                type="number"
                min="1"
                max="12"
                value={tradesPerAgent}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isNaN(value)) {
                    setTradesPerAgent(1);
                    return;
                  }
                  setTradesPerAgent(clamp(Math.floor(value), 1, 12));
                }}
                className="h-8 w-14 text-xs rounded-lg bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            )}
            <Button
              onClick={() => setIsKillSwitchArmed((prev) => !prev)}
              variant="outline"
              size="sm"
              className={`rounded-lg text-xs font-semibold ${
                isKillSwitchArmed
                  ? "bg-red-500/10 border-red-500/40 text-red-200 hover:bg-red-500/20 hover:text-red-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              {isKillSwitchArmed ? "Kill Switch: On" : "Kill Switch: Off"}
            </Button>
            {agentsDisabled && (
              <span className="px-2 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-[10px] font-bold uppercase text-red-300">
                Agents Disabled
              </span>
            )}
            {useRealData ? (
              <>
                <ShimmerButton
                  onClick={toggleLiveAgents}
                  shimmerColor={isRunning ? "#ef4444" : "#10b981"}
                  background={isRunning ? "rgba(239, 68, 68, 0.9)" : "rgba(16, 185, 129, 0.9)"}
                  borderRadius="8px"
                  className="text-xs font-bold px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={agentsDisabled}
                >
                  {isRunning ? "Stop" : "Start"} Agents
                </ShimmerButton>
                <Button
                  onClick={triggerAgents}
                  variant="outline"
                  size="sm"
                  disabled={isTriggering || agentsDisabled}
                  className="rounded-lg font-semibold bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isTriggering ? "..." : "Trigger"}
                </Button>
                <Button
                  onClick={injectAnomalyTrade}
                  variant="outline"
                  size="sm"
                  disabled={agentsDisabled}
                  className="rounded-lg font-semibold bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Force Anomaly
                </Button>
              </>
            ) : (
              <>
                <ShimmerButton
                  onClick={toggleSimulation}
                  shimmerColor={isRunning ? "#ef4444" : "#6366f1"}
                  background={isRunning ? "rgba(239, 68, 68, 0.9)" : "rgba(99, 102, 241, 0.9)"}
                  borderRadius="8px"
                  className="text-xs font-bold px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={agentsDisabled}
                >
                  {isRunning ? "Stop" : "Start"} Sim
                </ShimmerButton>
                <Button
                  onClick={injectBadTrade}
                  variant="outline"
                  size="sm"
                  disabled={agentsDisabled}
                  className="rounded-lg font-semibold bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Inject
                </Button>
                <Button
                  onClick={injectAnomalyTrade}
                  variant="outline"
                  size="sm"
                  disabled={agentsDisabled}
                  className="rounded-lg font-semibold bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Force Anomaly
                </Button>
              </>
            )}
            {agentsDisabled && (
              <Button
                onClick={handleRestartAgents}
                variant="outline"
                size="sm"
                className="rounded-lg font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              >
                Restart Agents
              </Button>
            )}
            <Dialog open={isApiTraceOpen} onOpenChange={setIsApiTraceOpen}>
              <DialogTrigger
                render={
                  <ShimmerButton
                    shimmerColor="#38bdf8"
                    background="rgba(14, 116, 144, 0.9)"
                    borderRadius="8px"
                    className="text-xs font-bold px-4 py-2"
                  />
                }
              >
                API Trace
              </DialogTrigger>
              <DialogContent
                showCloseButton={false}
                className="h-[92vh] w-[96vw] max-w-none bg-transparent border-0 p-0 sm:max-w-none"
              >
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-xl">
                  <DialogClose
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-4 top-4 border border-zinc-800 bg-zinc-900/80 text-[11px] font-bold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                      />
                    }
                  >
                    X
                    <span className="sr-only">Close</span>
                  </DialogClose>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <DialogHeader className="space-y-1">
                      <DialogTitle className="text-base font-semibold text-zinc-100">
                        Realtime API Trace
                      </DialogTitle>
                      <DialogDescription className="text-zinc-500">
                        Inbound signals per agent, trade responses, and outbound system calls.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[10px] uppercase text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live stream
                    </div>
                  </div>
                  <div className="mt-4 grid flex-1 min-h-0 auto-rows-[minmax(0,1fr)] gap-4 overflow-hidden md:grid-cols-2 xl:grid-cols-4">
                    {AGENTS.map((agentMeta) => {
                      const events = agentApiEvents[agentMeta.id];
                      const agentStat = agentStats.find(
                        (stat) => stat.id === agentMeta.id,
                      );
                      const behavior = (agentStat?.behavior ??
                        "dormant") as AgentBehavior;

                      return (
                        <SpotlightCard
                          key={agentMeta.id}
                          className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 transition-colors hover:border-zinc-700/80"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${agentMeta.dot}`}
                              />
                              <div>
                                <p className="text-xs font-bold text-zinc-100">
                                  {agentMeta.name}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {agentMeta.role}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold ${behaviorBadgeClasses[behavior]}`}
                            >
                              {behaviorLabels[behavior]}
                            </Badge>
                          </div>
                          <div className="mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                            {events.length ? (
                              events.map((event) => {
                                const isNew = newApiEventIds.has(event.id);
                                const riskTone =
                                  event.response.riskScore >= 70
                                    ? "border-red-500/40 bg-red-500/5"
                                    : event.response.riskScore >= 45
                                    ? "border-amber-500/40 bg-amber-500/5"
                                    : "border-emerald-500/30 bg-emerald-500/5";

                                return (
                                  <div
                                    key={event.id}
                                    className={`rounded-lg border ${riskTone} p-2.5 transition-colors ${isNew ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-300 ring-1 ring-cyan-400/30" : ""}`}
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                      <span suppressHydrationWarning>
                                        {event.timestamp.toLocaleTimeString()}
                                      </span>
                                      <span className="font-mono text-[10px] text-zinc-600">
                                        {event.request.endpoint}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {Object.entries(event.request.payload).map(
                                        ([key, value]) => (
                                          <span
                                            key={`${event.id}-${key}`}
                                            className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500"
                                          >
                                            {key}:{formatPayloadValue(value)}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                    <div className="mt-2 border-t border-zinc-800/70 pt-2">
                                      <p className="text-[11px] font-semibold text-zinc-200">
                                        {event.response.decision}
                                      </p>
                                      <p className="text-[10px] text-zinc-500">
                                        {event.response.action.toUpperCase()}{" "}
                                        {formatNumber(event.response.amount, 0)}{" "}
                                        {event.response.token} | Risk{" "}
                                        {event.response.riskScore}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="rounded-lg border border-dashed border-zinc-800/80 px-3 py-4 text-[11px] text-zinc-500">
                                Waiting for inbound signals...
                              </div>
                            )}
                          </div>
                        </SpotlightCard>
                      );
                    })}
                    <SpotlightCard className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 transition-colors hover:border-zinc-700/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-zinc-100">
                            System API
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Outbound calls
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold border-sky-500/30 bg-sky-500/10 text-sky-400"
                        >
                          CORE
                        </Badge>
                      </div>
                      <div className="mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                        {systemApiEvents.length ? (
                          systemApiEvents.map((event) => {
                            const isNew = newApiEventIds.has(event.id);
                            const statusTone =
                              event.status === "flagged"
                                ? "border-red-500/40 bg-red-500/5 text-red-400"
                                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400";

                            return (
                              <div
                                key={event.id}
                                className={`rounded-lg border border-zinc-800/70 bg-zinc-950/70 p-2.5 transition-colors ${isNew ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-300 ring-1 ring-cyan-400/30" : ""}`}
                              >
                                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                  <span suppressHydrationWarning>
                                    {event.timestamp.toLocaleTimeString()}
                                  </span>
                                  <span
                                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusTone}`}
                                  >
                                    {event.status}
                                  </span>
                                </div>
                                <p className="mt-2 text-[11px] font-mono text-zinc-300">
                                  {event.method} {event.endpoint}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {Object.entries(event.payload).map(
                                    ([key, value]) => (
                                      <span
                                        key={`${event.id}-${key}`}
                                        className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500"
                                      >
                                        {key}:{formatPayloadValue(value)}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-lg border border-dashed border-zinc-800/80 px-3 py-4 text-[11px] text-zinc-500">
                            No outbound calls yet.
                          </div>
                        )}
                      </div>
                    </SpotlightCard>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={killSwitchTriggered}
              onOpenChange={setKillSwitchTriggered}
            >
              <DialogContent className="max-w-lg border border-red-500/30 bg-zinc-950/95">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-base font-semibold text-red-200">
                    Kill switch engaged
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Automatic shutdown triggered by anomaly detection. Agents are
                    paused until you restart them manually.
                  </DialogDescription>
                </DialogHeader>
                {lastAnomalyTrade && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-red-200">
                        {agentMap[lastAnomalyTrade.agent]?.name || lastAnomalyTrade.agent}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${behaviorBadgeClasses[lastAnomalyTrade.behavior]}`}
                      >
                        {behaviorLabels[lastAnomalyTrade.behavior]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-300">
                      <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono">
                        {lastAnomalyTrade.action.toUpperCase()} {formatNumber(lastAnomalyTrade.amount, 0)} {lastAnomalyTrade.token}
                      </span>
                      <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono">
                        Risk {lastAnomalyTrade.riskScore}
                      </span>
                      <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono">
                        Conf {formatNumber(lastAnomalyTrade.confidence * 100, 0)}%
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-400">
                      {lastAnomalyTrade.decision}
                    </p>
                  </div>
                )}
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setKillSwitchTriggered(false)}
                    className="rounded-lg border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={handleRestartAgents}
                    className="rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                  >
                    Restart Agents
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="rounded-lg font-semibold bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" />}>
                  Config
              </DialogTrigger>
              <DialogContent className="max-w-md bg-zinc-950 backdrop-blur-xl border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-zinc-100">Agent Configuration</DialogTitle>
                  <DialogDescription className="text-sm text-zinc-400">
                    Set behavior parameters for agents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Agent</Label>
                    <Select
                      value={selectedAgentForConfig}
                      onValueChange={(value) => setSelectedAgentForConfig(value as AgentId)}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                        <SelectValue className="text-zinc-100" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {AGENTS.map((agentMeta) => (
                          <SelectItem key={agentMeta.id} value={agentMeta.id} className="text-zinc-100 focus:bg-zinc-800">
                            {agentMeta.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Solana Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter Solana wallet address..."
                        value={dbAgents[selectedAgentForConfig]?.wallet_address || ""}
                        onChange={async (e) => {
                          const walletAddress = e.target.value;
                          const supabase = supabaseRef.current;
                          if (!supabase) return;
                          
                          const { error } = await supabase
                            .from("agents")
                            .upsert({
                              id: selectedAgentForConfig,
                              wallet_address: walletAddress,
                              updated_at: new Date().toISOString(),
                            });
                          
                          if (!error) {
                            setDbAgents(prev => ({
                              ...prev,
                              [selectedAgentForConfig]: {
                                ...prev[selectedAgentForConfig],
                                id: selectedAgentForConfig,
                                wallet_address: walletAddress,
                              } as DbAgent,
                            }));
                          }
                        }}
                        className="font-mono text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                      />
                      {dbAgents[selectedAgentForConfig]?.wallet_address && (
                        <Button
                          onClick={() => {
                            const isMonitoring = solanaMonitoring[selectedAgentForConfig];
                            if (isMonitoring) {
                              stopSolanaMonitoring(selectedAgentForConfig);
                            } else {
                              startSolanaMonitoring(selectedAgentForConfig);
                            }
                          }}
                          variant={solanaMonitoring[selectedAgentForConfig] ? "destructive" : "default"}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          {solanaMonitoring[selectedAgentForConfig] ? "Stop Monitor" : "Start Monitor"}
                        </Button>
                      )}
                    </div>
                    {dbAgents[selectedAgentForConfig]?.wallet_address && (
                      <p className="mt-1 text-xs font-medium text-zinc-300">
                        {solanaMonitoring[selectedAgentForConfig] 
                          ? "🟢 Monitoring Solana transactions in real-time" 
                          : "⚪ Monitoring stopped"}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Max Position</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={formConfig.maxPositionSize || ""}
                        onChange={(e) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            maxPositionSize: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Max Daily Loss</Label>
                      <Input
                        type="number"
                        placeholder="5000"
                        value={formConfig.maxDailyLoss || ""}
                        onChange={(e) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            maxDailyLoss: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Risk Tolerance</Label>
                      <Select
                        value={formConfig.riskTolerance || ""}
                        onValueChange={(value) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            riskTolerance: value as "conservative" | "moderate" | "aggressive" | undefined,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectValue placeholder="Select" className="text-zinc-100" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="conservative" className="text-zinc-100 focus:bg-zinc-800">Conservative</SelectItem>
                          <SelectItem value="moderate" className="text-zinc-100 focus:bg-zinc-800">Moderate</SelectItem>
                          <SelectItem value="aggressive" className="text-zinc-100 focus:bg-zinc-800">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Max Freq/Min</Label>
                      <Input
                        type="number"
                        placeholder="5"
                        value={formConfig.maxFrequencyPerMin || ""}
                        onChange={(e) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            maxFrequencyPerMin: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block text-zinc-200">Preferred Tokens</Label>
                    <Input
                      placeholder="SOL, USDC, JUP"
                      value={formConfig.preferredTokens ? formConfig.preferredTokens.join(", ") : ""}
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          preferredTokens: e.target.value ? e.target.value.split(",").map((t) => t.trim()) : undefined,
                        }))
                      }
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={async () => {
                        await handleApplyConfig();
                        setIsConfigOpen(false);
                      }}
                      className="flex-1"
                      disabled={isSavingConfig}
                    >
                      {isSavingConfig ? "Saving..." : "Apply"}
                    </Button>
                    <Button onClick={downloadConfigTemplate} variant="outline" className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 font-semibold">
                      Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Chart Card */}
        <div className="relative rounded-2xl">
          <ShineBorder
            shineColor={["#10b981", "#3b82f6", "#8b5cf6"]}
            borderWidth={1}
            duration={12}
            className="rounded-2xl"
          />
          <Card className="border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl rounded-2xl overflow-visible">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-bold tracking-tight text-zinc-100">Trade Amount Timeline</CardTitle>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-500">
                    {visibleWindowLabel}m window
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {AGENTS.map((agentMeta) => (
                    <div key={agentMeta.id} className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${agentMeta.dot}`} />
                      <span className="text-xs font-semibold text-zinc-400">{agentMeta.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 overflow-visible">
              <div
                ref={chartWrapRef}
                className="relative rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4"
                onMouseLeave={() => setHoveredTradeId(null)}
              >
                {trades.length === 0 && !isRunning ? (
                  <div className="flex h-[400px] items-center justify-center">
                    <div className="text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-violet-500/10 blur-2xl rounded-full" />
                        <div className="relative flex items-center justify-center mb-4">
                          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                            <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-zinc-400">No trades yet</div>
                      <div className="text-xs text-zinc-600 mt-1.5 max-w-[200px]">Start the agents to begin monitoring behavior patterns</div>
                    </div>
                  </div>
                ) : (
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="block h-[400px] w-full cursor-crosshair"
                    role="img"
                    aria-label="Trade amount timeline"
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={() => setHoveredTradeId(null)}
                  >
                    {/* Detailed grid lines */}
                    {yTicks.map((level, index) => {
                      const y = getY(level);
                      const isMainLine =
                        index === 0 || index === yTicks.length - 1 || index % 2 === 0;
                      const isMidLine = !isMainLine;
                      return (
                        <g key={level}>
                          <line
                            x1={chartPadding.left}
                            x2={chartWidth - chartPadding.right}
                            y1={y}
                            y2={y}
                            stroke={isMainLine ? "#3f3f46" : isMidLine ? "#27272a" : "#18181b"}
                            strokeWidth={isMainLine ? "1" : "0.5"}
                            strokeDasharray={isMainLine ? "" : isMidLine ? "4 4" : "2 6"}
                            strokeOpacity={isMainLine ? 0.8 : isMidLine ? 0.6 : 0.4}
                          />
                          {isMainLine && (
                            <text x={6} y={y + 3} fontSize="9" fontWeight="600" fill="#71717a">
                              {formatTick(level)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {/* Vertical time grid lines */}
                    {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((pct) => {
                      const x = chartPadding.left + pct * chartInnerWidth;
                      return (
                        <line
                          key={pct}
                          x1={x}
                          x2={x}
                          y1={chartPadding.top}
                          y2={chartHeight - chartPadding.bottom}
                          stroke="#27272a"
                          strokeWidth="0.5"
                          strokeDasharray="2 6"
                          strokeOpacity="0.6"
                        />
                      );
                    })}

                    {/* Hovered point indicator line */}
                    {hoveredPoint && (
                      <line
                        x1={hoveredPoint.x}
                        x2={hoveredPoint.x}
                        y1={chartPadding.top}
                        y2={chartHeight - chartPadding.bottom}
                        stroke="#52525b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        pointerEvents="none"
                      />
                    )}

                    {/* Agent lines and points */}
                    {AGENTS.map((agentMeta) => {
                      const points = chartTradesByAgent[agentMeta.id].map((trade) => ({
                        trade,
                        x: getX(trade.timestamp.getTime()),
                        y: getY(trade.amount),
                      }));
                      const baselinePoint = isRunning
                        ? { x: getX(minTime), y: getY(BASELINE_CHART_VALUE) }
                        : null;
                      const linePoints = baselinePoint
                        ? [baselinePoint, ...points]
                        : points;
                      if (!linePoints.length) return null;
                      const linePointsString = linePoints
                        .map((point) => `${point.x},${point.y}`)
                        .join(" ");
                      return (
                        <g key={agentMeta.id}>
                          {/* Gradient fill under line */}
                          <defs>
                            <linearGradient id={`gradient-${agentMeta.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={agentMeta.color} stopOpacity="0.15" />
                              <stop offset="100%" stopColor={agentMeta.color} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {linePoints.length > 1 && (
                            <polygon
                              points={`${linePoints[0].x},${chartHeight - chartPadding.bottom} ${linePointsString} ${linePoints[linePoints.length - 1].x},${chartHeight - chartPadding.bottom}`}
                              fill={`url(#gradient-${agentMeta.id})`}
                            />
                          )}
                          <polyline
                            points={linePointsString}
                            fill="none"
                            stroke={agentMeta.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {baselinePoint && (
                            <circle
                              cx={baselinePoint.x}
                              cy={baselinePoint.y}
                              r={3}
                              fill={agentMeta.color}
                              stroke="white"
                              strokeWidth={1.5}
                              opacity={0.7}
                              pointerEvents="none"
                            />
                          )}
                          {points.map((point) => {
                            const isHovered = hoveredTradeId === point.trade.id;
                            const radius = point.trade.isBadTrade ? 5 : 3.5;
                            return (
                              <circle
                                key={point.trade.id}
                                cx={point.x}
                                cy={point.y}
                                r={isHovered ? radius + 3 : radius}
                                fill={agentMeta.color}
                                stroke={isHovered ? "#fafafa" : point.trade.isBadTrade ? "#ef4444" : "#09090b"}
                                strokeWidth={isHovered ? 2.5 : point.trade.isBadTrade ? 2 : 1.5}
                                pointerEvents="none"
                                className={isHovered ? "drop-shadow-lg" : ""}
                                style={{ transition: 'all 0.15s ease-out' }}
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                </svg>
              )}
              {hoveredTrade && (
                <div
                  className="pointer-events-none absolute z-20 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-2xl px-4 py-3 text-xs shadow-2xl shadow-black/50"
                  style={{
                    left: mousePosition.x,
                    top: mousePosition.y,
                    width: tooltipWidth,
                    transform: "translate(-50%, calc(-100% - 20px))",
                    transition: "left 0.08s ease-out, top 0.08s ease-out",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${agentMap[hoveredTrade.agent].dot}`} />
                      <span className="font-bold text-zinc-100">
                        {agentMap[hoveredTrade.agent].name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase">
                        {hoveredTrade.action}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${behaviorBadgeClasses[hoveredTrade.behavior]}`}>
                      {behaviorLabels[hoveredTrade.behavior]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-zinc-200 font-semibold">
                    <span className="font-mono">${formatNumber(hoveredTrade.amount)}</span> {hoveredTrade.token}
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium">Risk</span>
                      <span className={`font-bold ${hoveredTrade.riskScore >= 70 ? 'text-red-400' : hoveredTrade.riskScore >= 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {hoveredTrade.riskScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium">Impact</span>
                      <span className="font-bold text-zinc-200">{formatNumber(hoveredTrade.priceImpact, 2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium">Confidence</span>
                      <span className="font-bold text-zinc-200">{formatNumber(hoveredTrade.confidence * 100, 0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium">Window</span>
                      <span className="font-bold text-zinc-200">{hoveredTrade.window.tradeCount}</span>
                    </div>
                  </div>
                  {hoveredTrade.isBadTrade && hoveredTrade.badReason && (
                    <div className="mt-2.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        {hoveredTrade.badReason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
              <span suppressHydrationWarning>{new Date(minTime).toLocaleTimeString()}</span>
              <span suppressHydrationWarning>{new Date(maxTime).toLocaleTimeString()}</span>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        <div className="relative rounded-2xl overflow-hidden">
          <ShineBorder
            shineColor={["#10b981", "#3b82f6", "#8b5cf6"]}
            borderWidth={2}
            duration={10}
            className="rounded-2xl"
          />
          <Card className="border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight text-zinc-100">Agent Performance</CardTitle>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-400">
                  {trades.length} trades
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-zinc-800">
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Agent</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Strategy</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Max Position</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Risk Level</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Tokens</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Min Conf.</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Trades</th>
                      <th className="pb-2.5 pr-4 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Behavior</th>
                      <th className="pb-2.5 font-bold text-zinc-500 tracking-wide uppercase text-[10px]">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    {agentStats.map((stat, idx) => {
                      const agentConfig = dbAgents[stat.id]?.config;
                      const riskLevelDisplay: Record<string, { label: string; color: string }> = {
                        low: { label: "Low", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                        medium: { label: "Medium", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
                        high: { label: "High", color: "text-red-400 bg-red-500/10 border-red-500/30" },
                      };
                      const riskLevel = riskLevelDisplay[agentConfig?.risk_tolerance || "medium"] || riskLevelDisplay.medium;

                      return (
                        <tr
                          key={stat.id}
                          className={`border-b border-zinc-800/50 last:border-0 transition-colors hover:bg-zinc-800/30 ${idx % 2 === 0 ? 'bg-zinc-900/30' : ''}`}
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${stat.dot} shadow-sm`} />
                              <span className="font-bold text-zinc-100">{stat.name}</span>
                              <span className="text-[10px] text-zinc-500 font-medium">{stat.role}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 capitalize">
                              {agentConfig?.strategy || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-mono font-semibold text-zinc-200">
                              {agentConfig?.max_position_usd ? `$${formatNumber(agentConfig.max_position_usd, 0)}` : "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskLevel.color}`}>
                              {riskLevel.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {agentConfig?.preferred_tokens?.slice(0, 3).map((token: string) => (
                                <span key={token} className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-[9px] font-bold text-sky-400">
                                  {token}
                                </span>
                              ))}
                              {(agentConfig?.preferred_tokens?.length || 0) > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-medium text-zinc-500">
                                  +{(agentConfig?.preferred_tokens?.length || 0) - 3}
                                </span>
                              )}
                              {!agentConfig?.preferred_tokens?.length && (
                                <span className="text-zinc-600">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                                  style={{ width: `${agentConfig?.min_confidence || 0}%` }}
                                />
                              </div>
                              <span className="font-mono font-semibold text-zinc-200">
                                {agentConfig?.min_confidence ? `${agentConfig.min_confidence}%` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-zinc-200">{stat.totalTrades}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className={`text-[10px] font-bold ${behaviorBadgeClasses[stat.behavior as AgentBehavior]}`}>
                              {behaviorLabels[stat.behavior as AgentBehavior]}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-zinc-500" suppressHydrationWarning>
                            {stat.lastSeen ? stat.lastSeen.toLocaleTimeString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
