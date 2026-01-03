// src/pages/Payment.jsx
import React, { useEffect, useState } from "react";
import Web3 from "web3";
import "./payment.css";
import { useNavigate } from "react-router-dom";

const RECEIVER = "0x468bd2b6B720705c5b27d1cf276758EA112b2035";
const USDC_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const POLYGON_CHAIN_ID_HEX = "0x89";
const FIXED_USDC_AMOUNT = 0.5;

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  }
];

export default function Payment() {
  const [status, setStatus] = useState("Status: Idle — connect your wallet.");
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const navigate = useNavigate();

  const shorten = (addr) =>
    addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "N/A";

  const polyscanTxUrl = (txHash) =>
    `https://polygonscan.com/tx/${txHash}`;

  // ✅ Generic wallet check (Trust Wallet, MetaMask, etc.)
  const ensureWallet = async () => {
    if (!window.ethereum) {
      setStatus("Wallet not found. Please use Trust Wallet or MetaMask browser.");
      throw new Error("No wallet");
    }
  };

  const updateChainTag = async () => {
    try {
      if (!window.ethereum) return;
      const chain = await window.ethereum.request({
        method: "eth_chainId"
      });
      setChainId(chain);
    } catch {
      setChainId(null);
    }
  };

  const connectWallet = async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      await ensureWallet();
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      setAccount(accounts[0]);
      setStatus("Wallet connected.");
      await updateChainTag();
    } catch (err) {
      setStatus("Wallet connect failed: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToPolygon = async () => {
    if (isSwitching) return;
    setIsSwitching(true);

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: POLYGON_CHAIN_ID_HEX }]
      });
      setStatus("Switched to Polygon.");
      await updateChainTag();
    } catch (err) {
      setStatus("Switch failed: " + err.message);
    } finally {
      setIsSwitching(false);
    }
  };

  const toUnits = (amountFloat, decimals) => {
    const base = 10n ** BigInt(decimals);
    const [whole, fracRaw = ""] = String(amountFloat).split(".");
    const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
    return BigInt(whole) * base + BigInt(frac);
  };

  const payUSDC = async () => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      await ensureWallet();

      if (!account) {
        setStatus("Connecting wallet…");
        await connectWallet();
      }

      const currentChain = await window.ethereum.request({
        method: "eth_chainId"
      });

      if (currentChain !== POLYGON_CHAIN_ID_HEX) {
        setStatus("Not on Polygon. Switching…");
        await switchToPolygon();
      }

      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(ERC20_ABI, USDC_POLYGON);

      const decimals = await contract.methods.decimals().call();
      const units = toUnits(FIXED_USDC_AMOUNT, Number(decimals));

      setStatus(`Preparing USDC transfer of ${FIXED_USDC_AMOUNT}…`);

      const tx = contract.methods.transfer(RECEIVER, units.toString());

      await tx
        .send({ from: account })
        .on("transactionHash", (hash) => {
          setStatus(
            `Transaction sent.\nHash: ${hash}\nView: ${polyscanTxUrl(hash)}`
          );
        })
        .then((receipt) => {
          setStatus(
            `Payment confirmed.\nTx: ${receipt.transactionHash}\nRedirecting to exam…`
          );

          setTimeout(() => {
            navigate("/exam");
          }, 2000);
        });
    } catch (err) {
      setStatus("Payment failed: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("chainChanged", updateChainTag);
      window.ethereum.on("accountsChanged", (accs) => {
        setAccount(accs[0]);
      });
      updateChainTag();
    } else {
      setStatus("Wallet not detected. Please use Trust Wallet or MetaMask browser.");
    }
  }, []);

  return (
    <div className="payment-body">
      <div className="card">
        <h1>USDC Payment — Polygon</h1>

        <p>Pay securely with Trust Wallet on Polygon.</p>
        <p><strong>Fixed Fee:</strong> {FIXED_USDC_AMOUNT} USDC</p>

        <div className="tag">
          Wallet: {account ? shorten(account) : "Not connected"}
        </div>

        <div className="tag">Chain: {chainId || "Unknown"}</div>

        <div className="row">
          <button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>

          <button onClick={switchToPolygon} disabled={isSwitching}>
            {isSwitching ? "Switching…" : "Switch to Polygon"}
          </button>
        </div>

        <button onClick={payUSDC} disabled={isPaying || !window.ethereum}>
          {isPaying ? "Processing…" : `Pay ${FIXED_USDC_AMOUNT} USDC`}
        </button>

        <div className="status-box">{status}</div>
      </div>
    </div>
  );
}