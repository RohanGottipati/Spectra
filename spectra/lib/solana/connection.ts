import { Connection, PublicKey } from '@solana/web3.js';

// Use devnet for development, can be switched to mainnet-beta
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  process.env.SOLANA_RPC_URL || 
  'https://api.devnet.solana.com';

export const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export function createConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl || SOLANA_RPC_URL, 'confirmed');
}

export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function toPublicKey(address: string): PublicKey {
  try {
    return new PublicKey(address);
  } catch (error) {
    throw new Error(`Invalid Solana address: ${address}`);
  }
}
