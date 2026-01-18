import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { connection, isValidPublicKey, toPublicKey } from '@/lib/solana/connection';
import { WalletMonitor } from '@/lib/solana/wallet-monitor';
import { getTransactionDetails } from '@/lib/solana/transaction-parser';

// Store active monitors in memory (in production, use Redis or similar)
const activeMonitors = new Map<string, WalletMonitor>();

interface MonitorRequest {
  agentId: string;
  walletAddress: string;
  action: 'start' | 'stop' | 'status';
}

export async function POST(request: NextRequest) {
  try {
    const body: MonitorRequest = await request.json();
    const { agentId, walletAddress, action } = body;

    if (!agentId || !walletAddress || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, walletAddress, action' },
        { status: 400 }
      );
    }

    if (!isValidPublicKey(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
        { status: 400 }
      );
    }

    const monitorKey = `${agentId}:${walletAddress}`;
    const supabase = await createClient();

    switch (action) {
      case 'start': {
        // Stop existing monitor if any
        const existing = activeMonitors.get(monitorKey);
        if (existing) {
          existing.stop();
        }

        // Create new monitor
        const monitor = new WalletMonitor({
          walletAddress,
          agentId,
          connection,
          onTransaction: async ({ signature, parsedData }) => {
            // Store transaction in Supabase
            try {
              const { error } = await supabase.from('trades').insert({
                id: signature,
                agent_id: agentId,
                action: parsedData.type === 'swap' ? 'swap' : parsedData.type === 'transfer' ? 'sell' : 'buy',
                token: parsedData.token || 'SOL',
                amount: parsedData.amount || 0,
                notional_usd: parsedData.valueUsd || 0,
                price_impact: 1.0, // Would need DEX data to calculate actual impact
                reasoning: parsedData.instruction || `Transaction: ${parsedData.type}`,
                created_at: new Date(parsedData.timestamp).toISOString(),
              });

              if (error) {
                console.error('Error storing transaction:', error);
              }
            } catch (error) {
              console.error('Error processing transaction callback:', error);
            }
          },
        });

        await monitor.start();
        activeMonitors.set(monitorKey, monitor);

        // Update agent wallet address in database
        await supabase
          .from('agents')
          .upsert({
            id: agentId,
            wallet_address: walletAddress,
            updated_at: new Date().toISOString(),
          });

        return NextResponse.json({
          success: true,
          message: `Started monitoring wallet ${walletAddress} for agent ${agentId}`,
        });
      }

      case 'stop': {
        const monitor = activeMonitors.get(monitorKey);
        if (monitor) {
          monitor.stop();
          activeMonitors.delete(monitorKey);
          return NextResponse.json({
            success: true,
            message: `Stopped monitoring wallet ${walletAddress}`,
          });
        }
        return NextResponse.json({
          success: false,
          message: 'Monitor not found',
        });
      }

      case 'status': {
        const isActive = activeMonitors.has(monitorKey);
        return NextResponse.json({
          active: isActive,
          walletAddress,
          agentId,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in monitor API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // List all active monitors
  const monitors = Array.from(activeMonitors.entries()).map(([key, monitor]) => {
    const [agentId, walletAddress] = key.split(':');
    return { agentId, walletAddress, active: true };
  });

  return NextResponse.json({ monitors });
}
