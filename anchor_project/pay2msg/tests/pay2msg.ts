import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pay2msg } from "../target/types/pay2msg";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

describe("pay2msg", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Pay2msg as Program<Pay2msg>;
  const wallet = provider.wallet;

  const PROFILE_SEED = "profile";

  const MESSAGE_SEED = "message";

  async function createRecipientProfile(recipient: Keypair, priceLamports: BN) {
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(PROFILE_SEED), recipient.publicKey.toBuffer()],
      program.programId
    );

    // airdrop for fees
    const sig = await provider.connection.requestAirdrop(
      recipient.publicKey,
      1 * LAMPORTS_PER_SOL
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: sig,
      ...latestBlockhash,
    });

    await program.methods
      .registerUser(priceLamports)
      .accounts({
        profile: profilePda,
        owner: recipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([recipient])
      .rpc();

    return profilePda;
  }


  it("registers a user profile", async () => {
    const owner = wallet.publicKey;
    const priceLamports = new BN(1_000_000); // 0.001 SOL

    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(PROFILE_SEED), owner.toBuffer()],
      program.programId
    );

    await program.methods
      .registerUser(priceLamports)
      .accounts({
        profile: profilePda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePda);

    console.log("profile:", profile);

    // basic checks
    expect(profile.owner.toBase58()).to.equal(owner.toBase58());
    expect(profile.priceLamports.toNumber()).to.equal(priceLamports.toNumber());
  });

  it("updates the user price", async () => {
    const owner = wallet.publicKey;
    const oldPrice = new BN(1_000_000);
    const newPrice = new BN(2_000_000);

    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(PROFILE_SEED), owner.toBuffer()],
      program.programId
    );

    // ensure profile exists (first test already did this, but it's cheap to call again)
    try {
      await program.methods
        .registerUser(oldPrice)
        .accounts({
          profile: profilePda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (_) {
      // ignore if already initialized
    }

    await program.methods
      .updatePrice(newPrice)
      .accounts({
        profile: profilePda,
        owner,
      })
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePda);
    expect(profile.priceLamports.toNumber()).to.equal(newPrice.toNumber());
  });

  it("fails to update price from non-owner", async () => {
    const victim = Keypair.generate();
    const attacker = Keypair.generate();

    const priceLamports = new BN(1_000_000);
    const newPrice = new BN(2_000_000);

    const victimProfile = await createRecipientProfile(victim, priceLamports);

    const sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: sig,
      ...latestBlockhash,
    });

    let failed = false;

    try {
      await program.methods
        .updatePrice(newPrice)
        .accounts({
          profile: victimProfile,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
    } catch (_) {
      failed = true;
    }

    expect(failed).to.be.true;
  });


  it("fails to register the same profile twice", async () => {
    const owner = wallet.publicKey;
    const priceLamports = new BN(1_000_000);

    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(PROFILE_SEED), owner.toBuffer()],
      program.programId
    );

    let failed = false;

    try {
      await program.methods
        .registerUser(priceLamports)
        .accounts({
          profile: profilePda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (err) {
      failed = true;
    }

    expect(failed).to.be.true;
  });

  it("sends a paid message", async () => {
    const sender = wallet.publicKey;
    const recipient = Keypair.generate();
    const priceLamports = new BN(1_000_000);
    const amountLamports = new BN(2_000_000);
    const salt = new BN(1);

    const recipientProfile = await createRecipientProfile(recipient, priceLamports);

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(MESSAGE_SEED),
        recipient.publicKey.toBuffer(),
        sender.toBuffer(),
        salt.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .sendMessage(salt, amountLamports, "hello there")
      .accounts({
        sender,
        recipient: recipient.publicKey,
        recipientProfile,
        message: messagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const msgAccount = await program.account.message.fetch(messagePda);

    expect(msgAccount.sender.toBase58()).to.equal(sender.toBase58());
    expect(msgAccount.recipient.toBase58()).to.equal(recipient.publicKey.toBase58());
    expect(msgAccount.amountLamports.toNumber()).to.equal(amountLamports.toNumber());

    const info = await provider.connection.getAccountInfo(messagePda);
    expect(info).to.not.equal(null);
    if (info) {
      expect(info.lamports).to.be.gte(amountLamports.toNumber());
    }
  });

  it("fails to send message if underpriced", async () => {
    const sender = wallet.publicKey;
    const recipient = Keypair.generate();
    const priceLamports = new BN(1_000_000);
    const amountLamports = new BN(500_000); // below price
    const salt = new BN(2);

    const recipientProfile = await createRecipientProfile(recipient, priceLamports);

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(MESSAGE_SEED),
        recipient.publicKey.toBuffer(),
        sender.toBuffer(),
        salt.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    let failed = false;

    try {
      await program.methods
        .sendMessage(salt, amountLamports, "too cheap")
        .accounts({
          sender,
          recipient: recipient.publicKey,
          recipientProfile,
          message: messagePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (_) {
      failed = true;
    }

    expect(failed).to.be.true;
  });

  it("reads and claims a message", async () => {
    const sender = wallet.publicKey;
    const recipient = Keypair.generate();
    const priceLamports = new BN(1_000_000);
    const amountLamports = new BN(2_000_000);
    const salt = new BN(3);

    const recipientProfile = await createRecipientProfile(recipient, priceLamports);

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(MESSAGE_SEED),
        recipient.publicKey.toBuffer(),
        sender.toBuffer(),
        salt.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .sendMessage(salt, amountLamports, "to be claimed")
      .accounts({
        sender,
        recipient: recipient.publicKey,
        recipientProfile,
        message: messagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const balanceBefore = await provider.connection.getBalance(recipient.publicKey);

    await program.methods
      .readAndClaim()
      .accounts({
        recipient: recipient.publicKey,
        recipientProfile,
        message: messagePda,
      })
      .signers([recipient])
      .rpc();

    const balanceAfter = await provider.connection.getBalance(recipient.publicKey);
    expect(balanceAfter).to.be.greaterThan(balanceBefore);

    const info = await provider.connection.getAccountInfo(messagePda);
    expect(info).to.equal(null);
  });

  it("fails to read and claim from non-recipient", async () => {
    const sender = wallet.publicKey;
    const legitRecipient = Keypair.generate();
    const attacker = Keypair.generate();

    const priceLamports = new BN(1_000_000);
    const amountLamports = new BN(2_000_000);
    const salt = new BN(4);

    const legitProfile = await createRecipientProfile(legitRecipient, priceLamports);

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(MESSAGE_SEED),
        legitRecipient.publicKey.toBuffer(),
        sender.toBuffer(),
        salt.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .sendMessage(salt, amountLamports, "secret")
      .accounts({
        sender,
        recipient: legitRecipient.publicKey,
        recipientProfile: legitProfile,
        message: messagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const attackerProfile = await createRecipientProfile(attacker, priceLamports);

    let failed = false;

    try {
      await program.methods
        .readAndClaim()
        .accounts({
          recipient: attacker.publicKey,
          recipientProfile: attackerProfile,
          message: messagePda,
        })
        .signers([attacker])
        .rpc();
    } catch (_) {
      failed = true;
    }

    expect(failed).to.be.true;
  });
});
