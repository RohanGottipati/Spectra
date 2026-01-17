"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingHeader } from "@/components/ui/floating-header";
import { useRequireAuth } from "@/lib/auth";
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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
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
  const { user, loading } = useRequireAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [hoveredTradeId, setHoveredTradeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tradesPerAgent, setTradesPerAgent] = useState(1);
  const tradesPerAgentRef = useRef(tradesPerAgent);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

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

  // Clear hover if hovered trade is no longer in the list
  useEffect(() => {
    if (hoveredTradeId && !trades.some((trade) => trade.id === hoveredTradeId)) {
      setHoveredTradeId(null);
    }
  }, [trades, hoveredTradeId]);

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

  const chartWidth = 900;
  const chartHeight = 380;
  const tooltipWidth = 240;
  const chartPadding = { top: 20, right: 20, bottom: 28, left: 40 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const getX = (time: number) =>
    chartPadding.left + ((time - minTime) / span) * chartInnerWidth;
  const getY = (score: number) =>
    chartPadding.top + (1 - score / 100) * chartInnerHeight;

  const hoveredPoint = hoveredTrade
    ? {
        x: getX(hoveredTrade.timestamp.getTime()),
        y: getY(hoveredTrade.riskScore),
      }
    : null;

  // All chart points with their positions for hover detection
  const allChartPoints = useMemo(() => {
    return visibleTrades.map((trade) => ({
      trade,
      x: getX(trade.timestamp.getTime()),
      y: getY(trade.riskScore),
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, useRequireAuth will redirect to login
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Vibrant pastel gradient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-violet-300/70 via-purple-200/50 to-fuchsia-100/30 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/4 -right-10 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-sky-300/60 via-cyan-200/40 to-blue-100/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute -bottom-20 left-1/4 h-[450px] w-[600px] rounded-full bg-gradient-to-t from-rose-300/50 via-pink-200/40 to-orange-100/20 blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-gradient-to-r from-emerald-200/40 via-teal-100/30 to-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative w-full px-4 pt-4">
        <FloatingHeader />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Top bar with stats and controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            {/* Animated stat badges with glassmorphism */}
            <div className="hidden md:flex items-center gap-2">
              <div className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:bg-white/70 transition-all cursor-default">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse group-hover:scale-125 transition-transform" />
                <span className="text-xs font-semibold text-slate-600">Active</span>
                <span className="text-sm font-bold text-slate-900">{activeAgents}/{AGENTS.length}</span>
              </div>
              <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg transition-all cursor-default ${
                avgRisk >= 70 ? 'bg-red-100/50 border-red-200/60 hover:bg-red-100/70' :
                avgRisk >= 45 ? 'bg-amber-100/50 border-amber-200/60 hover:bg-amber-100/70' :
                'bg-white/50 border-white/60 hover:bg-white/70'
              } hover:shadow-xl`}>
                <span className="text-xs font-semibold text-slate-600">Risk</span>
                <NumberTicker value={avgRisk} decimalPlaces={1} className={`text-sm font-bold ${
                  avgRisk >= 70 ? 'text-red-600' :
                  avgRisk >= 45 ? 'text-amber-600' :
                  'text-slate-900'
                }`} />
              </div>
              <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg transition-all cursor-default ${anomalyCount > 0 ? 'bg-red-100/50 border-red-200/60 hover:bg-red-100/70' : 'bg-white/50 border-white/60 hover:bg-white/70'} hover:shadow-xl`}>
                {anomalyCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-xs font-semibold text-slate-600">Anomalies</span>
                <NumberTicker value={anomalyCount} className={`text-sm font-bold ${anomalyCount > 0 ? 'text-red-600' : 'text-slate-900'}`} />
              </div>
              <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg transition-all cursor-default ${badTradeCount > 0 ? 'bg-amber-100/50 border-amber-200/60 hover:bg-amber-100/70' : 'bg-white/50 border-white/60 hover:bg-white/70'} hover:shadow-xl`}>
                {badTradeCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                <span className="text-xs font-semibold text-slate-600">Bad</span>
                <NumberTicker value={badTradeCount} className={`text-sm font-bold ${badTradeCount > 0 ? 'text-amber-600' : 'text-slate-900'}`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseRealData(!useRealData)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                useRealData
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25"
                  : "bg-white/80 text-slate-600 border border-slate-200/60"
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
                className="h-8 w-14 text-xs rounded-lg bg-white/80 border-slate-200/60"
              />
            )}
            {useRealData ? (
              <>
                <ShimmerButton
                  onClick={() => setIsRunning(!isRunning)}
                  shimmerColor={isRunning ? "#ef4444" : "#10b981"}
                  background={isRunning ? "rgba(239, 68, 68, 0.9)" : "rgba(16, 185, 129, 0.9)"}
                  borderRadius="8px"
                  className="text-xs font-bold px-4 py-2"
                >
                  {isRunning ? "Stop" : "Start"} Agents
                </ShimmerButton>
                <Button
                  onClick={triggerAgents}
                  variant="outline"
                  size="sm"
                  disabled={isTriggering}
                  className="rounded-lg font-semibold bg-white/80 border-slate-200/60 hover:bg-white"
                >
                  {isTriggering ? "..." : "Trigger"}
                </Button>
              </>
            ) : (
              <>
                <ShimmerButton
                  onClick={toggleSimulation}
                  shimmerColor={isRunning ? "#ef4444" : "#6366f1"}
                  background={isRunning ? "rgba(239, 68, 68, 0.9)" : "rgba(99, 102, 241, 0.9)"}
                  borderRadius="8px"
                  className="text-xs font-bold px-4 py-2"
                >
                  {isRunning ? "Stop" : "Start"} Sim
                </ShimmerButton>
                <Button onClick={injectBadTrade} variant="outline" size="sm" className="rounded-lg font-semibold bg-white/80 border-slate-200/60">
                  Inject
                </Button>
              </>
            )}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="rounded-lg font-semibold bg-white/80 border-slate-200/60" />}>
                  Config
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-slate-200/60">
                <DialogHeader>
                  <DialogTitle>Agent Configuration</DialogTitle>
                  <DialogDescription>
                    Set behavior parameters for agents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm mb-1.5 block">Agent</Label>
                    <Select
                      value={selectedAgentForConfig}
                      onValueChange={(value) => setSelectedAgentForConfig(value as AgentId)}
                    >
                      <SelectTrigger>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm mb-1.5 block">Max Position</Label>
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
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Max Daily Loss</Label>
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
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm mb-1.5 block">Risk Tolerance</Label>
                      <Select
                        value={formConfig.riskTolerance || ""}
                        onValueChange={(value) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            riskTolerance: value as "conservative" | "moderate" | "aggressive" | undefined,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Max Freq/Min</Label>
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
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Preferred Tokens</Label>
                    <Input
                      placeholder="SOL, USDC, JUP"
                      value={formConfig.preferredTokens ? formConfig.preferredTokens.join(", ") : ""}
                      onChange={(e) =>
                        setFormConfig((prev) => ({
                          ...prev,
                          preferredTokens: e.target.value ? e.target.value.split(",").map((t) => t.trim()) : undefined,
                        }))
                      }
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
                    <Button onClick={downloadConfigTemplate} variant="outline" className="flex-1">
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
            shineColor={["#a78bfa", "#60a5fa", "#34d399"]}
            borderWidth={2}
            duration={8}
            className="rounded-2xl"
          />
          <Card className="border border-white/60 bg-white/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-300/30 overflow-visible">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-bold tracking-tight text-slate-900">Behavior Timeline</CardTitle>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                    {visibleWindowLabel}m window
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {AGENTS.map((agentMeta) => (
                    <div key={agentMeta.id} className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${agentMeta.dot} shadow-sm`} />
                      <span className="text-xs font-semibold text-slate-600">{agentMeta.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 overflow-visible">
              <div
                ref={chartWrapRef}
                className="relative rounded-xl bg-gradient-to-br from-slate-100/80 via-white/60 to-slate-50/80 border border-white/80 p-4"
                onMouseLeave={() => setHoveredTradeId(null)}
              >
                {trades.length === 0 ? (
                  <div className="flex h-[400px] items-center justify-center">
                    <div className="text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 via-sky-400/20 to-emerald-400/20 blur-2xl rounded-full" />
                        <div className="relative flex items-center justify-center mb-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
                            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-600">No trades yet</div>
                      <div className="text-xs text-slate-400 mt-1.5 max-w-[200px]">Start the agents to begin monitoring behavior patterns</div>
                    </div>
                  </div>
                ) : (
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="block h-[400px] w-full cursor-crosshair"
                    role="img"
                    aria-label="Behavior risk timeline"
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={() => setHoveredTradeId(null)}
                  >
                    {/* Background zones for risk levels */}
                    <defs>
                      <linearGradient id="dangerZone" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fecaca" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#fecaca" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="warningZone" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="safeZone" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {/* Risk zone backgrounds */}
                    <rect x={chartPadding.left} y={getY(100)} width={chartInnerWidth} height={getY(70) - getY(100)} fill="url(#dangerZone)" />
                    <rect x={chartPadding.left} y={getY(70)} width={chartInnerWidth} height={getY(45) - getY(70)} fill="url(#warningZone)" />
                    <rect x={chartPadding.left} y={getY(45)} width={chartInnerWidth} height={getY(0) - getY(45)} fill="url(#safeZone)" />

                    {/* Detailed grid lines - every 5 */}
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((level) => {
                      const y = getY(level);
                      const isMainLine = level % 25 === 0;
                      const isMidLine = level % 10 === 0 && !isMainLine;
                      return (
                        <g key={level}>
                          <line
                            x1={chartPadding.left}
                            x2={chartWidth - chartPadding.right}
                            y1={y}
                            y2={y}
                            stroke={isMainLine ? "#94a3b8" : isMidLine ? "#cbd5e1" : "#e2e8f0"}
                            strokeWidth={isMainLine ? "1" : "0.5"}
                            strokeDasharray={isMainLine ? "" : isMidLine ? "4 4" : "2 6"}
                            strokeOpacity={isMainLine ? 0.6 : isMidLine ? 0.5 : 0.4}
                          />
                          {isMainLine && (
                            <text x={6} y={y + 3} fontSize="9" fontWeight="600" fill="#64748b">
                              {level}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Threshold labels on right side */}
                    <text x={chartWidth - chartPadding.right + 5} y={getY(85)} fontSize="8" fontWeight="600" fill="#dc2626" opacity="0.7">ROGUE</text>
                    <text x={chartWidth - chartPadding.right + 5} y={getY(57)} fontSize="8" fontWeight="600" fill="#d97706" opacity="0.7">WARNING</text>
                    <text x={chartWidth - chartPadding.right + 5} y={getY(22)} fontSize="8" fontWeight="600" fill="#059669" opacity="0.7">SAFE</text>

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
                          stroke="#e2e8f0"
                          strokeWidth="0.5"
                          strokeDasharray="2 6"
                          strokeOpacity="0.5"
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
                        stroke="#94a3b8"
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
                        y: getY(trade.riskScore),
                      }));
                      if (!points.length) return null;
                      const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
                      return (
                        <g key={agentMeta.id}>
                          {/* Gradient fill under line */}
                          <defs>
                            <linearGradient id={`gradient-${agentMeta.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={agentMeta.color} stopOpacity="0.15" />
                              <stop offset="100%" stopColor={agentMeta.color} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {points.length > 1 && (
                            <polygon
                              points={`${points[0].x},${chartHeight - chartPadding.bottom} ${linePoints} ${points[points.length - 1].x},${chartHeight - chartPadding.bottom}`}
                              fill={`url(#gradient-${agentMeta.id})`}
                            />
                          )}
                          <polyline
                            points={linePoints}
                            fill="none"
                            stroke={agentMeta.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                                stroke={isHovered ? "#0f172a" : point.trade.isBadTrade ? "#dc2626" : "white"}
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
                  className="pointer-events-none absolute z-20 rounded-xl border border-white/60 bg-white/80 backdrop-blur-2xl px-4 py-3 text-xs shadow-2xl shadow-slate-900/20"
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
                      <span className={`h-2.5 w-2.5 rounded-full ${agentMap[hoveredTrade.agent].dot} shadow-sm`} />
                      <span className="font-bold text-slate-900">
                        {agentMap[hoveredTrade.agent].name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        {hoveredTrade.action}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${behaviorBadgeClasses[hoveredTrade.behavior]}`}>
                      {behaviorLabels[hoveredTrade.behavior]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-slate-700 font-semibold">
                    <span className="font-mono">${formatNumber(hoveredTrade.amount)}</span> {hoveredTrade.token}
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Risk</span>
                      <span className={`font-bold ${hoveredTrade.riskScore >= 70 ? 'text-red-600' : hoveredTrade.riskScore >= 45 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {hoveredTrade.riskScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Impact</span>
                      <span className="font-bold text-slate-800">{formatNumber(hoveredTrade.priceImpact, 2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Confidence</span>
                      <span className="font-bold text-slate-800">{formatNumber(hoveredTrade.confidence * 100, 0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Window</span>
                      <span className="font-bold text-slate-800">{hoveredTrade.window.tradeCount}</span>
                    </div>
                  </div>
                  {hoveredTrade.isBadTrade && hoveredTrade.badReason && (
                    <div className="mt-2.5 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200/60">
                      <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        {hoveredTrade.badReason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span suppressHydrationWarning>{new Date(minTime).toLocaleTimeString()}</span>
              <span suppressHydrationWarning>{new Date(maxTime).toLocaleTimeString()}</span>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        <div className="relative rounded-2xl overflow-hidden">
          <ShineBorder
            shineColor={["#f9a8d4", "#fcd34d", "#a5f3fc"]}
            borderWidth={2}
            duration={10}
            className="rounded-2xl"
          />
          <Card className="border border-white/60 bg-white/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-300/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight text-slate-900">Agent Performance</CardTitle>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                  {trades.length} trades
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100/80">
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Agent</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Strategy</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Max Position</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Risk Level</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Tokens</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Min Conf.</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Trades</th>
                      <th className="pb-2.5 pr-4 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Behavior</th>
                      <th className="pb-2.5 font-bold text-slate-600 tracking-wide uppercase text-[10px]">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {agentStats.map((stat, idx) => {
                      const agentConfig = dbAgents[stat.id]?.config;
                      const riskLevelDisplay: Record<string, { label: string; color: string }> = {
                        low: { label: "Low", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                        medium: { label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
                        high: { label: "High", color: "text-red-600 bg-red-50 border-red-200" },
                      };
                      const riskLevel = riskLevelDisplay[agentConfig?.risk_tolerance || "medium"] || riskLevelDisplay.medium;

                      return (
                        <tr
                          key={stat.id}
                          className={`border-b border-slate-50/80 last:border-0 transition-colors hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-slate-25/30' : ''}`}
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${stat.dot} shadow-sm`} />
                              <span className="font-bold text-slate-900">{stat.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{stat.role}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 capitalize">
                              {agentConfig?.strategy || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-mono font-semibold text-slate-800">
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
                                <span key={token} className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[9px] font-bold text-sky-700">
                                  {token}
                                </span>
                              ))}
                              {(agentConfig?.preferred_tokens?.length || 0) > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-medium text-slate-500">
                                  +{(agentConfig?.preferred_tokens?.length || 0) - 3}
                                </span>
                              )}
                              {!agentConfig?.preferred_tokens?.length && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-400"
                                  style={{ width: `${agentConfig?.min_confidence || 0}%` }}
                                />
                              </div>
                              <span className="font-mono font-semibold text-slate-800">
                                {agentConfig?.min_confidence ? `${agentConfig.min_confidence}%` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-slate-800">{stat.totalTrades}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className={`text-[10px] font-bold ${behaviorBadgeClasses[stat.behavior as AgentBehavior]}`}>
                              {behaviorLabels[stat.behavior as AgentBehavior]}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-slate-500" suppressHydrationWarning>
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
