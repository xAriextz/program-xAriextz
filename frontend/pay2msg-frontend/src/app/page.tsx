"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import { getProgram } from "@/lib/program";
import { useState } from 'react';

export default function Home() {
  return (
    <>
      <ProfileSection />
      <SendMessageSection />
      <InboxSection />
    </>
  );
}



const PROFILE_SEED = "profile";

function ProfileSection() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [priceSol, setPriceSol] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  if (!wallet.publicKey) {
    return (
      <div className="mt-6 rounded-xl border p-4">
        <p className="text-sm">Connect your wallet to manage your profile.</p>
      </div>
    );
  }

  const handleRegister = async () => {
    try {
      setStatus("Registering profile...");
      const program = getProgram(connection, wallet);

      const owner = wallet.publicKey!;
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PROFILE_SEED), owner.toBuffer()],
        program.programId
      );

      const lamports = new BN(
        Math.floor(Number(priceSol || "0") * LAMPORTS_PER_SOL)
      );

      await program.methods
        .registerUser(lamports)
        .accounts({
          profile: profilePda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus("Profile registered");
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    try {
      setStatus("Updating price...");
      const program = getProgram(connection, wallet);

      const owner = wallet.publicKey!;
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PROFILE_SEED), owner.toBuffer()],
        program.programId
      );

      const lamports = new BN(
        Math.floor(Number(priceSol || "0") * LAMPORTS_PER_SOL)
      );

      await program.methods
        .updatePrice(lamports)
        .accounts({
          profile: profilePda,
          owner,
        })
        .rpc();

      setStatus("Price updated");
    } catch (e: unknown) {
      console.error(e);
    }
  };

  return (
    <div className="mt-6 rounded-xl border p-4 flex flex-col gap-3 max-w-md">
      <h2 className="text-lg font-semibold">Profile</h2>
      <label className="text-sm">
        Message price (SOL)
        <input
          type="number"
          min="0"
          step="0.000000001"
          value={priceSol}
          onChange={(e) => setPriceSol(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={handleRegister}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          Register profile
        </button>
        <button
          onClick={handleUpdate}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white"
        >
          Update price
        </button>
      </div>
      {status && <p className="text-xs text-gray-500">{status}</p>}
    </div>
  );
}

const MESSAGE_SEED = "message";

function SendMessageSection() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [recipientStr, setRecipientStr] = useState("");
  const [amountSol, setAmountSol] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  if (!wallet.publicKey) {
    return (
      <div className="mt-6 rounded-xl border p-4">
        <p className="text-sm">Connect your wallet to send messages.</p>
      </div>
    );
  }

  const handleSend = async () => {
    try {
      setStatus("Sending message...");

      const program = getProgram(connection, wallet);
      const sender = wallet.publicKey!;
      const recipient = new PublicKey(recipientStr);

      const salt = new BN(Date.now()); // simple salt based on timestamp

      const [messagePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(MESSAGE_SEED),
          recipient.toBuffer(),
          sender.toBuffer(),
          salt.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const lamports = new BN(
        Math.floor(Number(amountSol || "0") * LAMPORTS_PER_SOL)
      );

      await program.methods
        .sendMessage(salt, lamports, content)
        .accounts({
          sender,
          recipient,
          recipientProfile: PublicKey.findProgramAddressSync(
            [Buffer.from("profile"), recipient.toBuffer()],
            program.programId
          )[0],
          message: messagePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus("Message sent");
    } catch (e: unknown) {
      console.error(e);
    }
  };

  return (
    <div className="mt-6 rounded-xl border p-4 flex flex-col gap-3 max-w-md">
      <h2 className="text-lg font-semibold">Send message</h2>

      <label className="text-sm">
        Recipient address
        <input
          type="text"
          value={recipientStr}
          onChange={(e) => setRecipientStr(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </label>

      <label className="text-sm">
        Amount (SOL)
        <input
          type="number"
          min="0"
          step="0.000000001"
          value={amountSol}
          onChange={(e) => setAmountSol(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </label>

      <label className="text-sm">
        Message
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
        />
      </label>

      <button
        onClick={handleSend}
        className="rounded bg-purple-600 px-3 py-1 text-sm text-white"
      >
        Send message
      </button>

      {status && <p className="text-xs text-gray-500">{status}</p>}
    </div>
  );
}

function InboxSection() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [messages, setMessages] = useState<
    { pubkey: PublicKey; sender: string; amountSol: number; content: string }[]
  >([]);
  const [status, setStatus] = useState("");

  if (!wallet.publicKey) {
    return (
      <div className="mt-6 rounded-xl border p-4">
        <p className="text-sm">Connect your wallet to view your inbox.</p>
      </div>
    );
  }

  const loadInbox = async () => {
    try {
      setStatus("Loading inbox...");
      const program = getProgram(connection, wallet);
      // @ts-expect-error Anchor's AccountNamespace typing does not expose 'message' here
      const all = await program.account.message.all([
        {
          memcmp: {
            // 8 (discriminator) + 32 (sender)
            offset: 8 + 32,
            bytes: wallet.publicKey!.toBase58(),
          },
        },
      ]);

      type RawMessageAccount = {
        publicKey: PublicKey;
        account: {
          sender: PublicKey;
          amountLamports: BN;
          content: string;
        };
      };

      const allTyped = all as RawMessageAccount[];

      const items = allTyped.map((m) => ({
        pubkey: m.publicKey,
        sender: m.account.sender.toBase58(),
        amountSol: m.account.amountLamports.toNumber() / LAMPORTS_PER_SOL,
        content: m.account.content,
      }));


      setMessages(items);
      setStatus(`Loaded ${items.length} messages`);
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const handleClaim = async (messagePubkey: PublicKey) => {
    try {
      setStatus("Claiming message...");

      const program = getProgram(connection, wallet);
      const recipient = wallet.publicKey!;

      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PROFILE_SEED), recipient.toBuffer()],
        program.programId
      );

      await program.methods
        .readAndClaim()
        .accounts({
          recipient,
          recipientProfile: profilePda,
          message: messagePubkey,
        })
        .rpc();

      setStatus("Message claimed");
      // reload inbox
      await loadInbox();
    } catch (e: unknown) {
      console.error(e);
    }
  };

  return (
    <div className="mt-6 rounded-xl border p-4 flex flex-col gap-3 max-w-xl">
      <h2 className="text-lg font-semibold">Inbox</h2>

      <button
        onClick={loadInbox}
        className="self-start rounded bg-slate-700 px-3 py-1 text-sm text-white"
      >
        Load inbox
      </button>

      {messages.length === 0 && (
        <p className="text-sm text-gray-500">No messages loaded.</p>
      )}

      <div className="flex flex-col gap-2">
        {messages.map((m) => (
          <div
            key={m.pubkey.toBase58()}
            className="rounded border px-3 py-2 text-sm flex flex-col gap-1"
          >
            <div className="flex justify-between">
              <span className="font-mono text-xs truncate">
                From: {m.sender}
              </span>
              <span className="font-semibold">
                {m.amountSol.toFixed(6)} SOL
              </span>
            </div>
            <p className="text-sm">{m.content}</p>
            <button
              onClick={() => handleClaim(m.pubkey)}
              className="mt-1 self-start rounded bg-green-600 px-2 py-1 text-xs text-white"
            >
              Read & claim
            </button>
          </div>
        ))}
      </div>

      {status && <p className="text-xs text-gray-500">{status}</p>}
    </div>
  );
}
