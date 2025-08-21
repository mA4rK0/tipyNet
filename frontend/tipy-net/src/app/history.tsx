import Head from "next/head";
import Link from "next/link";
import WalletConnector from "../components/WalletConnector";
import TransactionHistory from "../components/TransactionHistory";
import { WalletProvider } from "../components/WalletContext";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";

export default function HistoryPage() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets}>
      <WalletModalProvider>
        <WalletProvider wallets={wallets}>
          <div className="container">
            <Head>
              <title>Tipy - Transaction History</title>
            </Head>

            <header>
              <h1>Tipy Transaction History</h1>
              <WalletConnector />
              <nav>
                <Link href="/">Send Tip</Link>
                <Link href="/history">History</Link>
              </nav>
            </header>

            <main>
              <TransactionHistory
                transactions={[]}
                loading={false}
                onRefresh={() => {}}
              />
            </main>
          </div>
        </WalletProvider>
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>;
}
