import { ParsedTransactionWithMeta, PartiallyDecodedInstruction, ParsedInstruction } from '@solana/web3.js';

export interface ParsedTransactionData {
  signature: string;
  timestamp: number;
  type: 'swap' | 'transfer' | 'x402_payment' | 'unknown';
  amount?: number;
  token?: string;
  from?: string;
  to?: string;
  programs: string[];
  valueUsd?: number;
  instruction?: string;
}

/**
 * Parse a Solana transaction into a human-readable format
 */
export async function parseTransaction(
  tx: ParsedTransactionWithMeta | null,
  signature: string
): Promise<ParsedTransactionData | null> {
  if (!tx || tx.meta?.err) {
    return null; // Transaction failed or doesn't exist
  }

  const parsed: ParsedTransactionData = {
    signature,
    timestamp: (tx.blockTime || Date.now() / 1000) * 1000,
    type: 'unknown',
    programs: [],
    amount: 0,
  };

  // Extract program IDs
  if (tx.transaction.message.accountKeys) {
    parsed.programs = tx.transaction.message.accountKeys
      .map(key => (typeof key === 'string' ? key : key.pubkey.toBase58()))
      .filter(Boolean);
  }

  // Parse instructions
  const instructions = tx.transaction.message.instructions || [];
  
  for (const ix of instructions) {
    const parsedIx = parseInstruction(ix);
    if (parsedIx) {
      parsed.type = parsedIx.type ?? parsed.type;
      parsed.amount = parsedIx.amount || parsed.amount;
      parsed.token = parsedIx.token || parsed.token;
      parsed.from = parsedIx.from || parsed.from;
      parsed.to = parsedIx.to || parsed.to;
      parsed.instruction = parsedIx.instruction || parsed.instruction;
      
      if (parsedIx.type !== 'unknown') {
        break; // Use first meaningful instruction
      }
    }
  }

  // Calculate USD value (simplified - would need price oracle in production)
  if (parsed.amount) {
    // Rough estimate: SOL ~$100, USDC ~$1, etc.
    const token = parsed.token?.toUpperCase() || 'SOL';
    if (token === 'USDC' || token === 'USDT') {
      parsed.valueUsd = parsed.amount;
    } else if (token === 'SOL') {
      parsed.valueUsd = parsed.amount * 100; // Approximate
    } else {
      parsed.valueUsd = parsed.amount * 1; // Default fallback
    }
  }

  // Check for x402 payment (common program IDs)
  if (parsed.programs.some(p => p.includes('x402') || p.includes('payment'))) {
    parsed.type = 'x402_payment';
  }

  return parsed;
}

function parseInstruction(ix: ParsedInstruction | PartiallyDecodedInstruction): Partial<ParsedTransactionData> | null {
  if ('parsed' in ix && ix.parsed) {
    // Parsed instruction (Token Program, System Program, etc.)
    return parseParsedInstruction(ix.parsed);
  } else if ('data' in ix && ix.data) {
    // Partially decoded - would need program-specific parsing
    return {
      type: 'unknown',
      instruction: `Program: ${ix.programId}`,
    };
  }
  return null;
}

function parseParsedInstruction(parsed: any): Partial<ParsedTransactionData> | null {
  const type = parsed.type;

  switch (type) {
    case 'transfer':
      return {
        type: 'transfer',
        amount: parsed.info.lamports ? parsed.info.lamports / 1e9 : undefined, // Convert lamports to SOL
        token: 'SOL',
        from: parsed.info.source,
        to: parsed.info.destination,
        instruction: `Transfer ${parsed.info.lamports / 1e9} SOL`,
      };

    case 'transferChecked':
    case 'transferChecked2':
      return {
        type: 'transfer',
        amount: parsed.info.tokenAmount?.uiAmount || parsed.info.amount,
        token: parsed.info.mint,
        from: parsed.info.authority || parsed.info.source,
        to: parsed.info.destination,
        instruction: `Transfer ${parsed.info.tokenAmount?.uiAmount || parsed.info.amount} tokens`,
      };

    case 'swap':
      return {
        type: 'swap',
        amount: parsed.info.amountIn || parsed.info.amountOut,
        token: parsed.info.tokenIn || parsed.info.tokenOut,
        instruction: `Swap ${parsed.info.tokenIn} for ${parsed.info.tokenOut}`,
      };

    default:
      return {
        type: 'unknown',
        instruction: `Instruction: ${type}`,
      };
  }
}

/**
 * Get transaction details by signature
 */
export async function getTransactionDetails(
  signature: string,
  connection: any
): Promise<ParsedTransactionData | null> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    return parseTransaction(tx, signature);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}
