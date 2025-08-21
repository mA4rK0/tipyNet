import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getDetailedTransactions } from "../utils/program";

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const fetchTransactions = async () => {
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
  };

  useEffect(() => {
    if (publicKey) {
      fetchTransactions();
    }
  }, [publicKey]);

  return { transactions, loading, refetch: fetchTransactions };
};
