import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getDetailedTransactions } from "../utils/program";

interface Transaction {
  type: "sent" | "received";
  amount: number;
  counterparty: string;
  timestamp: Date;
  message: string;
  isSol: boolean;
  signature?: string;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const fetchTransactions = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const data = await getDetailedTransactions(connection, publicKey);
      setTransactions(data);

      localStorage.setItem(
        `transactions-${publicKey.toString()}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error fetching transactions:", error);

      try {
        const cached = localStorage.getItem(
          `transactions-${publicKey.toString()}`
        );
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setTransactions(data);
          }
        }
      } catch (cacheError) {
        console.error("Error reading cache:", cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (publicKey) {
      fetchTransactions();
    }
  }, [publicKey, fetchTransactions]);

  return { transactions, loading, refetch: fetchTransactions };
};
