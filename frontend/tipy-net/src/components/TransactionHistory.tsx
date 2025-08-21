"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  formatAddress,
  formatAmount,
  formatDate,
  shortenSignature,
} from "../utils/formatters";

interface Transaction {
  type: "sent" | "received";
  amount: number;
  counterparty: string;
  timestamp: Date;
  message: string;
  isSol: boolean;
  signature?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
}

export default function TransactionHistory({
  transactions,
  loading,
  onRefresh,
}: TransactionHistoryProps) {
  const { publicKey } = useWallet();

  const viewOnExplorer = (signature: string) => {
    window.open(
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      "_blank"
    );
  };

  if (!publicKey) {
    return (
      <div className="transaction-history">
        <h2>Transaction History</h2>
        <p>Please connect your wallet to view your transaction history.</p>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <div className="history-header">
        <h2>Transaction History</h2>
        <button onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx, index) => (
            <div key={index} className="transaction-card">
              <div className="transaction-header">
                <span className={`transaction-type ${tx.type}`}>
                  {tx.type === "sent" ? "Sent" : "Received"}
                </span>
                <span className="transaction-date">
                  {formatDate(tx.timestamp)}
                </span>
              </div>

              <div className="transaction-details">
                <div className="transaction-amount">
                  {formatAmount(tx.amount, tx.isSol)}
                </div>

                <div className="transaction-parties">
                  <div className="party">
                    <span className="label">
                      {tx.type === "sent" ? "To:" : "From:"}
                    </span>
                    <span className="address" title={tx.counterparty}>
                      {formatAddress(tx.counterparty)}
                    </span>
                  </div>
                </div>

                {tx.message && (
                  <div className="transaction-message">
                    <p className="message-label">Message:</p>
                    <p>"{tx.message}"</p>
                  </div>
                )}

                {tx.signature && (
                  <div className="transaction-actions">
                    <button
                      className="view-button"
                      onClick={() => viewOnExplorer(tx.signature!)}
                      title={tx.signature} // Show full signature on hover
                    >
                      View TX: {shortenSignature(tx.signature)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
