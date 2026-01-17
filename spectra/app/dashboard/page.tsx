"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
  config: Record<string, unknown>;
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
const BASELINE: Baseline = { avgAmount: 2400, avgImpact: 1.2, freqPerMin: 0.3 };

const behaviorBadgeClasses: Record<AgentBehavior, string> = {
  conservative: "border-emerald-200 bg-emerald-50 text-emerald-700",
  aggressive: "border-amber-200 bg-amber-50 text-amber-700",
  anomalous: "border-red-200 bg-red-50 text-red-700",
  rogue: "border-rose-200 bg-rose-50 text-rose-700",
  dormant: "border-slate-200 bg-slate-50 text-slate-600",
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

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [tradesPerAgent, setTradesPerAgent] = useState(1);
  const tradesPerAgentRef = useRef(tradesPerAgent);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  // Supabase state
  const [isTriggering, setIsTriggering] = useState(false);
  const [useRealData, setUseRealData] = useState(true);
  const [lastTriggerResult, setLastTriggerResult] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const [agent, setAgent] = useState<AgentId>("alpha");
  const [action, setAction] = useState<TradeAction>("buy");
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState("");
  const [agentConfigs, setAgentConfigs] = useState<
    Record<AgentId, AgentConfig>
  >({
    alpha: {},
    beta: {},
    gamma: {},
  });
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
    if (isRunning && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsRunning(false);
      return;
    }
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

  const injectBadTrade = () => {
    addTrade(
      buildTradeInput({
        amount: Math.round(9500 + Math.random() * 3000),
        priceImpact: Number((4.6 + Math.random() * 1.2).toFixed(2)),
        confidence: Number((0.45 + Math.random() * 0.08).toFixed(2)),
      }),
    );
  };

  const submitTrade = (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!numericAmount || Number.isNaN(numericAmount)) return;
    addTrade(
      buildTradeInput({
        agent,
        action,
        token,
        amount: numericAmount,
      }),
    );
    setAmount("");
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

  const handleApplyConfig = () => {
    setAgentConfigs((prev) => ({
      ...prev,
      [selectedAgentForConfig]: formConfig,
    }));
    alert(`Config applied to ${selectedAgentForConfig}`);
    setFormConfig({
      maxPositionSize: undefined,
      maxDailyLoss: undefined,
      preferredTokens: undefined,
      riskTolerance: undefined,
      maxFrequencyPerMin: undefined,
      allowedStrategies: undefined,
      description: undefined,
    });
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
    if (!trades.length) {
      setSelectedTradeId(null);
      return;
    }
    if (
      !selectedTradeId ||
      !trades.some((trade) => trade.id === selectedTradeId)
    ) {
      setSelectedTradeId(trades[0].id);
    }
  }, [trades, selectedTradeId]);

  // Fetch initial trades and subscribe to realtime updates
  useEffect(() => {
    if (!useRealData) return;

    const supabase = supabaseRef.current;

    // Fetch initial trades
    const fetchTrades = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
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
  }, [useRealData]);

  // Function to trigger all agents
  const triggerAgents = async () => {
    setIsTriggering(true);
    setLastTriggerResult(null);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/trigger-agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      const successCount = result.triggered?.filter(
        (r: { status: string }) => r.status === "success"
      ).length || 0;
      setLastTriggerResult(`Triggered ${successCount}/3 agents`);
    } catch (error) {
      console.error("Error triggering agents:", error);
      setLastTriggerResult("Error triggering agents");
    } finally {
      setIsTriggering(false);
    }
  };

  // Auto-trigger agents when simulation is running
  useEffect(() => {
    if (!isRunning || !useRealData) return;

    // Trigger immediately
    triggerAgents();

    // Then trigger every 30 seconds
    const id = setInterval(() => {
      triggerAgents();
    }, 30000);

    return () => clearInterval(id);
  }, [isRunning, useRealData]);

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

  const selectedTrade =
    (selectedTradeId && trades.find((trade) => trade.id === selectedTradeId)) ||
    trades[0] ||
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

  const chartWidth = 1000;
  const chartHeight = 260;
  const tooltipWidth = 240;
  const chartPadding = { top: 20, right: 20, bottom: 28, left: 40 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const getX = (time: number) =>
    chartPadding.left + ((time - minTime) / span) * chartInnerWidth;
  const getY = (score: number) =>
    chartPadding.top + (1 - score / 100) * chartInnerHeight;

  const selectedPoint = selectedTrade
    ? {
        x: getX(selectedTrade.timestamp.getTime()),
        y: getY(selectedTrade.riskScore),
      }
    : null;

  const tooltipPosition = useMemo(() => {
    if (!selectedPoint || !chartSize.width || !chartSize.height) return null;
    const left = (selectedPoint.x / chartWidth) * chartSize.width;
    const top = (selectedPoint.y / chartHeight) * chartSize.height;
    return {
      left: clamp(left, tooltipWidth / 2, chartSize.width - tooltipWidth / 2),
      top: clamp(top, 40, chartSize.height - 40),
    };
  }, [chartHeight, chartSize, chartWidth, selectedPoint, tooltipWidth]);

  useEffect(() => {
    if (!selectedTrade) return;
    const time = selectedTrade.timestamp.getTime();
    if (time < minTime || time > maxTime) {
      setSelectedTradeId(trades[0]?.id ?? null);
    }
  }, [maxTime, minTime, selectedTrade, trades]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold">
            spectra
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">
              Behavior classification cockpit
            </h1>
            <p className="text-sm text-muted-foreground">
              Rolling metrics compare frequency, size, and price impact to each
              agent baseline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Data source toggle */}
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs shadow-sm backdrop-blur">
              <span className="text-muted-foreground">Data</span>
              <button
                onClick={() => setUseRealData(!useRealData)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  useRealData
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {useRealData ? "Live" : "Mock"}
              </button>
            </div>
            {!useRealData && (
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs shadow-sm backdrop-blur">
                <span className="text-muted-foreground">Trades/agent</span>
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
                  className="h-6 w-14 border-white/60 bg-white/80 text-xs"
                />
              </div>
            )}
            {useRealData ? (
              <>
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant={isRunning ? "destructive" : "default"}
                  size="sm"
                >
                  {isRunning ? "Stop" : "Start"} agents
                </Button>
                <Button
                  onClick={triggerAgents}
                  variant="outline"
                  size="sm"
                  disabled={isTriggering}
                >
                  {isTriggering ? "Triggering..." : "Trigger once"}
                </Button>
                {lastTriggerResult && (
                  <span className="text-xs text-muted-foreground">
                    {lastTriggerResult}
                  </span>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={toggleSimulation}
                  variant={isRunning ? "destructive" : "default"}
                  size="sm"
                >
                  {isRunning ? "Stop" : "Start"} simulation
                </Button>
                <Button onClick={injectBadTrade} variant="outline" size="sm">
                  Inject bad trade
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Active agents</p>
              <p className="text-2xl font-semibold">{activeAgents}</p>
              <p className="text-[11px] text-muted-foreground">
                Dormant: {AGENTS.length - activeAgents}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Avg risk score</p>
              <p className="text-2xl font-semibold">
                {formatNumber(avgRisk, 1)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Rolling 12m window
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Recent anomalies</p>
              <p className="text-2xl font-semibold text-red-600">
                {anomalyCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Anomalous or rogue points
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">
                Bad trades flagged
              </p>
              <p className="text-2xl font-semibold text-amber-600">
                {badTradeCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Objective trade rules
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[2.2fr_1fr] gap-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Fleet behavior timeline</CardTitle>
              <CardDescription>
                All agents plotted together. Click any point to inspect the
                decision and behavior.
              </CardDescription>
              <CardAction>
                <Badge variant="outline" className="text-xs">
                  Auto zoom: {visibleWindowLabel}m
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-visible rounded-2xl border border-white/70 bg-white/40 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/70 via-white/30 to-slate-100/40" />
                <div className="relative z-10">
                  <div ref={chartWrapRef} className="relative">
                    {trades.length === 0 ? (
                      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                        No trades yet. Start the simulation or add a manual
                        trade.
                      </div>
                    ) : (
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="block h-64 w-full drop-shadow-sm"
                        role="img"
                        aria-label="Behavior risk timeline"
                      >
                        {[0, 25, 50, 75, 100].map((level) => {
                          const y = getY(level);
                          return (
                            <g key={level}>
                              <line
                                x1={chartPadding.left}
                                x2={chartWidth - chartPadding.right}
                                y1={y}
                                y2={y}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                              />
                              <text
                                x={8}
                                y={y + 4}
                                fontSize="10"
                                fill="#94a3b8"
                              >
                                {level}
                              </text>
                            </g>
                          );
                        })}

                        {selectedPoint && (
                          <line
                            x1={selectedPoint.x}
                            x2={selectedPoint.x}
                            y1={chartPadding.top}
                            y2={chartHeight - chartPadding.bottom}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                            pointerEvents="none"
                          />
                        )}

                        {AGENTS.map((agentMeta) => {
                          const points = chartTradesByAgent[agentMeta.id].map(
                            (trade) => ({
                              trade,
                              x: getX(trade.timestamp.getTime()),
                              y: getY(trade.riskScore),
                            }),
                          );
                          if (!points.length) return null;
                          const linePoints = points
                            .map((point) => `${point.x},${point.y}`)
                            .join(" ");
                          return (
                            <g key={agentMeta.id}>
                              <polyline
                                points={linePoints}
                                fill="none"
                                stroke={agentMeta.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {points.map((point) => {
                                const isSelected =
                                  selectedTradeId === point.trade.id;
                                const radius = point.trade.isBadTrade ? 5 : 4;
                                return (
                                  <g key={point.trade.id}>
                                    <circle
                                      cx={point.x}
                                      cy={point.y}
                                      r={radius + 6}
                                      fill="transparent"
                                      stroke="transparent"
                                      className="cursor-pointer"
                                      onClick={() =>
                                        setSelectedTradeId(point.trade.id)
                                      }
                                    />
                                    <circle
                                      cx={point.x}
                                      cy={point.y}
                                      r={isSelected ? radius + 2 : radius}
                                      fill={agentMeta.color}
                                      stroke={
                                        isSelected
                                          ? "#0f172a"
                                          : point.trade.isBadTrade
                                            ? "#0f172a"
                                            : "transparent"
                                      }
                                      strokeWidth={
                                        isSelected
                                          ? 2
                                          : point.trade.isBadTrade
                                            ? 1.5
                                            : 0
                                      }
                                      pointerEvents="none"
                                    >
                                      <title>
                                        {agentMeta.name} {point.trade.action}{" "}
                                        {formatNumber(point.trade.amount)}{" "}
                                        {point.trade.token} -{" "}
                                        {behaviorLabels[point.trade.behavior]}
                                      </title>
                                    </circle>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })}
                      </svg>
                    )}
                    {selectedTrade && tooltipPosition && (
                      <div
                        className="pointer-events-none absolute z-20 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-700 shadow-xl backdrop-blur-xl"
                        style={{
                          left: tooltipPosition.left,
                          top: tooltipPosition.top,
                          width: tooltipWidth,
                          transform: "translate(-50%, calc(-100% - 16px))",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${agentMap[selectedTrade.agent].dot}`}
                            />
                            <p className="text-xs font-semibold text-slate-900">
                              {agentMap[selectedTrade.agent].name}{" "}
                              {selectedTrade.action.toUpperCase()}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${behaviorBadgeClasses[selectedTrade.behavior]}`}
                          >
                            {behaviorLabels[selectedTrade.behavior]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {formatNumber(selectedTrade.amount)}{" "}
                          {selectedTrade.token} - {selectedTrade.strategy}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {selectedTrade.decision}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            Risk{" "}
                            <span className="font-semibold text-slate-900">
                              {selectedTrade.riskScore}
                            </span>
                          </div>
                          <div>
                            Impact{" "}
                            <span className="font-semibold text-slate-900">
                              {formatNumber(selectedTrade.priceImpact, 2)}%
                            </span>
                          </div>
                          <div>
                            Confidence{" "}
                            <span className="font-semibold text-slate-900">
                              {formatNumber(selectedTrade.confidence * 100, 0)}%
                            </span>
                          </div>
                          <div>
                            Window{" "}
                            <span className="font-semibold text-slate-900">
                              {selectedTrade.window.tradeCount} trades
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {selectedTrade.behaviorReason}
                        </p>
                        {selectedTrade.isBadTrade &&
                          selectedTrade.badReason && (
                            <p className="mt-1 text-[11px] font-semibold text-rose-600">
                              Bad trade: {selectedTrade.badReason}
                            </p>
                          )}
                        <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/70 bg-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {AGENTS.map((agentMeta) => (
                      <div
                        key={agentMeta.id}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${agentMeta.dot}`}
                        />
                        <span>{agentMeta.name}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full border border-slate-400 bg-white" />
                      <span>Bad trade marker</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span suppressHydrationWarning>
                      {new Date(minTime).toLocaleTimeString()}
                    </span>
                    <span suppressHydrationWarning>
                      {new Date(maxTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-white/70 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Classification signals
                    </p>
                    <p className="text-sm font-semibold">
                      Over time, not one trade
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Frequency vs baseline</span>
                      <span className="font-medium text-foreground">
                        Rolling 12m
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Position sizing drift</span>
                      <span className="font-medium text-foreground">
                        Avg notional
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Price impact trend</span>
                      <span className="font-medium text-foreground">
                        Impact delta
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bad trade rules</span>
                      <span className="font-medium text-foreground">
                        Objective flags
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Classification</span>
                      <span className="font-medium text-foreground">
                        Conservative to rogue
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
                    Spectra grades behavior over rolling windows to avoid
                    punishing a single mistake.
                  </div>
                </div>

                <div className="rounded-lg border bg-white/70 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Adaptive timeline
                    </p>
                    <p className="text-sm font-semibold">
                      Zooms with trading cadence
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Visible window</span>
                      <span className="font-medium text-foreground">
                        {visibleWindowLabel}m
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Behavior window</span>
                      <span className="font-medium text-foreground">12m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trades per agent</span>
                      <span className="font-medium text-foreground">
                        {tradesPerAgent} / tick
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tick interval</span>
                      <span className="font-medium text-foreground">1.8s</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
                    Click any point to open a tooltip anchored to the selected
                    decision.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual trade</CardTitle>
                <CardDescription>
                  Send a specific trade for classification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={submitTrade}
                  className="space-y-3"
                  suppressHydrationWarning
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Agent</Label>
                      <Select
                        value={agent}
                        onValueChange={(value) => setAgent(value as AgentId)}
                      >
                        <SelectTrigger
                          className="w-full mt-1"
                          suppressHydrationWarning
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGENTS.map((agentMeta) => (
                            <SelectItem key={agentMeta.id} value={agentMeta.id}>
                              {agentMeta.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Action</Label>
                      <Select
                        value={action}
                        onValueChange={(value) =>
                          setAction(value as TradeAction)
                        }
                      >
                        <SelectTrigger
                          className="w-full mt-1"
                          suppressHydrationWarning
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIONS.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Token</Label>
                      <Select
                        value={token}
                        onValueChange={(value) => value && setToken(value)}
                      >
                        <SelectTrigger
                          className="w-full mt-1"
                          suppressHydrationWarning
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOKENS.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    suppressHydrationWarning
                  >
                    Submit trade
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Config</CardTitle>
                <CardDescription>
                  Set behavior parameters for agents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Selection */}
                <div>
                  <Label className="text-xs mb-2 block">Select Agent</Label>
                  <Select
                    value={selectedAgentForConfig}
                    onValueChange={(value) =>
                      setSelectedAgentForConfig(value as AgentId)
                    }
                  >
                    <SelectTrigger className="w-full" suppressHydrationWarning>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENTS.map((agentMeta) => (
                        <SelectItem key={agentMeta.id} value={agentMeta.id}>
                          {agentMeta.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Config Display */}
                {agentConfigs[selectedAgentForConfig] &&
                  Object.keys(agentConfigs[selectedAgentForConfig]).length >
                    0 && (
                    <div className="rounded-md bg-slate-50 p-3 text-xs">
                      <p className="font-semibold mb-2 text-foreground">
                        Current Config:
                      </p>
                      <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground">
                        {JSON.stringify(
                          agentConfigs[selectedAgentForConfig],
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  )}

                {/* Form Fields */}
                <div className="space-y-3" suppressHydrationWarning>
                  {/* Max Position Size */}
                  <div>
                    <Label className="text-xs mb-1 block">
                      Max Position Size
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 10000"
                      value={formConfig.maxPositionSize || ""}
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          maxPositionSize: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>

                  {/* Max Daily Loss */}
                  <div>
                    <Label className="text-xs mb-1 block">Max Daily Loss</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5000"
                      value={formConfig.maxDailyLoss || ""}
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          maxDailyLoss: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>

                  {/* Risk Tolerance */}
                  <div>
                    <Label className="text-xs mb-1 block">Risk Tolerance</Label>
                    <Select
                      value={formConfig.riskTolerance || ""}
                      onValueChange={(value) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          riskTolerance: value as
                            | "conservative"
                            | "moderate"
                            | "aggressive"
                            | undefined,
                        }))
                      }
                    >
                      <SelectTrigger
                        className="w-full text-xs"
                        suppressHydrationWarning
                      >
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">
                          Conservative
                        </SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Frequency Per Minute */}
                  <div>
                    <Label className="text-xs mb-1 block">
                      Max Frequency Per Minute
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={formConfig.maxFrequencyPerMin || ""}
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          maxFrequencyPerMin: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>

                  {/* Preferred Tokens */}
                  <div>
                    <Label className="text-xs mb-1 block">
                      Preferred Tokens (comma separated)
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g., SOL, USDC, JUP"
                      value={
                        formConfig.preferredTokens
                          ? formConfig.preferredTokens.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          preferredTokens: e.target.value
                            ? e.target.value.split(",").map((t) => t.trim())
                            : undefined,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>

                  {/* Allowed Strategies */}
                  <div>
                    <Label className="text-xs mb-1 block">
                      Allowed Strategies (comma separated)
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g., momentum, mean reversion"
                      value={
                        formConfig.allowedStrategies
                          ? formConfig.allowedStrategies.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          allowedStrategies: e.target.value
                            ? e.target.value.split(",").map((s) => s.trim())
                            : undefined,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-xs mb-1 block">Description</Label>
                    <Textarea
                      placeholder="Brief description of this configuration"
                      value={formConfig.description || ""}
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          description: e.target.value || undefined,
                        }))
                      }
                      className="text-xs min-h-[60px]"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <Label className="text-xs mb-2 block">
                    Or Upload JSON File
                  </Label>
                  <label className="w-full block">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleConfigUpload}
                      className="hidden"
                      id="config-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-xs cursor-pointer"
                      onClick={() =>
                        document.getElementById("config-file-input")?.click()
                      }
                      suppressHydrationWarning
                    >
                      📁 Choose File
                    </Button>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyConfig}
                    variant="default"
                    className="flex-1 text-xs"
                    suppressHydrationWarning
                  >
                    Apply Config
                  </Button>
                  <Button
                    onClick={downloadConfigTemplate}
                    variant="outline"
                    className="flex-1 text-xs"
                    suppressHydrationWarning
                  >
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Behavior labels</CardTitle>
                <CardDescription>Aligned with Spectra pitch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(
                  [
                    "conservative",
                    "aggressive",
                    "anomalous",
                    "rogue",
                    "dormant",
                  ] as AgentBehavior[]
                ).map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-xs"
                  >
                    <Badge
                      variant="outline"
                      className={behaviorBadgeClasses[label]}
                    >
                      {behaviorLabels[label]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {label === "conservative" && "Low risk, steady cadence"}
                      {label === "aggressive" &&
                        "Higher frequency, larger size"}
                      {label === "anomalous" && "Deviation from baseline"}
                      {label === "rogue" && "Critical, possible compromise"}
                      {label === "dormant" && "Inactive beyond expected window"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agent performance table</CardTitle>
            <CardDescription>
              Overall stats and average behavior for each agent in the fleet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Agent</th>
                    <th className="py-2 pr-4">Trades</th>
                    <th className="py-2 pr-4">Avg notional</th>
                    <th className="py-2 pr-4">Avg risk</th>
                    <th className="py-2 pr-4">Avg confidence</th>
                    <th className="py-2 pr-4">Bad trades</th>
                    <th className="py-2 pr-4">Avg behavior</th>
                    <th className="py-2">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map((stat) => (
                    <tr key={stat.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${stat.dot}`}
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {stat.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {stat.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{stat.totalTrades}</td>
                      <td className="py-3 pr-4">
                        {formatNumber(stat.avgAmount, 0)}
                      </td>
                      <td className="py-3 pr-4">
                        {formatNumber(stat.avgRisk, 1)}
                      </td>
                      <td className="py-3 pr-4">
                        {formatNumber(stat.avgConfidence * 100, 0)}%
                      </td>
                      <td className="py-3 pr-4">{stat.badTrades}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            behaviorBadgeClasses[stat.behavior as AgentBehavior]
                          }
                        >
                          {behaviorLabels[stat.behavior as AgentBehavior]}
                        </Badge>
                      </td>
                      <td className="py-3" suppressHydrationWarning>
                        {stat.lastSeen ? stat.lastSeen.toLocaleTimeString() : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
