"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export default function WalletConnector() {
  const { connected } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="wallet-connector">
        <button
          className="wallet-adapter-button"
          style={{
            padding: "0 16px",
            height: "40px",
            borderRadius: "8px",
            backgroundColor: "#512da8",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
          }}
          disabled
        >
          Loading wallet...
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connector">
      <WalletMultiButton />
      {connected && <span className="connected-status">Connected</span>}
    </div>
  );
}
