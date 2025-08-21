"use client";
import { createContext, useContext, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  publicKey: null,
});

export const useWalletContext = () => useContext(WalletContext);

export const WalletProvider = ({
  children,
}: {
  children: React.ReactNode;
  wallets: any[];
}) => {
  const { connected, publicKey } = useWallet();

  const value = useMemo(
    () => ({
      connected,
      publicKey: publicKey ? publicKey.toString() : null,
    }),
    [connected, publicKey]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};
