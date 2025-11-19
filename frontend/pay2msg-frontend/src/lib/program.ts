// src/lib/program.ts
import {
  AnchorProvider,
  Idl,
  Program,
  type Wallet,
} from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "../idl/pay2msg.json";

export function getProgram(connection: Connection, wallet: WalletContextState) {
  // Adaptamos el wallet de wallet-adapter al tipo Wallet de Anchor.
  // Pasamos por `unknown` para que no haya chequeo estructural estricto
  // y sin usar `any` (así no se queja ESLint).
  const anchorWallet = wallet as unknown as Wallet;

  const provider = new AnchorProvider(connection, anchorWallet, {
    preflightCommitment: "processed",
  });

  return new Program(idl as Idl, provider);
}

