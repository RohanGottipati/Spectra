import { NextRequest, NextResponse } from 'next/server';
import { connection } from '@/lib/solana/connection';
import { getTransactionDetails } from '@/lib/solana/transaction-parser';
import { isValidPublicKey } from '@/lib/solana/connection';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const signature = searchParams.get('signature');
    const walletAddress = searchParams.get('wallet');

    if (!signature && !walletAddress) {
      return NextResponse.json(
        { error: 'Missing signature or walletAddress parameter' },
        { status: 400 }
      );
    }

    if (signature) {
      // Get specific transaction
      const txData = await getTransactionDetails(signature, connection);
      
      if (!txData) {
        return NextResponse.json(
          { error: 'Transaction not found or failed' },
          { status: 404 }
        );
      }

      return NextResponse.json(txData);
    }

    if (walletAddress) {
      if (!isValidPublicKey(walletAddress)) {
        return NextResponse.json(
          { error: 'Invalid wallet address' },
          { status: 400 }
        );
      }

      // Get recent transactions for wallet
      const limit = parseInt(searchParams.get('limit') || '20');
      const { PublicKey } = await import('@solana/web3.js');
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(walletAddress),
        { limit }
      );

      const transactions = await Promise.all(
        signatures.map(async (sigInfo) => {
          const txData = await getTransactionDetails(sigInfo.signature, connection);
          return {
            signature: sigInfo.signature,
            slot: sigInfo.slot,
            blockTime: sigInfo.blockTime,
            ...txData,
          };
        })
      );

      return NextResponse.json({
        wallet: walletAddress,
        transactions: transactions.filter(Boolean),
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
