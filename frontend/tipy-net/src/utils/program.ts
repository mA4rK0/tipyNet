import { Program, AnchorProvider, BN, Idl } from "@project-serum/anchor";
import {
  PublicKey,
  Connection,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { IDL } from "./idl";

const PROGRAM_ID = new PublicKey(
  "E4dEFDBfgF7vACjTRez7v4Bqk8ZUrbrryT26m6HiDWQh"
);

export const getProgram = (
  connection: Connection,
  walletContext: WalletContextState
) => {
  const provider = new AnchorProvider(
    connection,
    walletContext as any,
    AnchorProvider.defaultOptions()
  );

  return new Program(IDL as Idl, PROGRAM_ID, provider);
};

export async function sendTip(
  connection: Connection,
  walletContext: WalletContextState,
  receiver: PublicKey,
  amount: BN,
  message: string
): Promise<{ success: boolean; error?: string; signature?: string }> {
  try {
    if (!walletContext.publicKey || !walletContext.signTransaction) {
      return { success: false, error: "Wallet not connected" };
    }

    const transferInstruction = SystemProgram.transfer({
      fromPubkey: walletContext.publicKey,
      toPubkey: receiver,
      lamports: amount.toNumber(),
    });

    const transaction = new Transaction().add(transferInstruction);

    if (message) {
      const memoProgram = new PublicKey(
        "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo"
      );
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: Buffer.from(message, "utf8"),
      });
      transaction.add(memoInstruction);
    }

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletContext.publicKey;

    const signed = await walletContext.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction(signature, "confirmed");

    console.log("SOL transfer successful:", signature);
    return { success: true, signature };
  } catch (error: any) {
    console.error("Error sending SOL tip:", error);
    return { success: false, error: error.message };
  }
}

async function getTokenMintAddress(): Promise<PublicKey> {
  return new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
}

async function getSenderTokenAccount(sender: PublicKey): Promise<PublicKey> {
  return sender;
}

async function getReceiverTokenAccount(
  receiver: PublicKey
): Promise<PublicKey> {
  return receiver;
}

