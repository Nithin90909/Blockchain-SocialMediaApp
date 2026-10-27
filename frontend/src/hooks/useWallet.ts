import { useState, useCallback } from "react";
import { ethers } from "ethers";

interface WalletState {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      setState((prev) => ({ ...prev, error: "MetaMask is not installed" }));
      return null;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      setState({ address, isConnecting: false, error: null });
      return address;
    } catch (err: any) {
      const errorMsg = err.code === 4001 ? "Connection rejected by user" : "Failed to connect wallet";
      setState({ address: null, isConnecting: false, error: errorMsg });
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, isConnecting: false, error: null });
  }, []);

  return { ...state, connect, disconnect };
}
