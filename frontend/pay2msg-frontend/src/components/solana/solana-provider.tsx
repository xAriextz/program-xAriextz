'use client';

import { ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createWalletUiConfig,
  WalletUi,
} from '@wallet-ui/react';
import { WalletUiGillProvider } from '@wallet-ui/react-gill';
import { solanaMobileWalletAdapter } from './solana-mobile-wallet-adapter';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

const config = createWalletUiConfig({
  clusters: [createSolanaDevnet(), createSolanaLocalnet()],
});

// Sigue registrando el adaptador mobile para Wallet UI
solanaMobileWalletAdapter({ clusters: config.clusters });

export function SolanaProvider({ children }: { children: ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Wallets que soportará wallet-adapter (puedes añadir más si quieres)
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletUi config={config}>
          <WalletUiGillProvider>{children}</WalletUiGillProvider>
        </WalletUi>
      </WalletProvider>
    </ConnectionProvider>
  );
}
