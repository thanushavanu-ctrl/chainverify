# ChainVerify — Decentralized Password & Identity Verification System

ChainVerify is a secure full-stack web application demonstrating how **blockchain technology** integrates with **traditional password authentication** and **digital identity verification**.

The system ensures tamper-evident verification records without storing plain-text passwords or sensitive personal documents on the blockchain.

---

## 🚀 Key Features

* **Secure Authentication**: Salted high-iteration password hashing off-chain with Bcrypt (work factor 12).
* **Decentralized Identity Attestation**: Solidity smart contract (`IdentityRegistry.sol`) deployed to an Ethereum network.
* **Zero On-Chain PII**: Passwords, email addresses, names, and documents **never** touch the blockchain. Only pseudonymous DIDs (`did:chainverify:...`) and Keccak-256 commitment hashes are recorded.
* **Role-Based Access Control**: Built on OpenZeppelin `AccessControl` with `DEFAULT_ADMIN_ROLE` and `VERIFIER_ROLE`.
* **Tamper-Evident Audit Trail**: Real-time blockchain event logs (`IdentityRegistered`, `IdentityApproved`, `IdentityRejected`, `IdentityRevoked`).
* **Web3 MetaMask Integration**: Optional wallet connection for account and transaction inspection.
* **Interactive Blockchain Explorer**: Public ledger query page searchable by DID or Transaction Hash.
* **Simulated Review Workflow**: Explicitly labeled simulated identity verification suitable for university defense and demonstration.
* **Privacy-Conscious Reports**: Exportable cryptographic verification certificate in JSON format.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Ethers.js v6, Cookie-Parser, Zod, Rate Limiter |
| **Database** | SQLite with Prisma ORM |
| **Blockchain** | Solidity 0.8.20, Hardhat, OpenZeppelin Contracts |
| **Testing** | Hardhat Mocha/Chai tests + Backend Cryptography suite |

---

## 📂 Project Structure

```
blockchain/
├── contracts/
│   └── IdentityRegistry.sol          # OpenZeppelin-based smart contract
├── scripts/
│   └── deploy.ts                     # Hardhat deployment script (exports ABI)
├── test/
│   └── IdentityRegistry.test.ts      # Smart contract unit tests
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma             # SQLite schema (User, Profile, Requests, Audit)
│   │   └── seed.ts                   # Demo account seed script
│   ├── src/
│   │   ├── blockchain/               # Ethers.js smart contract client
│   │   ├── middleware/               # Auth, rate limiting, and Zod validation
│   │   ├── routes/                   # Auth, identity, admin, explorer, and user routes
│   │   └── server.ts                 # Express application entry
│   └── test/
│       └── auth.test.ts              # Backend cryptography and security test suite
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Sidebar, StatusBadge, BlockchainBanner, Logo
│   │   ├── context/                  # AuthContext, WalletContext (MetaMask)
│   │   ├── pages/                    # Landing, Register, Login, Dashboard, Verify, Explorer, Admin, Profile
│   │   └── App.tsx                   # Routes and protected navigation guards
│   ├── index.html
│   └── vite.config.ts
├── docs/
│   └── architecture.md               # Mermaid diagrams & cryptographic data flow
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)

### 2. Install Dependencies
Dependencies are already pre-installed. If running in a fresh clone:
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Initialize the Database & Seed Demo Accounts
```bash
cd backend
npx prisma db push
npx tsx prisma/seed.ts
cd ..
```

---

## 🏃 Running the Application

For a complete demonstration, run these components in separate terminal windows:

### Terminal 1: Start the Local Ethereum Blockchain Node
```bash
npm run chain
```
> Starts a local Hardhat node at `http://127.0.0.1:8545` with 20 pre-funded test accounts.

### Terminal 2: Deploy the Smart Contract
```bash
npm run deploy
```
> Deploys `IdentityRegistry.sol` to the local network and exports the address and ABI to both frontend and backend.

### Terminal 3: Start the Backend API Server
```bash
npm run dev:backend
```
> Runs Express API server on `http://localhost:5000`.

### Terminal 4: Start the Frontend Application
```bash
npm run dev:frontend
```
> Opens the client at `http://localhost:5173`.

*(Alternatively, run `npm run dev` to start both backend and frontend concurrently).*

---

## 🔑 Demo Accounts for Faculty Presentation

| Account | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@chainverify.io` | `Admin@12345` | `ADMIN` (Verifier) |
| **Demo User** | `demo@chainverify.io` | `Demo@12345` | `USER` |

*(Quick-fill buttons are available on the Sign In page for instant one-click login).*

---

## 🎓 Faculty Demonstration Workflow

Follow this 7-step sequence to present the project:

1. **User Registration**:
   - Navigate to `/register`.
   - Show the interactive **Password Strength Meter** enforcing character requirements.
   - Register a new user (e.g., `alice@example.com`).
   - Highlight the security notice: Password is encrypted with Bcrypt off-chain; an immutable pseudonymous DID (`did:chainverify:...`) is registered.

2. **User Dashboard & Pending Status**:
   - Observe the user dashboard displaying status as **Verification Pending**.
   - Show the commitment hash (Keccak-256) and pseudonymous DID.

3. **Request Simulated Identity Review**:
   - Go to `/verify`.
   - Select a simulated document (`PASSPORT`) and submit the request.
   - Note the academic disclaimer clearly marking this as a simulated review.

4. **Administrator Portal & On-Chain Approval**:
   - Log out and sign in as `admin@chainverify.io` / `Admin@12345`.
   - Navigate to the **Admin Portal** (`/admin`).
   - Locate the pending request in the review queue.
   - Click **Approve On-Chain**.
   - Show the mined transaction hash (`0x...`) and block number produced on the local Ethereum blockchain.

5. **Verify On-Chain Finality**:
   - Log back into the user's account.
   - Show that the identity status is now **Verified On-Chain** with a green badge and live smart contract sync.

6. **Blockchain Explorer Inspection**:
   - Navigate to `/explorer`.
   - Search for the user's pseudonymous DID or transaction hash.
   - Show the emitted `IdentityApproved` event directly from the contract ledger.
   - Point out that **no personal data** (no emails, passwords, or document images) is present on the public ledger.

7. **Access Control Proof**:
   - Attempt to call verifier functions from an unauthorized account to demonstrate OpenZeppelin `AccessControlUnauthorizedAccount` protection.

---

## 🧪 Running Tests

Run the complete test suite:
```bash
npm test
```
Or run individually:
- **Smart Contract Tests (Solidity / Hardhat)**: `npm run test:contracts`
- **Backend Cryptography & Auth Tests**: `npm run test:backend`
