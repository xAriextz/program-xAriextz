/* @ts-nocheck */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "../idl/pay2msg.json";

import { PublicKey } from "@solana/web3.js";
export const PROGRAM_ID = new PublicKey(
  "Eq4oinoryPeSe3yL664Ux8q7FgdGRXTweW9uqVUTvn4n"
);

export function getProgram(connection: Connection, wallet: WalletContextState) {
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { preflightCommitment: "processed" }
  );

  return new Program(idl as Idl, provider);
}
