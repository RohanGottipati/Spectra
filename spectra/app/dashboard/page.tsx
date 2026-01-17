"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BehaviorClass = "normal" | "suspicious" | "anomalous";

interface Trade {
  id: string;
  agent: string;
  action: string;
  token: string;
  amount: number;
  timestamp: Date;
  behavior: BehaviorClass;
  reason: string;
}

function classifyTrade(amount: number, action: string): { behavior: BehaviorClass; reason: string } {
  if (amount > 10000) {
    return { behavior: "anomalous", reason: "Volume exceeds threshold" };
  }
  if (amount > 5000 && action === "sell") {
    return { behavior: "suspicious", reason: "Large sell detected" };
  }
  if (Math.random() < 0.15) {
    return { behavior: "suspicious", reason: "Pattern deviation" };
  }
  return { behavior: "normal", reason: "Within parameters" };
}

const badgeVariant: Record<BehaviorClass, "default" | "secondary" | "destructive" | "outline"> = {
  normal: "secondary",
  suspicious: "outline",
  anomalous: "destructive",
};

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Form state
  const [agent, setAgent] = useState("alpha");
  const [action, setAction] = useState("buy");
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState("");

  const addTrade = useCallback((t: Omit<Trade, "behavior" | "reason">) => {
    const { behavior, reason } = classifyTrade(t.amount, t.action);
    setTrades((prev) => [{ ...t, behavior, reason }, ...prev].slice(0, 30));
  }, []);

  const toggleSimulation = () => {
    if (isRunning && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsRunning(false);
    } else {
      const id = setInterval(() => {
        const agents = ["alpha", "beta", "gamma"];
        const actions = ["buy", "sell", "swap"];
        const tokens = ["SOL", "USDC", "RAY", "JUP"];
        addTrade({
          id: crypto.randomUUID(),
          agent: agents[Math.floor(Math.random() * agents.length)],
          action: actions[Math.floor(Math.random() * actions.length)],
          token: tokens[Math.floor(Math.random() * tokens.length)],
          amount: Math.round(Math.random() * 8000),
          timestamp: new Date(),
        });
      }, 2000);
      setIntervalId(id);
      setIsRunning(true);
    }
  };

  const submitTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    addTrade({
      id: crypto.randomUUID(),
      agent,
      action,
      token,
      amount: parseFloat(amount),
      timestamp: new Date(),
    });
    setAmount("");
  };

  const normal = trades.filter((t) => t.behavior === "normal").length;
  const suspicious = trades.filter((t) => t.behavior === "suspicious").length;
  const anomalous = trades.filter((t) => t.behavior === "anomalous").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold">
            spectra
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-lg font-semibold">Behavior Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Simulate agent trades and analyze behavior patterns
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="text-2xl font-semibold">{trades.length}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Normal</p>
              <p className="text-2xl font-semibold text-emerald-600">{normal}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Suspicious</p>
              <p className="text-2xl font-semibold text-amber-600">{suspicious}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">Anomalous</p>
              <p className="text-2xl font-semibold text-red-600">{anomalous}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Simulation Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Simulation</CardTitle>
                <CardDescription>Auto-generate trades for testing</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={toggleSimulation}
                  variant={isRunning ? "destructive" : "default"}
                  className="w-full"
                >
                  {isRunning ? "Stop" : "Start"} Simulation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Trade</CardTitle>
                <CardDescription>Submit a custom trade</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitTrade} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Agent</Label>
                      <Select value={agent} onValueChange={setAgent}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alpha">Alpha</SelectItem>
                          <SelectItem value="beta">Beta</SelectItem>
                          <SelectItem value="gamma">Gamma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Action</Label>
                      <Select value={action} onValueChange={setAction}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Buy</SelectItem>
                          <SelectItem value="sell">Sell</SelectItem>
                          <SelectItem value="swap">Swap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Token</Label>
                      <Select value={token} onValueChange={setToken}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOL">SOL</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="RAY">RAY</SelectItem>
                          <SelectItem value="JUP">JUP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Submit
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Real-time trade classifications</CardDescription>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    No trades yet. Start the simulation or submit a trade.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {trades.map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{trade.agent}</span>
                            <Badge variant={badgeVariant[trade.behavior]}>
                              {trade.behavior}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {trade.action.toUpperCase()} {trade.amount.toLocaleString()} {trade.token}
                            <span className="mx-1">·</span>
                            {trade.reason}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {trade.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
