# 🌐 DecentraSocial - Decentralized Web3 Social Media Platform

A next-generation decentralized social network engineered with **Ethereum/EVM Smart Contracts**, **AI-Driven Fake News Detection**, **End-to-End Encrypted Messaging (AES-256)**, and **Decentralized Storage (IPFS)**.

---

## 🌟 Key Features

### 1. ⛓️ Blockchain-Backed Content Ownership & Identity
* **Cryptographic Proof of Existence:** Every post's cryptographic hash is anchored immutably to the blockchain (`PostRegistry.sol`) with a verified block timestamp, establishing undeniable authorship.
* **Web3 Wallet Authentication:** Seamless sign-in and account registration connected to Ethereum wallets (MetaMask).
* **Decentralized User Registry:** Identity mappings between wallet addresses and usernames are verifiable on-chain (`UserRegistry.sol`).

### 2. 🤖 AI-Powered Fake News & Credibility Scoring
* **Machine Learning Microservice:** An integrated FastAPI service leverages Natural Language Processing (NLP with TF-IDF vectorization and Logistic Regression) to analyze post text in real-time.
* **Credibility Scores (0–100%):** Posts receive an objective credibility indicator (`Reliable`, `Likely Reliable`, `Questionable`, `Unreliable`).
* **URL & Domain Verification:** Analyzes embedded links against blacklists and trusted sources to detect phishing and disinformation.
* **Perceptual Image Hashing:** Verifies image authenticity and flags duplicate or manipulated media.

### 3. 🔐 Encrypted Private Messaging (E2EE)
* **AES-256 Message Encryption:** Direct one-on-one messages are encrypted at rest with AES-256 before being committed to the database.
* **Real-Time Communication:** Full duplex WebSocket communication (Socket.io) with live typing indicators and online/offline status tracking.

### 4. ⚖️ Decentralized Community Moderation (DAO Voting)
* **Crowdsourced Moderation:** Questionable or reported posts trigger community governance via `ModerationContract.sol`.
* **Stakeholder Voting:** Community members vote on reported content validity, adjusting user reputation dynamically on-chain.

### 5. 📱 Full-Featured Modern Social Experience
* **Interactive Feeds:** Chronological and personalized feeds with likes, threaded comments, and interactive community polls.
* **24-Hour Disappearing Stories:** Ephemeral stories with viewer lists and emoji reactions.
* **Granular Privacy Controls:** Configurable visibility (`Public`, `Followers Only`, `Private`) and messaging restrictions (`Everyone`, `Followers`, `Nobody`).
* **Modern UI:** Responsive, themeable (Dark/Light mode) interface crafted with React, Vite, Tailwind CSS, and Radix/ShadCN UI.

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────┐
                    │    React + Vite Client   │
                    │   (Ethers.js + Web3)    │
                    └────────────┬────────────┘
                                 │ HTTP / WebSockets
                                 ▼
                    ┌─────────────────────────┐
                    │  Express / Node Backend │
                    └──────┬─────────┬────────┘
        ┌──────────────────┼─────────┴────────────────────┐
        ▼                  ▼                              ▼
┌──────────────┐   ┌──────────────┐              ┌─────────────────┐
│ Local MongoDB │   │ Ganache EVM  │              │ FastAPI ML      │
│  (Port 27017)│   │ (Port 8545)  │              │  Service        │
│ Off-chain DB │   │Smart Contracts              │  (Port 8000)    │
└──────────────┘   └──────────────┘              └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, ShadCN/Radix UI, Ethers.js v6, Socket.io-client, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Socket.io, Mongoose (MongoDB), JWT, bcrypt, helmet, AES-256 |
| **Blockchain** | Solidity (`^0.8.20`), Hardhat, Ganache, Ethers.js |
| **Database** | MongoDB Community Server (with automated in-memory fallback) |
| **ML Service** | Python 3.10+, FastAPI, Uvicorn, Scikit-learn, NumPy, Pillow, ImageHash |

---

## 🚀 Step-by-Step Terminal Commands to Run the Project

Open separate PowerShell terminals for each component:

### Terminal 1: Local Blockchain (Ganache)
```powershell
cd c:\Users\NithinReddy\OneDrive\Desktop\Blockchain-SocialMediaApp\Blockchain-SocialMediaApp\blockchain
npx ganache --port 8545 --deterministic
```
*(Runs Ganache on `http://127.0.0.1:8545`)*

---

### Terminal 2: Deploy Smart Contracts *(Run once when Ganache starts)*
```powershell
cd c:\Users\NithinReddy\OneDrive\Desktop\Blockchain-SocialMediaApp\Blockchain-SocialMediaApp\blockchain
npx hardhat run scripts/deploy.ts --network ganache
```
*(Deploys `UserRegistry`, `PostRegistry`, and `ModerationContract` to the local chain)*

---

### Terminal 3: Backend API Server
```powershell
cd c:\Users\NithinReddy\OneDrive\Desktop\Blockchain-SocialMediaApp\Blockchain-SocialMediaApp\backend
npm run dev
```
*(Starts Express and Socket.io on `http://localhost:5000`)*

---

### Terminal 4: Frontend Web App
```powershell
cd c:\Users\NithinReddy\OneDrive\Desktop\Blockchain-SocialMediaApp\Blockchain-SocialMediaApp\frontend
npm run dev
```
*(Launches the user interface on `http://localhost:5173`)*

---

### Terminal 5: Python ML Service
```powershell
cd c:\Users\NithinReddy\OneDrive\Desktop\Blockchain-SocialMediaApp\Blockchain-SocialMediaApp\ml-service
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*(Starts the AI credibility API on `http://localhost:8000`)*

---

## 🦊 MetaMask Setup Guide

To connect your browser to the local Ganache network:

1. Open your browser with the **MetaMask** extension installed.
2. Go to **Settings > Networks > Add network > Add a network manually**:
   * **Network Name:** `Ganache Local`
   * **New RPC URL:** `http://127.0.0.1:8545`
   * **Chain ID:** `1337`
   * **Currency Symbol:** `ETH`
3. Click **Save**.
4. **Import Account:**
   * In MetaMask, select your account icon -> **Import Account**.
   * Paste Ganache's primary test private key:
     ```text
     0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d
     ```
   * You will receive 1,000 test ETH for interacting with the platform.

---

## 📊 Viewing Backend Database Data

To inspect users, posts, messages, and stories:
1. Open **MongoDB Compass**.
2. Connect to: `mongodb://localhost:27017`
3. Select database **`decentra-social`**.
4. Browse collections:
   * `users`
   * `posts`
   * `messages`
   * `reports`
   * `stories`
   * `notifications`

---

## 📜 Smart Contracts Overview

| Contract | Purpose |
| :--- | :--- |
| `UserRegistry.sol` | Manages wallet-to-username mappings, registration state, and reputation ratings |
| `PostRegistry.sol` | Records IPFS hashes, post ownership, creation timestamps, and privacy permissions |
| `ModerationContract.sol` | Handles community reporting, dispute rounds, decentralized consensus voting, and slashing |

---

## 🔒 Security Implementations

* **Bcrypt Password Hashing:** Salt rounds = 12.
* **JWT Authentication:** Strict authorization middleware with refresh tokens.
* **AES-256 Symmetric Encryption:** All direct chat messages are stored encrypted on disk.
* **Rate Limiting:** Prevents brute force attacks and DDoS across all REST routes.
* **Helmet:** Security headers for HTTP protection.
* **Smart Contract Access Control:** Restricted state modifications to authorized signers.
