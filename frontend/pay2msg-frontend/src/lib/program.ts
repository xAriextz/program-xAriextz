import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "../idl/pay2msg.json";

export const PROGRAM_ID = new PublicKey(
  "Eq4oinoryPeSe3yL664Ux8q7FgdGRXTweW9uqVUTvn4n"
);

// Adapt wallet-adapter's WalletContextState to Anchor's Wallet type
function walletAdapterToAnchorWallet(wallet: WalletContextState): Wallet {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error("Wallet not ready");
  }

  return {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  };
}

export function getProgram(connection: Connection, wallet: WalletContextState) {
  const provider = new AnchorProvider(
    connection,
    walletAdapterToAnchorWallet(wallet),
    { preflightCommitment: "processed" }
  );

  return new Program(idl as Idl, PROGRAM_ID, provider);
}
