import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

interface WalletContextType {
  account: string | null;
  chainId: number | null;
  networkName: string | null;
  balance: string | null;
  isConnecting: boolean;
  hasMetaMask: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signProofMessage: (message: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      setHasMetaMask(true);

      // Check if already authorized
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            handleAccountChanged(accounts[0]);
          }
        })
        .catch(() => {});

      // Listeners
      const onAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          handleAccountChanged(accounts[0]);
        } else {
          disconnectWallet();
        }
      };

      const onChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", onAccountsChanged);
      window.ethereum.on("chainChanged", onChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", onAccountsChanged);
          window.ethereum.removeListener("chainChanged", onChainChanged);
        }
      };
    }
  }, []);

  const handleAccountChanged = async (acc: string) => {
    try {
      setAccount(acc);
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
        setNetworkName(network.name === "unknown" ? "Localhost (31337)" : network.name);

        const bal = await provider.getBalance(acc);
        setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
      }
    } catch (err) {
      console.error("Failed to load account details", err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask extension is not detected. Please install MetaMask to connect an Ethereum wallet.");
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        await handleAccountChanged(accounts[0]);
      }
    } catch (error: any) {
      console.error("User rejected or error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setNetworkName(null);
    setBalance(null);
  };

  const signProofMessage = async (message: string): Promise<string | null> => {
    if (!window.ethereum || !account) return null;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return await signer.signMessage(message);
    } catch (err) {
      console.error("Signing failed:", err);
      return null;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        networkName,
        balance,
        isConnecting,
        hasMetaMask,
        connectWallet,
        disconnectWallet,
        signProofMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
