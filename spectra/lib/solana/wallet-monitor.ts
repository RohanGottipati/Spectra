import { Connection, PublicKey } from '@solana/web3.js';
import { parseTransaction } from './transaction-parser';

export interface WalletMonitorOptions {
  walletAddress: string;
  agentId: string;
  onTransaction: (data: {
    signature: string;
    agentId: string;
    parsedData: any;
  }) => void;
  connection: Connection;
}

export class WalletMonitor {
  private subscriptionId: number | null = null;
  private walletPubkey: PublicKey;
  private connection: Connection;
  private agentId: string;
  private onTransaction: WalletMonitorOptions['onTransaction'];
  private processedSignatures: Set<string> = new Set();

  constructor(options: WalletMonitorOptions) {
    this.walletPubkey = new PublicKey(options.walletAddress);
    this.connection = options.connection;
    this.agentId = options.agentId;
    this.onTransaction = options.onTransaction;
  }

  /**
   * Start monitoring the wallet for transactions
   */
  async start(): Promise<void> {
    if (this.subscriptionId !== null) {
      console.warn('Wallet monitor already running');
      return;
    }

    try {
      // Subscribe to account changes (when wallet balance changes)
      this.subscriptionId = this.connection.onAccountChange(
        this.walletPubkey,
        async (accountInfo, context) => {
          // When account changes, fetch recent transactions
          await this.fetchRecentTransactions();
        },
        'confirmed'
      );

      // Also subscribe to logs for transaction signatures
      const logsSubscriptionId = this.connection.onLogs(
        this.walletPubkey,
        async (logs, context) => {
          if (!logs.err && logs.signature) {
            await this.processTransaction(logs.signature);
          }
        },
        'confirmed'
      );

      // Store logs subscription ID for cleanup (need to track both)
      (this as any).logsSubscriptionId = logsSubscriptionId;

      console.log(`Started monitoring wallet: ${this.walletPubkey.toBase58()}`);
    } catch (error) {
      console.error('Error starting wallet monitor:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring the wallet
   */
  stop(): void {
    if (this.subscriptionId !== null) {
      this.connection.removeAccountChangeListener(this.subscriptionId);
      this.subscriptionId = null;
    }

    if ((this as any).logsSubscriptionId !== null) {
      this.connection.removeOnLogsListener((this as any).logsSubscriptionId);
      (this as any).logsSubscriptionId = null;
    }

    this.processedSignatures.clear();
    console.log('Stopped monitoring wallet');
  }

  /**
   * Fetch recent transactions for the wallet
   */
  private async fetchRecentTransactions(): Promise<void> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.walletPubkey,
        { limit: 10 }
      );

      for (const sigInfo of signatures) {
        if (!this.processedSignatures.has(sigInfo.signature)) {
          await this.processTransaction(sigInfo.signature);
        }
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    }
  }

  /**
   * Process a transaction signature
   */
  private async processTransaction(signature: string): Promise<void> {
    if (this.processedSignatures.has(signature)) {
      return; // Already processed
    }

    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      const parsedData = await parseTransaction(tx, signature);
      
      if (parsedData) {
        this.processedSignatures.add(signature);
        
        this.onTransaction({
          signature,
          agentId: this.agentId,
          parsedData,
        });
      }
    } catch (error) {
      console.error(`Error processing transaction ${signature}:`, error);
    }
  }

  /**
   * Manually fetch and process recent transactions
   */
  async syncRecentTransactions(limit = 20): Promise<void> {
    await this.fetchRecentTransactions();
  }
}
