import { ethers } from "ethers";
import { logger } from "./logger";

let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    const url = process.env.BLOCKCHAIN_RPC_URL || process.env.GANACHE_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(url);
  }
  return provider;
}

export function getSigner(): ethers.Wallet {
  if (!signer) {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      logger.error("DEPLOYER_PRIVATE_KEY not set");
      throw new Error("DEPLOYER_PRIVATE_KEY is required");
    }
    signer = new ethers.Wallet(privateKey, getProvider());
  }
  return signer;
}

export function getContract(address: string, abi: any[]): ethers.Contract {
  return new ethers.Contract(address, abi, getSigner());
}
