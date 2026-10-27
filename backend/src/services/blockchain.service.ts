import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import { getContract } from "../config/blockchain";
import { logger } from "../config/logger";

let userRegistryABI: any[] = [];
let postRegistryABI: any[] = [];
let moderationABI: any[] = [];

const candidateAbiDirs = [
  path.resolve(__dirname, "..", "..", "..", "blockchain", "abi"),
  path.resolve(__dirname, "..", "..", "blockchain", "abi"),
  path.resolve(__dirname, "..", "..", "abi"),
  path.resolve(__dirname, "..", "abi"),
  path.resolve(process.cwd(), "abi"),
  path.resolve(process.cwd(), "..", "blockchain", "abi"),
];

function loadABI(name: string): any[] {
  for (const dir of candidateAbiDirs) {
    try {
      const filePath = path.join(dir, `${name}.json`);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch {}
  }
  return [];
}

userRegistryABI = loadABI("UserRegistry");
postRegistryABI = loadABI("PostRegistry");
moderationABI = loadABI("ModerationContract");

if (!userRegistryABI.length) {
  logger.warn("Blockchain ABIs not found. Deploy contracts first.");
}

function getUserRegistryContract(): ethers.Contract | null {
  const address = process.env.USER_REGISTRY_ADDRESS;
  if (!address || !userRegistryABI.length) return null;
  return getContract(address, userRegistryABI);
}

function getPostRegistryContract(): ethers.Contract | null {
  const address = process.env.POST_REGISTRY_ADDRESS;
  if (!address || !postRegistryABI.length) return null;
  return getContract(address, postRegistryABI);
}

function getModerationContract(): ethers.Contract | null {
  const address = process.env.MODERATION_CONTRACT_ADDRESS;
  if (!address || !moderationABI.length) return null;
  return getContract(address, moderationABI);
}

export async function registerUserOnChain(username: string): Promise<string | null> {
  const contract = getUserRegistryContract();
  if (!contract) return null;

  try {
    const tx = await contract.registerUser(username);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error: any) {
    logger.error("Blockchain user registration failed:", error.message);
    return null;
  }
}

export async function createPostOnChain(
  postId: string,
  contentHash: string,
  visibility: number
): Promise<string | null> {
  const contract = getPostRegistryContract();
  if (!contract) return null;

  try {
    const postIdBytes = ethers.keccak256(ethers.toUtf8Bytes(postId));
    const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(contentHash));
    const tx = await contract.createPost(postIdBytes, contentHashBytes, visibility);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error: any) {
    logger.error("Blockchain post creation failed:", error.message);
    return null;
  }
}

export async function reportPostOnChain(
  reportId: string,
  postId: string,
  reason: string
): Promise<string | null> {
  const contract = getModerationContract();
  if (!contract) return null;

  try {
    const reportIdBytes = ethers.keccak256(ethers.toUtf8Bytes(reportId));
    const postIdBytes = ethers.keccak256(ethers.toUtf8Bytes(postId));
    const tx = await contract.reportPost(reportIdBytes, postIdBytes, reason);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error: any) {
    logger.error("Blockchain report failed:", error.message);
    return null;
  }
}

export async function castVoteOnChain(
  reportId: string,
  voteType: number
): Promise<string | null> {
  const contract = getModerationContract();
  if (!contract) return null;

  try {
    const reportIdBytes = ethers.keccak256(ethers.toUtf8Bytes(reportId));
    const tx = await contract.castVote(reportIdBytes, voteType);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error: any) {
    logger.error("Blockchain vote failed:", error.message);
    return null;
  }
}

export async function verifyPostIntegrity(
  postId: string,
  contentHash: string
): Promise<boolean> {
  const contract = getPostRegistryContract();
  if (!contract) return false;

  try {
    const postIdBytes = ethers.keccak256(ethers.toUtf8Bytes(postId));
    const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(contentHash));
    return await contract.verifyPostIntegrity(postIdBytes, contentHashBytes);
  } catch {
    return false;
  }
}
