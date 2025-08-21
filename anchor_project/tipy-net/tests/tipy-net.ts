import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import { TipyNet } from "../target/types/tipy_net";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("tipy_net", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TipyNet as Program<TipyNet>;
  const connection = provider.connection;

  // Generate keypairs
  const sender = Keypair.generate();
  const tokenMint = Keypair.generate();

  // State accounts
  let senderTokenAccount: PublicKey;
  let invalidTokenAccount: PublicKey;

  // Constants
  const longMessage = "x".repeat(101);
  const validMessage = "Thank you for your service!";
  const tokenAmount = 1000;
  const solAmount = LAMPORTS_PER_SOL / 10; // 0.1 SOL

  before(async () => {
    // Fund sender wallet
    await airdrop(sender.publicKey, 10 * LAMPORTS_PER_SOL);

    // Create token mint
    await createMint(connection, sender, sender.publicKey, null, 9, tokenMint);

    // Create valid token accounts
    senderTokenAccount = await createTokenAccount(
      sender,
      tokenMint.publicKey,
      sender.publicKey
    );

    // Create invalid token account (wrong mint)
    const invalidMint = Keypair.generate();
    await createMint(
      connection,
      sender,
      sender.publicKey,
      null,
      9,
      invalidMint
    );
    invalidTokenAccount = await createTokenAccount(
      sender,
      invalidMint.publicKey,
      sender.publicKey
    );

    // Mint tokens to sender
    await mintTo(
      connection,
      sender,
      tokenMint.publicKey,
      senderTokenAccount,
      sender.publicKey,
      1000000
    );
  });

  // Helper functions
  async function airdrop(address: PublicKey, amount: number) {
    const signature = await connection.requestAirdrop(address, amount);
    await connection.confirmTransaction(signature);
  }

  async function createTokenAccount(
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey
  ) {
    return await createAccount(connection, payer, mint, owner);
  }

  // Helper to get PDA
  function getTransactionPDA(sender: PublicKey, receiver: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("tip_transaction"), sender.toBuffer(), receiver.toBuffer()],
      program.programId
    );
  }

  // Happy Path Tests
  it("SOL transfer: success with valid parameters", async () => {
    const receiver = Keypair.generate();
    const [transactionPDA] = getTransactionPDA(
      sender.publicKey,
      receiver.publicKey
    );
    const receiverTokenAccount = await createTokenAccount(
      sender,
      tokenMint.publicKey,
      receiver.publicKey
    );

    const tx = await program.methods
      .sendTip(new BN(solAmount), validMessage)
      .accounts({
        dataTransaction: transactionPDA,
        tokenMint: PublicKey.default,
        sender: sender.publicKey,
        receiver: receiver.publicKey,
        senderTokenAccount: senderTokenAccount,
        receiverTokenAccount: receiverTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([sender])
      .rpc();

    // Check transaction account
    const transactionAccount = await program.account.dataTransaction.fetch(
      transactionPDA
    );
    expect(transactionAccount.sender.equals(sender.publicKey)).to.be.true;
    expect(transactionAccount.receiver.equals(receiver.publicKey)).to.be.true;
    expect(transactionAccount.amount.toString()).to.equal(solAmount.toString());
    expect(transactionAccount.message).to.equal(validMessage);
    expect(transactionAccount.isSol).to.be.true;
  });

  it("SPL token transfer: success with valid parameters", async () => {
    const receiver = Keypair.generate();
    const [transactionPDA] = getTransactionPDA(
      sender.publicKey,
      receiver.publicKey
    );
    const receiverTokenAccount = await createTokenAccount(
      sender,
      tokenMint.publicKey,
      receiver.publicKey
    );

    const tx = await program.methods
      .sendTip(new BN(tokenAmount), validMessage)
      .accounts({
        dataTransaction: transactionPDA,
        tokenMint: tokenMint.publicKey,
        sender: sender.publicKey,
        receiver: receiver.publicKey,
        senderTokenAccount: senderTokenAccount,
        receiverTokenAccount: receiverTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([sender])
      .rpc();

    // Check transaction account
    const transactionAccount = await program.account.dataTransaction.fetch(
      transactionPDA
    );
    expect(transactionAccount.sender.equals(sender.publicKey)).to.be.true;
    expect(transactionAccount.receiver.equals(receiver.publicKey)).to.be.true;
    expect(transactionAccount.amount.toString()).to.equal(
      tokenAmount.toString()
    );
    expect(transactionAccount.message).to.equal(validMessage);
    expect(transactionAccount.isSol).to.be.false;

    // Check token balances
    const senderBalance = await getAccount(connection, senderTokenAccount);
    const receiverBalance = await getAccount(connection, receiverTokenAccount);
    expect(Number(senderBalance.amount)).to.equal(1000000 - tokenAmount);
    expect(Number(receiverBalance.amount)).to.equal(tokenAmount);
  });

  // Unhappy Path Tests
  it("fails with message longer than 100 characters", async () => {
    const receiver = Keypair.generate();
    const [transactionPDA] = getTransactionPDA(
      sender.publicKey,
      receiver.publicKey
    );
    const receiverTokenAccount = await createTokenAccount(
      sender,
      tokenMint.publicKey,
      receiver.publicKey
    );

    try {
      await program.methods
        .sendTip(new BN(solAmount), longMessage)
        .accounts({
          dataTransaction: transactionPDA,
          tokenMint: PublicKey.default,
          sender: sender.publicKey,
          receiver: receiver.publicKey,
          senderTokenAccount: senderTokenAccount,
          receiverTokenAccount: receiverTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([sender])
        .rpc();
      expect.fail("Transaction should have failed");
    } catch (err) {
      if (err instanceof AnchorError) {
        expect(err.error.errorCode.code).to.equal("MessageTooLong");
      } else {
        throw err;
      }
    }
  });

  it("fails with insufficient funds for SOL transfer", async () => {
    const receiver = Keypair.generate();
    const [transactionPDA] = getTransactionPDA(
      sender.publicKey,
      receiver.publicKey
    );
    const receiverTokenAccount = await createTokenAccount(
      sender,
      tokenMint.publicKey,
      receiver.publicKey
    );
    const insufficientAmount = 1000 * LAMPORTS_PER_SOL; // More than sender has

    try {
      await program.methods
        .sendTip(new BN(insufficientAmount), validMessage)
        .accounts({
          dataTransaction: transactionPDA,
          tokenMint: PublicKey.default,
          sender: sender.publicKey,
          receiver: receiver.publicKey,
          senderTokenAccount: senderTokenAccount,
          receiverTokenAccount: receiverTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([sender])
        .rpc();
      expect.fail("Transaction should have failed");
    } catch (err) {
      expect(err.logs.some((log) => log.includes("insufficient lamports"))).to
        .be.true;
    }
  });

  it("fails with invalid sender token account (wrong mint)", async () => {
    const receiver = Keypair.generate();
    const [transactionPDA] = getTransactionPDA(
      sender.publicKey,
      receiver.publicKey
    );
    const receiverTokenAccount = await createTokenAccount(
      sender,
      tokenMint.publicKey,
      receiver.publicKey
    );

    try {
      await program.methods
        .sendTip(new BN(tokenAmount), validMessage)
        .accounts({
          dataTransaction: transactionPDA,
          tokenMint: tokenMint.publicKey,
          sender: sender.publicKey,
          receiver: receiver.publicKey,
          senderTokenAccount: invalidTokenAccount, // Wrong mint
          receiverTokenAccount: receiverTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([sender])
        .rpc();
      expect.fail("Transaction should have failed");
    } catch (err) {
      if (err instanceof AnchorError) {
        expect(err.error.errorCode.code).to.equal("InvalidTokenAccount");
      } else {
        throw err;
      }
    }
  });

  it("fails with invalid receiver token account (wrong mint)", async () => {
    const receiver = Keypair.generate();
    const [transactionPDA] = getTransactionPDA(
      sender.publicKey,
      receiver.publicKey
    );

    try {
      await program.methods
        .sendTip(new BN(tokenAmount), validMessage)
        .accounts({
          dataTransaction: transactionPDA,
          tokenMint: tokenMint.publicKey,
          sender: sender.publicKey,
          receiver: receiver.publicKey,
          senderTokenAccount: senderTokenAccount,
          receiverTokenAccount: invalidTokenAccount, // Wrong mint
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([sender])
        .rpc();
      expect.fail("Transaction should have failed");
    } catch (err) {
      if (err instanceof AnchorError) {
        expect(err.error.errorCode.code).to.equal("InvalidTokenAccount");
      } else {
        throw err;
      }
    }
  });
});
