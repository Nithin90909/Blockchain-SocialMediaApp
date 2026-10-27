import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { logger } from "../config/logger";

const PINATA_API = "https://api.pinata.cloud";

export async function uploadToIPFS(filePath: string, fileName: string): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    const localFileName = path.basename(filePath);
    logger.info(`Pinata not configured, serving locally: /uploads/${localFileName}`);
    return `local:/uploads/${localFileName}`;
  }

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath), { filename: fileName });

  const metadata = JSON.stringify({ name: fileName });
  formData.append("pinataMetadata", metadata);

  const response = await axios.post(`${PINATA_API}/pinning/pinFileToIPFS`, formData, {
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
  });

  return response.data.IpfsHash;
}

export async function uploadJSONToIPFS(data: Record<string, any>): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    logger.warn("Pinata credentials not configured, returning placeholder hash");
    return "QmPlaceholderJSONHashForLocalDevelopment";
  }

  const response = await axios.post(
    `${PINATA_API}/pinning/pinJSONToIPFS`,
    { pinataContent: data },
    {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
    }
  );

  return response.data.IpfsHash;
}

export function getIPFSUrl(hash: string): string {
  const gateway = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  return `${gateway}/${hash}`;
}
