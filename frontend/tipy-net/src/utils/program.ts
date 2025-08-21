import { Program, AnchorProvider, BN } from "@project-serum/anchor";
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

interface SendTipResult {
  success: boolean;
  error?: string;
  signature?: string;
}

interface DetailedTransaction {
  signature: string;
  type: "sent" | "received";
  amount: number;
  counterparty: string;
  timestamp: Date;
  message: string;
  isSol: boolean;
}

export const getProgram = (
  connection: Connection,
  walletContext: WalletContextState
) => {
  const provider = new AnchorProvider(
    connection,
    walletContext as unknown as {
      publicKey: PublicKey;
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
      signAllTransactions: (
        transactions: Transaction[]
      ) => Promise<Transaction[]>;
    },
    AnchorProvider.defaultOptions()
  );

  return new Program(IDL as any, PROGRAM_ID, provider);
};

export async function sendTip(
  connection: Connection,
  walletContext: WalletContextState,
  receiver: PublicKey,
  amount: BN,
  message: string
): Promise<SendTipResult> {
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
  } catch (error: unknown) {
    console.error("Error sending SOL tip:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getDetailedTransactions(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<DetailedTransaction[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(userPublicKey, {
      limit: 20,
    });

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
                  } as DetailedTransaction;
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
      .filter((tx): tx is DetailedTransaction => tx !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}
