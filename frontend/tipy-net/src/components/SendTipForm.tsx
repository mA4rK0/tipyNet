"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { sendTip } from "../utils/program";
import { shortenSignature } from "../utils/formatters";

interface SendTipFormProps {
  onTransactionSuccess: () => void;
}

export default function SendTipForm({
  onTransactionSuccess,
}: SendTipFormProps) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [receiver, setReceiver] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const { connection } = useConnection();
  const walletContext = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletContext.connected || !walletContext.publicKey) {
      setStatus("Please connect your wallet first");
      return;
    }

    if (!receiver || !amount) {
      setStatus("Please fill in all required fields");
      return;
    }

    setSending(true);
    setStatus("Processing...");

    try {
      // Convert amount to lamports (1 SOL = 1,000,000,000 lamports)
      const lamports = new BN(parseFloat(amount) * 1000000000);

      // Validate receiver address
      let receiverPubkey;
      try {
        receiverPubkey = new PublicKey(receiver);
      } catch (err) {
        setStatus("Invalid receiver address");
        setSending(false);
        return;
      }

      const result = await sendTip(
        connection,
        walletContext,
        receiverPubkey,
        lamports,
        message
      );

      if (result.success) {
        setStatus(
          `Tip sent successfully! Transaction: ${shortenSignature(
            result.signature || ""
          )}`
        );
        setAmount("");
        setMessage("");
        setReceiver("");
        onTransactionSuccess();
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (err: unknown) {
      console.error("Transaction error:", err);
      setStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="send-tip-form">
      <h2>Send a Tip</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Receiver Address:</label>
          <input
            type="text"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            required
            placeholder="Enter receiver's wallet address"
            disabled={sending}
          />
        </div>

        <div className="form-group">
          <label>Amount (SOL):</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="Enter amount in SOL"
            disabled={sending}
          />
        </div>

        <div className="form-group">
          <label>Message (max 100 chars):</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={100}
            placeholder="Optional message"
            disabled={sending}
          />
          <div className="char-count">{message.length}/100</div>
        </div>

        <button type="submit" disabled={sending}>
          {sending ? "Processing..." : "Send Tip"}
        </button>

        {status && <div className="status">{status}</div>}
      </form>
    </div>
  );
}
