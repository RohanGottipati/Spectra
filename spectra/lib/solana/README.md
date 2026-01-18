# Solana Integration

This directory contains the Solana blockchain integration for Spectra.

## Features

- **Real-time Wallet Monitoring**: Monitor Solana wallets via RPC WebSocket subscriptions
- **Transaction Parsing**: Automatically decode Solana transactions into human-readable format
- **Live Data Feed**: Stream transactions directly to the dashboard in real-time

## Setup

### Environment Variables

Add to your `.env.local`:

```bash
# Solana RPC URL (optional, defaults to devnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
# Or use a custom RPC provider (recommended for production)
# NEXT_PUBLIC_SOLANA_RPC_URL=https://your-rpc-provider.com

# Supabase (required for storing transactions)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### RPC Providers

For production, consider using dedicated RPC providers:
- **Helius**: https://www.helius.dev/
- **Triton**: https://triton.one/
- **QuickNode**: https://www.quicknode.com/

These provide higher rate limits and better reliability than public RPC endpoints.

## Usage

### 1. Configure Wallet Address

In the dashboard:
1. Click "Config" button
2. Select an agent (Alpha, Beta, or Gamma)
3. Enter the Solana wallet address you want to monitor
4. Click "Start Monitor" to begin monitoring

### 2. Monitor Transactions

Once monitoring is started:
- The system will watch for new transactions on the specified wallet
- Transactions are automatically parsed and stored in Supabase
- Real-time updates appear in the dashboard transaction feed

### 3. API Endpoints

#### Start Monitoring
```bash
POST /api/solana/monitor
{
  "agentId": "alpha",
  "walletAddress": "YourSolanaWalletAddress...",
  "action": "start"
}
```

#### Stop Monitoring
```bash
POST /api/solana/monitor
{
  "agentId": "alpha",
  "walletAddress": "YourSolanaWalletAddress...",
  "action": "stop"
}
```

#### Get Transaction Details
```bash
GET /api/solana/transaction?signature=transaction_signature
```

#### Get Wallet Transactions
```bash
GET /api/solana/transaction?wallet=wallet_address&limit=20
```

## Architecture

```
┌─────────────────┐
│   Dashboard     │
│  (React/Next)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Routes     │
│ /api/solana/*   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ WalletMonitor   │◄─────┤  Solana RPC      │
│  (WebSocket)    │      │  Connection      │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Transaction     │─────►│   Supabase DB    │
│    Parser       │      │   (trades table) │
└─────────────────┘      └──────────────────┘
```

## Files

- `connection.ts`: Solana RPC connection utilities
- `transaction-parser.ts`: Parse Solana transactions into readable format
- `wallet-monitor.ts`: Monitor wallet for new transactions via WebSocket

## Transaction Types Supported

- **Transfer**: SOL and SPL token transfers
- **Swap**: DEX swaps (Jupiter, Raydium, etc.)
- **x402 Payment**: x402 protocol payments
- **Unknown**: Other transaction types (basic parsing)

## Notes

- Monitoring is stored in memory (restart clears active monitors)
- For production, consider using Redis or a database to persist monitor state
- Transaction parsing may need enhancement for custom programs
- USD value calculation is approximate (would need price oracle for accuracy)
