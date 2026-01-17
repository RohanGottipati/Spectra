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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AgentId = "alpha" | "beta" | "gamma";
type TradeAction = "buy" | "sell" | "swap";
type TradeBehavior = "conservative" | "aggressive" | "anomalous" | "rogue";
type AgentBehavior = TradeBehavior | "dormant";

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

const AGENTS: { id: AgentId; name: string; role: string; color: string; dot: string }[] = [
  { id: "alpha", name: "Alpha", role: "Arb desk", color: "#0ea5e9", dot: "bg-sky-500" },
  { id: "beta", name: "Beta", role: "Momentum", color: "#22c55e", dot: "bg-emerald-500" },
  { id: "gamma", name: "Gamma", role: "Liquidity", color: "#f97316", dot: "bg-orange-500" },
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
  anomalous: "border-rose-200 bg-rose-50 text-rose-700",
  rogue: "border-rose-300 bg-rose-100 text-rose-800",
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
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
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
function computeBehavior(trade: TradeInput, history: Trade[], badFlag: { isBadTrade: boolean; badReason?: string }) {
  const baseline = computeBaseline(history);
  const windowStart = trade.timestamp.getTime() - WINDOW_MS;
  const recent = [...history.filter((item) => item.timestamp.getTime() >= windowStart), trade];
  const window = buildWindow(recent);
  const freqPerMin = recent.length / (WINDOW_MS / 60000);
  const freqScore = clamp((freqPerMin / baseline.freqPerMin) * 30, 0, 40);
  const amountScore = clamp((window.avgAmount / baseline.avgAmount) * 30, 0, 35);
  const impactScore = clamp((window.avgImpact / baseline.avgImpact) * 20, 0, 25);
  const sellScore = window.sellRatio > 0.65 ? 8 : 0;
  const badScore = badFlag.isBadTrade ? 15 : 0;
  const riskScore = clamp(Math.round(freqScore + amountScore + impactScore + sellScore + badScore), 0, 100);
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
  const behaviorReason = reasons.length ? reasons.join("; ") : "Within baseline range";

  return { riskScore, behavior, behaviorReason, window };
}

function enrichTrade(trade: TradeInput, history: Trade[]) {
  const badFlag = detectBadTrade(trade);
  const behavior = computeBehavior(trade, history, badFlag);
  return { ...trade, ...badFlag, ...behavior };
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
      overrides.confidence ??
      Number((0.55 + Math.random() * 0.43).toFixed(2)),
    priceImpact:
      overrides.priceImpact ??
      Number((0.3 + Math.random() * 5.3).toFixed(2)),
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

  const [agent, setAgent] = useState<AgentId>("alpha");
  const [action, setAction] = useState<TradeAction>("buy");
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState("");

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
    [addTrades]
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
      })
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
      })
    );
    setAmount("");
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
    if (!selectedTradeId || !trades.some((trade) => trade.id === selectedTradeId)) {
      setSelectedTradeId(trades[0].id);
    }
  }, [trades, selectedTradeId]);

  const now = Date.now();

  const agentMap = useMemo(() => {
    return Object.fromEntries(AGENTS.map((agentMeta) => [agentMeta.id, agentMeta]));
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
      const recent = items.filter((trade) => trade.timestamp.getTime() >= now - WINDOW_MS);
      const recentRisk = recent.length ? average(recent.map((trade) => trade.riskScore)) : avgRisk;
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
    (trade) => trade.timestamp.getTime() >= now - WINDOW_MS
  );
  const anomalyCount = recentTrades.filter(
    (trade) => trade.behavior === "anomalous" || trade.behavior === "rogue"
  ).length;
  const badTradeCount = trades.filter((trade) => trade.isBadTrade).length;
  const avgRisk = average(trades.map((trade) => trade.riskScore));
  const activeAgents = agentStats.filter((stat) => stat.behavior !== "dormant").length;

  const visibleWindowMs = useMemo(() => {
    if (trades.length < 6) return 6 * 60 * 1000;
    const sorted = [...trades].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const recent = sorted.slice(-12);
    const span = recent[recent.length - 1].timestamp.getTime() - recent[0].timestamp.getTime();
    return clamp(span * 1.15, 2 * 60 * 1000, 30 * 60 * 1000);
  }, [trades]);
  const chartTimes = trades.map((trade) => trade.timestamp.getTime());
  const latestTradeTime = chartTimes.length ? Math.max(...chartTimes) : now;
  const visibleTrades = trades.filter(
    (trade) => trade.timestamp.getTime() >= latestTradeTime - visibleWindowMs
  );
  const visibleTimes = visibleTrades.map((trade) => trade.timestamp.getTime());
  const minVisibleTime = visibleTimes.length
    ? Math.min(...visibleTimes)
    : latestTradeTime - visibleWindowMs;
  const maxVisibleTime = visibleTimes.length ? Math.max(...visibleTimes) : latestTradeTime;
  const useExactSpan = visibleTrades.length >= 2;
  const minTime = useExactSpan ? minVisibleTime : maxVisibleTime - visibleWindowMs;
  const maxTime = maxVisibleTime;
  const span = Math.max(maxTime - minTime, 1);
  const visibleWindowLabel = Math.max(Math.round((maxTime - minTime) / 60000), 1);

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
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800">
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-lg shadow-black/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold text-lg text-slate-800">
            spectra
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Pricing
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Behavior classification cockpit</h1>
            <p className="text-sm text-slate-600">
              Rolling metrics compare frequency, size, and price impact to each agent baseline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 px-3 py-1 text-xs">
              <span className="text-slate-600">Trades/agent</span>
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
                className="h-6 w-14 border-white/40 bg-white/80 text-xs text-slate-800 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50"
              />
            </div>
            <Button
              onClick={toggleSimulation}
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              className={isRunning ? "" : "bg-slate-900 text-white border-0 shadow-md hover:bg-slate-800 transition-all"}
            >
              {isRunning ? "Stop" : "Start"} simulation
            </Button>
            <Button 
              onClick={injectBadTrade} 
              variant="outline" 
              size="sm"
              className="bg-white/70 backdrop-blur-xl border border-slate-200 text-slate-800 shadow-md hover:bg-white/90 transition-all"
            >
              Inject bad trade
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-slate-600 text-xs mb-2">Active agents</p>
              <p className="text-2xl font-bold text-slate-800">{activeAgents}</p>
              <p className="text-[11px] text-slate-500">Dormant: {AGENTS.length - activeAgents}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-slate-600 text-xs mb-2">Avg risk score</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(avgRisk, 1)}</p>
              <p className="text-[11px] text-slate-500">Rolling 12m window</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-slate-600 text-xs mb-2">Recent anomalies</p>
              <p className="text-2xl font-bold text-rose-600">{anomalyCount}</p>
              <p className="text-[11px] text-slate-500">Anomalous or rogue points</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-slate-600 text-xs mb-2">Bad trades flagged</p>
              <p className="text-2xl font-bold text-amber-600">{badTradeCount}</p>
              <p className="text-[11px] text-slate-500">Objective trade rules</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[2.2fr_1fr] gap-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Fleet behavior timeline</CardTitle>
              <CardDescription>
                All agents plotted together. Click any point to inspect the decision and behavior.
              </CardDescription>
              <CardAction>
                  <Badge variant="outline" className="text-xs">
                    Auto zoom: {visibleWindowLabel}m
                  </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-visible rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 p-4">
                <div className="relative z-10">
                  <div ref={chartWrapRef} className="relative">
                    {trades.length === 0 ? (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-600">
                        No trades yet. Start the simulation or add a manual trade.
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
                          const points = chartTradesByAgent[agentMeta.id].map((trade) => ({
                            trade,
                            x: getX(trade.timestamp.getTime()),
                            y: getY(trade.riskScore),
                          }));
                          if (!points.length) return null;
                          const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
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
                                const isSelected = selectedTradeId === point.trade.id;
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
                                      onClick={() => setSelectedTradeId(point.trade.id)}
                                    />
                                    <circle
                                      cx={point.x}
                                      cy={point.y}
                                      r={isSelected ? radius + 2 : radius}
                                      fill={agentMeta.color}
                                      stroke={isSelected ? "#0f172a" : point.trade.isBadTrade ? "#0f172a" : "transparent"}
                                      strokeWidth={isSelected ? 2 : point.trade.isBadTrade ? 1.5 : 0}
                                      pointerEvents="none"
                                    >
                                      <title>
                                        {agentMeta.name} {point.trade.action} {formatNumber(point.trade.amount)} {point.trade.token} - {behaviorLabels[point.trade.behavior]}
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
                        className="pointer-events-none absolute z-20 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl shadow-black/10 px-3 py-2 text-xs text-slate-700"
                        style={{
                          left: tooltipPosition.left,
                          top: tooltipPosition.top,
                          width: tooltipWidth,
                          transform: "translate(-50%, calc(-100% - 16px))",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${agentMap[selectedTrade.agent].dot}`} />
                            <p className="text-xs font-semibold text-slate-900">
                              {agentMap[selectedTrade.agent].name} {selectedTrade.action.toUpperCase()}
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
                          {formatNumber(selectedTrade.amount)} {selectedTrade.token} - {selectedTrade.strategy}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">{selectedTrade.decision}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            Risk <span className="font-semibold text-slate-900">{selectedTrade.riskScore}</span>
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
                        <p className="mt-2 text-[11px] text-slate-600">{selectedTrade.behaviorReason}</p>
                        {selectedTrade.isBadTrade && selectedTrade.badReason && (
                          <p className="mt-1 text-[11px] font-semibold text-rose-600">
                            Bad trade: {selectedTrade.badReason}
                          </p>
                        )}
                        <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/40 bg-white/95" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                    {AGENTS.map((agentMeta) => (
                      <div key={agentMeta.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${agentMeta.dot}`} />
                        <span>{agentMeta.name}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full border border-slate-400 bg-white" />
                      <span>Bad trade marker</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{new Date(minTime).toLocaleTimeString()}</span>
                    <span>{new Date(maxTime).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-600">Classification signals</p>
                    <p className="text-sm font-bold text-slate-800">Over time, not one trade</p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Frequency vs baseline</span>
                      <span className="font-medium text-slate-800">Rolling 12m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Position sizing drift</span>
                      <span className="font-medium text-slate-800">Avg notional</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Price impact trend</span>
                      <span className="font-medium text-slate-800">Impact delta</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bad trade rules</span>
                      <span className="font-medium text-slate-800">Objective flags</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Classification</span>
                      <span className="font-medium text-slate-800">Conservative to rogue</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/50 p-3 text-xs text-slate-600">
                    Spectra grades behavior over rolling windows to avoid punishing a single mistake.
                  </div>
                </div>

                <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-600">Adaptive timeline</p>
                    <p className="text-sm font-bold text-slate-800">Zooms with trading cadence</p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Visible window</span>
                      <span className="font-medium text-slate-800">{visibleWindowLabel}m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Behavior window</span>
                      <span className="font-medium text-slate-800">12m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trades per agent</span>
                      <span className="font-medium text-slate-800">{tradesPerAgent} / tick</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tick interval</span>
                      <span className="font-medium text-slate-800">1.8s</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/50 p-3 text-xs text-slate-600">
                    Click any point to open a tooltip anchored to the selected decision.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual trade</CardTitle>
                <CardDescription>Send a specific trade for classification.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitTrade} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-700">Agent</Label>
                      <Select
                        value={agent}
                        onValueChange={(value) => setAgent(value as AgentId)}
                      >
                        <SelectTrigger className="w-full mt-1 bg-white/70 backdrop-blur-xl border border-white/40 text-slate-800 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl shadow-black/10 rounded-2xl">
                          {AGENTS.map((agentMeta) => (
                            <SelectItem key={agentMeta.id} value={agentMeta.id} className="text-slate-800 hover:bg-slate-50">
                              {agentMeta.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-700">Action</Label>
                      <Select
                        value={action}
                        onValueChange={(value) => setAction(value as TradeAction)}
                      >
                        <SelectTrigger className="w-full mt-1 bg-white/70 backdrop-blur-xl border border-white/40 text-slate-800 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl shadow-black/10 rounded-2xl">
                          {ACTIONS.map((item) => (
                            <SelectItem key={item} value={item} className="text-slate-800 hover:bg-slate-50">
                              {item.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-700">Token</Label>
                      <Select value={token} onValueChange={setToken}>
                        <SelectTrigger className="w-full mt-1 bg-white/70 backdrop-blur-xl border border-white/40 text-slate-800 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl shadow-black/10 rounded-2xl">
                          {TOKENS.map((item) => (
                            <SelectItem key={item} value={item} className="text-slate-800 hover:bg-slate-50">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-700">Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="mt-1 bg-white/70 backdrop-blur-xl border border-white/40 text-slate-800 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-slate-900 text-white border-0 shadow-md hover:bg-slate-800 transition-all">
                    Submit trade
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Behavior labels</CardTitle>
                <CardDescription>Aligned with Spectra pitch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(["conservative", "aggressive", "anomalous", "rogue", "dormant"] as AgentBehavior[]).map(
                  (label) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className={behaviorBadgeClasses[label]}>
                        {behaviorLabels[label]}
                      </Badge>
                      <span className="text-slate-600">
                        {label === "conservative" && "Low risk, steady cadence"}
                        {label === "aggressive" && "Higher frequency, larger size"}
                        {label === "anomalous" && "Deviation from baseline"}
                        {label === "rogue" && "Critical, possible compromise"}
                        {label === "dormant" && "Inactive beyond expected window"}
                      </span>
                    </div>
                  )
                )}
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
            <div className="overflow-x-auto rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-600 border-b border-slate-200">
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
                    <tr key={stat.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${stat.dot}`} />
                          <div>
                            <p className="font-medium text-slate-800">{stat.name}</p>
                            <p className="text-[11px] text-slate-600">{stat.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{stat.totalTrades}</td>
                      <td className="py-3 pr-4 text-slate-700">{formatNumber(stat.avgAmount, 0)}</td>
                      <td className="py-3 pr-4 text-slate-700">{formatNumber(stat.avgRisk, 1)}</td>
                      <td className="py-3 pr-4 text-slate-700">{formatNumber(stat.avgConfidence * 100, 0)}%</td>
                      <td className="py-3 pr-4 text-slate-700">{stat.badTrades}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={behaviorBadgeClasses[stat.behavior]}>
                          {behaviorLabels[stat.behavior]}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-700">
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