export async function getTransactionsByUser(
  connection: Connection,
  wallet: WalletContextState,
  userPublicKey: PublicKey
): Promise<any[]> {
  try {
    const program = getProgram(connection, wallet);

    // Fetch all transactions
    const transactions = await program.account.dataTransaction.all();

    const userTransactions = transactions.filter(
      (tx) =>
        tx.account.sender.equals(userPublicKey) ||
        tx.account.receiver.equals(userPublicKey)
    );

    return userTransactions.map((tx) => ({
      publicKey: tx.publicKey.toString(),
      sender: tx.account.sender.toString(),
      receiver: tx.account.receiver.toString(),
      amount: tx.account.amount.toString(),
      message: tx.account.message,
      timestamp: new Date(
        tx.account.timestamp.toNumber() * 1000
      ).toLocaleString(),
      isSol: tx.account.isSol,
    }));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function getRealTransactions(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<any[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(userPublicKey, {
      limit: 20,
    });

    const transactions = [];

    for (const signatureInfo of signatures) {
      try {
        const transaction = await connection.getTransaction(
          signatureInfo.signature,
          {
            maxSupportedTransactionVersion: 0,
          }
        );

        if (transaction && transaction.meta) {
          const preBalances = transaction.meta.preBalances;
          const postBalances = transaction.meta.postBalances;
          const accountKeys = transaction.transaction.message.getAccountKeys();

          for (let i = 0; i < accountKeys.length; i++) {
            const account = accountKeys.get(i);
            const preBalance = preBalances[i];
            const postBalance = postBalances[i];

            if (account?.equals(userPublicKey)) {
              const amountChanged = postBalance - preBalance;

              if (amountChanged !== 0) {
                let counterparty = null;
                for (let j = 0; j < accountKeys.length; j++) {
                  if (j !== i && accountKeys.get(j) !== userPublicKey) {
                    counterparty = accountKeys.get(j);
                    break;
                  }
                }

                if (counterparty) {
                  transactions.push({
                    signature: signatureInfo.signature,
                    type: amountChanged > 0 ? "received" : "sent",
                    amount: Math.abs(amountChanged),
                    counterparty: counterparty.toString(),
                    timestamp: new Date(
                      signatureInfo.blockTime! * 1000
                    ).toLocaleString(),
                    message: "",
                    isSol: true,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing transaction:", error);
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function getTipTransactions(
  connection: Connection,
  walletContext: WalletContextState,
  userPublicKey: PublicKey
): Promise<any[]> {
  try {
    const program = getProgram(connection, walletContext);

    const transactionAccounts = await program.account.dataTransaction.all();

    const userTransactions = transactionAccounts
      .filter(
        (acc) =>
          acc.account.sender.equals(userPublicKey) ||
          acc.account.receiver.equals(userPublicKey)
      )
      .map((acc) => ({
        type: acc.account.sender.equals(userPublicKey) ? "sent" : "received",
        amount: acc.account.amount.toString(),
        counterparty: acc.account.sender.equals(userPublicKey)
          ? acc.account.receiver.toString()
          : acc.account.sender.toString(),
        timestamp: new Date(
          acc.account.timestamp.toNumber() * 1000
        ).toLocaleString(),
        message: acc.account.message,
        isSol: acc.account.isSol,
      }));

    return userTransactions;
  } catch (error) {
    console.error("Error fetching tip transactions:", error);
    return [];
  }
}

export async function getOptimizedTransactions(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<any[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(userPublicKey, {
      limit: 10,
    });

    const transactions = [];

    const transactionPromises = signatures.map(async (signatureInfo) => {
      try {
        const transaction = await connection.getTransaction(
          signatureInfo.signature,
          {
            maxSupportedTransactionVersion: 0,
          }
        );

        if (transaction && transaction.meta) {
          const processedTransaction = {
            signature: signatureInfo.signature,
            timestamp: signatureInfo.blockTime,
          };
          return processedTransaction;
        }
      } catch (error) {
        console.error("Error processing transaction:", error);
        return null;
      }
    });

    const results = await Promise.all(transactionPromises);

    return results
      .filter((tx) => tx !== null)
      .sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function getDetailedTransactions(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<any[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(userPublicKey, {
      limit: 20,
    });

    const transactions = [];
    const memoProgramId = new PublicKey(
      "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo"
    );

    const transactionDetails = await Promise.all(
      signatures.map(async (signatureInfo) => {
        try {
          const transaction = await connection.getTransaction(
            signatureInfo.signature,
            {
              maxSupportedTransactionVersion: 0,
              commitment: "confirmed",
            }
          );

          if (!transaction || !transaction.meta) return null;

          const preBalances = transaction.meta.preBalances;
          const postBalances = transaction.meta.postBalances;
          const accountKeys = transaction.transaction.message.getAccountKeys();
          const instructions =
            transaction.transaction.message.compiledInstructions;

          for (let i = 0; i < accountKeys.length; i++) {
            const account = accountKeys.get(i);
            const preBalance = preBalances[i];
            const postBalance = postBalances[i];

            if (account?.equals(userPublicKey)) {
              const amountChanged = postBalance - preBalance;

              if (amountChanged !== 0) {
                let counterparty = null;
                for (let j = 0; j < accountKeys.length; j++) {
                  if (j !== i && accountKeys.get(j) !== userPublicKey) {
                    counterparty = accountKeys.get(j);
                    break;
                  }
                }

                // Extract message from memo instructions
                let message = "";
                for (const instruction of instructions) {
                  const programId = accountKeys.get(instruction.programIdIndex);
                  if (programId && programId.equals(memoProgramId)) {
                    message = Buffer.from(instruction.data).toString("utf8");
                    break;
                  }
                }

                if (counterparty) {
                  return {
                    signature: signatureInfo.signature,
                    type: amountChanged > 0 ? "received" : "sent",
                    amount: Math.abs(amountChanged),
                    counterparty: counterparty.toString(),
                    timestamp: signatureInfo.blockTime
                      ? new Date(signatureInfo.blockTime * 1000)
                      : new Date(),
                    message: message,
                    isSol: true,
                  };
                }
              }
            }
          }
        } catch (error) {
          console.error("Error processing transaction:", error);
          return null;
        }
      })
    );

    return transactionDetails
      .filter((tx) => tx !== null)
      .sort(
        (a, b) => (b?.timestamp.getTime() ?? 0) - (a?.timestamp.getTime() ?? 0)
      );
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}
