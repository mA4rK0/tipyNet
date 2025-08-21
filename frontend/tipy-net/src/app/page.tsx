"use client";

import { useState } from "react";
import WalletConnector from "../components/WalletConnector";
import SendTipForm from "../components/SendTipForm";
import TransactionHistory from "../components/TransactionHistory";
import { useTransactions } from "../hooks/useTransactions";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"send" | "history">("send");
  const { transactions, loading, refetch } = useTransactions();

  return (
    <div className="container">
      <header>
        <h1>Tipy</h1>
        <WalletConnector />
      </header>

      <nav className="tabs">
        <button
          className={activeTab === "send" ? "active" : ""}
          onClick={() => setActiveTab("send")}
        >
          Send Tip
        </button>
        <button
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          Transaction History
        </button>
      </nav>

      <main>
        {activeTab === "send" ? (
          <SendTipForm onTransactionSuccess={refetch} />
        ) : (
          <TransactionHistory
            transactions={transactions}
            loading={loading}
            onRefresh={refetch}
          />
        )}
      </main>
    </div>
  );
}
