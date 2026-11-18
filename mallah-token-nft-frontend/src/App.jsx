import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import {
  ArrowDownLeft, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Copy, ExternalLink, Gem, LoaderCircle, LockKeyhole, RefreshCw,
  ShieldCheck, Sparkles, Wallet, X, Zap, Plus, FolderOpen
} from "lucide-react";

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
const CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`;
const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "";
const EXPLORER = CHAIN_ID === 11155111
  ? "https://sepolia.etherscan.io"
  : "https://etherscan.io";

const FACTORY_ABI = [
  "function createProject(string tokenName,string tokenSymbol,uint8 tokenDecimals,uint256 initialSupply,string nftName,string nftSymbol,uint256 nftPriceTokens) returns (uint256 projectId)",
  "function getProjectCount() view returns (uint256)",
  "function getCreatorProjects(address creator) view returns (uint256[])",
  "function getProject(uint256 projectId) view returns (tuple(uint256 projectId,address creator,address tokenAddress,address nftAddress,address exchangeAddress,string tokenName,string tokenSymbol,uint8 tokenDecimals,uint256 initialSupply,string nftName,string nftSymbol,uint256 nftPriceTokens,uint256 nftPriceSmallestUnits,uint256 createdAt))",
  "event ProjectCreated(uint256 indexed projectId,address indexed creator,address tokenAddress,address nftAddress,address exchangeAddress)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];

const ERC721_ABI = [
  "function balanceOf(address) view returns (uint256)"
];

const EXCHANGE_ABI = [
  "function buyNFT()",
  "function nftPrice() view returns (uint256)",
  "event NFTPurchased(address indexed buyer,uint256 indexed tokenId,uint256 amountPaid)"
];

function shortAddress(value) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function explainError(error) {
  const message = error?.shortMessage || error?.reason || error?.message || "Something went wrong.";
  if (message.toLowerCase().includes("user rejected")) return "You rejected the transaction in your wallet.";
  if (message.toLowerCase().includes("insufficient funds")) return "Your wallet does not have enough Sepolia ETH for gas.";
  if (message.toLowerCase().includes("missing revert data")) return "The transaction reverted. Check the Factory address, selected project and contract ownership.";
  return message.split("\n")[0].slice(0, 220);
}

function toProject(raw) {
  return {
    projectId: raw.projectId.toString(),
    creator: raw.creator,
    tokenAddress: raw.tokenAddress,
    nftAddress: raw.nftAddress,
    exchangeAddress: raw.exchangeAddress,
    tokenName: raw.tokenName,
    tokenSymbol: raw.tokenSymbol,
    tokenDecimals: Number(raw.tokenDecimals),
    initialSupply: raw.initialSupply.toString(),
    nftName: raw.nftName,
    nftSymbol: raw.nftSymbol,
    nftPriceTokens: raw.nftPriceTokens.toString(),
    nftPriceSmallestUnits: raw.nftPriceSmallestUnits.toString(),
    createdAt: raw.createdAt.toString()
  };
}

export default function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [nftBalance, setNftBalance] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [symbol, setSymbol] = useState("TOKEN");
  const [decimals, setDecimals] = useState(18);
  const [nftPrice, setNftPrice] = useState("0");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [lastTx, setLastTx] = useState("");
  const [lastTokenId, setLastTokenId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [form, setForm] = useState({
    tokenName: "MALLAH Token",
    tokenSymbol: "MLT",
    tokenDecimals: "18",
    initialSupply: "100000",
    nftName: "MALLAH NFT",
    nftSymbol: "MNFT",
    nftPriceTokens: "5"
  });

  const providerAvailable = typeof window !== "undefined" && Boolean(window.ethereum);
  const correctNetwork = chainId === CHAIN_ID;
  const factoryReady = isAddress(FACTORY_ADDRESS);
  const selectedProject = projects.find((p) => p.projectId === selectedProjectId) || null;

  const showNotice = (type, title, message, hash = "") => {
    setNotice({ type, title, message, hash });
  };

  const getProvider = useCallback(() => {
    if (!window.ethereum) throw new Error("MetaMask was not found. Install the MetaMask browser extension.");
    return new BrowserProvider(window.ethereum);
  }, []);

  const getFactory = useCallback(async (withSigner = false) => {
    if (!factoryReady) throw new Error("Factory address is missing. Add VITE_FACTORY_ADDRESS to frontend .env.");
    const provider = getProvider();
    const runner = withSigner ? await provider.getSigner() : provider;
    return new Contract(FACTORY_ADDRESS, FACTORY_ABI, runner);
  }, [factoryReady, getProvider]);

  const getProjectContracts = useCallback(async (project, withSigner = false) => {
    if (!project) throw new Error("Select a project first.");
    const provider = getProvider();
    const runner = withSigner ? await provider.getSigner() : provider;
    return {
      token: new Contract(project.tokenAddress, ERC20_ABI, runner),
      nft: new Contract(project.nftAddress, ERC721_ABI, runner),
      exchange: new Contract(project.exchangeAddress, EXCHANGE_ABI, runner)
    };
  }, [getProvider]);

  const loadProjects = useCallback(async (wallet = account) => {
    if (!wallet || !factoryReady || !window.ethereum) return;
    try {
      const factory = await getFactory(false);
      const ids = await factory.getCreatorProjects(wallet);
      const loaded = await Promise.all(
        ids.map(async (id) => toProject(await factory.getProject(id)))
      );
      setProjects(loaded);
      setSelectedProjectId((current) => {
        if (current && loaded.some((p) => p.projectId === current)) return current;
        return loaded.length ? loaded[loaded.length - 1].projectId : "";
      });
    } catch (error) {
      console.error("Project loading failed:", error);
      showNotice("error", "Could not load projects", explainError(error));
    }
  }, [account, factoryReady, getFactory]);

  const refreshData = useCallback(async (wallet = account, project = selectedProject) => {
    if (!wallet || !project || !window.ethereum) return;
    try {
      const { token, nft, exchange } = await getProjectContracts(project, false);
      const [bal, nftBal, approved, tokenSymbol, tokenDecimals, price] = await Promise.all([
        token.balanceOf(wallet),
        nft.balanceOf(wallet),
        token.allowance(wallet, project.exchangeAddress),
        token.symbol(),
        token.decimals(),
        exchange.nftPrice()
      ]);
      const d = Number(tokenDecimals);
      setDecimals(d);
      setSymbol(tokenSymbol);
      setNftPrice(formatUnits(price, d));
      setTokenBalance(Number(formatUnits(bal, d)).toLocaleString("en-US", { maximumFractionDigits: 6 }));
      setNftBalance(nftBal.toString());
      setAllowance(formatUnits(approved, d));
    } catch (error) {
      console.error("Refresh failed:", error);
      showNotice("error", "Could not load project balances", explainError(error));
    }
  }, [account, getProjectContracts, selectedProject]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      showNotice("error", "MetaMask required", "Install the extension, then refresh this page.");
      return;
    }
    try {
      setBusy("connect");
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const id = Number(network.chainId);
      setAccount(accounts[0] || "");
      setChainId(id);
      if (id !== CHAIN_ID) {
        showNotice("warning", "Wrong network", `Please switch MetaMask to ${CHAIN_NAME}.`);
      } else if (accounts[0]) {
        showNotice("success", "Wallet connected", `Connected ${shortAddress(accounts[0])}.`);
        await loadProjects(accounts[0]);
      }
    } catch (error) {
      showNotice("error", "Connection failed", explainError(error));
    } finally {
      setBusy("");
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      setBusy("network");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX }]
      });
    } catch (error) {
      if (error.code === 4902 && CHAIN_ID === 11155111) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"]
          }]
        });
      } else {
        showNotice("error", "Network switch failed", explainError(error));
      }
    } finally {
      setBusy("");
    }
  };

  const createProject = async (event) => {
    event.preventDefault();
    try {
      if (!account) throw new Error("Connect your wallet first.");
      if (!correctNetwork) throw new Error(`Switch MetaMask to ${CHAIN_NAME}.`);
      if (!form.tokenName.trim() || !form.tokenSymbol.trim() || !form.nftName.trim() || !form.nftSymbol.trim()) {
        throw new Error("Please fill in all project name and symbol fields.");
      }
      const d = Number(form.tokenDecimals);
      const supply = BigInt(form.initialSupply);
      const price = BigInt(form.nftPriceTokens);
      if (!Number.isInteger(d) || d < 0 || d > 18) throw new Error("Token decimals must be between 0 and 18.");
      if (supply <= 0n || price <= 0n) throw new Error("Initial supply and NFT price must be greater than zero.");

      setBusy("create");
      setNotice(null);
      const factory = await getFactory(true);
      const tx = await factory.createProject(
        form.tokenName.trim(),
        form.tokenSymbol.trim(),
        d,
        supply,
        form.nftName.trim(),
        form.nftSymbol.trim(),
        price
      );
      setLastTx(tx.hash);
      showNotice("pending", "Project creation submitted", "Factory is deploying your Token, NFT and Exchange contracts.", tx.hash);
      const receipt = await tx.wait();
      let createdId = "";
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed?.name === "ProjectCreated") {
            createdId = parsed.args.projectId.toString();
            break;
          }
        } catch { /* Ignore logs emitted by child contracts. */ }
      }
      if (!createdId) throw new Error("ProjectCreated event was not found in the transaction receipt.");

      const rawProject = await factory.getProject(createdId);
      const project = toProject(rawProject);
      setProjects((current) => [...current.filter((p) => p.projectId !== project.projectId), project]);
      setSelectedProjectId(project.projectId);
      setLastTokenId("");
      showNotice("success", `Project #${createdId} created!`, "Your independent ERC-20, ERC-721 and Exchange contracts are deployed.", tx.hash);
    } catch (error) {
      showNotice("error", "Project creation failed", explainError(error));
    } finally {
      setBusy("");
    }
  };

  const approveTokens = async () => {
    try {
      if (!selectedProject) throw new Error("Select a project first.");
      setBusy("approve");
      setNotice(null);
      const { token } = await getProjectContracts(selectedProject, true);
      const amount = parseUnits(nftPrice, decimals);
      const tx = await token.approve(selectedProject.exchangeAddress, amount);
      setLastTx(tx.hash);
      showNotice("pending", "Approval submitted", `Waiting for approval of ${nftPrice} ${symbol}.`, tx.hash);
      await tx.wait();
      showNotice("success", "Approval confirmed", `The exchange can now spend ${nftPrice} ${symbol}.`, tx.hash);
      await refreshData(account, selectedProject);
    } catch (error) {
      showNotice("error", "Approval failed", explainError(error));
    } finally {
      setBusy("");
    }
  };

  const buyNFT = async () => {
    try {
      if (!selectedProject) throw new Error("Select a project first.");
      setBusy("buy");
      setNotice(null);
      const { exchange } = await getProjectContracts(selectedProject, true);
      const tx = await exchange.buyNFT();
      setLastTx(tx.hash);
      showNotice("pending", "Purchase submitted", `Your ${nftPrice} ${symbol} NFT purchase is waiting for confirmation.`, tx.hash);
      const receipt = await tx.wait();
      let mintedId = "";
      for (const log of receipt.logs) {
        try {
          const parsed = exchange.interface.parseLog(log);
          if (parsed?.name === "NFTPurchased") {
            mintedId = parsed.args.tokenId.toString();
            break;
          }
        } catch { /* Ignore logs from other contracts. */ }
      }
      setLastTokenId(mintedId);
      showNotice("success", "NFT purchased!", mintedId ? `Your new ${selectedProject.nftName} is token #${mintedId}.` : "Your NFT purchase was confirmed.", tx.hash);
      await refreshData(account, selectedProject);
    } catch (error) {
      showNotice("error", "Purchase failed", explainError(error));
    } finally {
      setBusy("");
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setProjects([]);
    setSelectedProjectId("");
    setTokenBalance("0");
    setNftBalance("0");
    setAllowance("0");
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!selectedProject || !account || !correctNetwork) return;
    refreshData(account, selectedProject);
  }, [account, correctNetwork, selectedProjectId, projects, refreshData]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = async (accounts) => {
      setAccount(accounts[0] || "");
      if (accounts[0]) await loadProjects(accounts[0]);
      else disconnectWallet();
    };
    const onChain = async (id) => {
      const nextId = Number(id);
      setChainId(nextId);
      if (nextId === CHAIN_ID && account) await loadProjects(account);
    };
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    window.ethereum.request({ method: "eth_accounts" }).then(async (accounts) => {
      if (accounts[0]) {
        setAccount(accounts[0]);
        const net = await getProvider().getNetwork();
        setChainId(Number(net.chainId));
        if (Number(net.chainId) === CHAIN_ID) await loadProjects(accounts[0]);
      }
    }).catch(() => {});
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, [account, getProvider, loadProjects]);

  const approvedEnough = Number(allowance) >= Number(nftPrice || 0);
  const formattedAllowance = Number(allowance).toLocaleString("en-US", { maximumFractionDigits: 6 });

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark"><Gem size={21} /></span>
          <span>MALLAH<span className="brand-dot">.</span></span>
        </a>
        <nav className="nav-links">
          <a href="#projects">Projects</a><a href="#exchange">Exchange</a><a href="#how-it-works">How it works</a>
        </nav>
        <div className="top-actions">
          <span className={`network-pill ${correctNetwork ? "online" : ""}`}><span className="status-dot" />{CHAIN_NAME}</span>
          {account ? (
            <div className="wallet-wrap">
              <button className="wallet-button connected" onClick={() => setMenuOpen(!menuOpen)}>
                <span className="wallet-avatar"><Wallet size={15} /></span>{shortAddress(account)}<ChevronDown size={15} />
              </button>
              {menuOpen && <div className="wallet-menu"><div className="menu-address">{account}</div><button onClick={() => navigator.clipboard?.writeText(account)}><Copy size={14}/> Copy address</button><button onClick={disconnectWallet}><X size={14}/> Disconnect</button></div>}
            </div>
          ) : (
            <button className="wallet-button" onClick={connectWallet} disabled={busy === "connect"}>
              {busy === "connect" ? <LoaderCircle className="spin" size={16}/> : <Wallet size={16}/>} Connect wallet
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-line" /> THE MALLAH TOKEN & NFT FACTORY</div>
          <h1>Create tokens.<br/><span className="gradient-text">Launch collectibles.</span></h1>
          <p className="hero-copy">Create an independent ERC-20, ERC-721 and exchange project.<br className="desktop-break"/> Each project has its own token, NFT and purchase price.</p>
          <div className="hero-tags"><span><ShieldCheck size={14}/> On-chain factory</span><span><Zap size={14}/> Dynamic projects</span><span><Sparkles size={14}/> Unique NFTs</span></div>
        </section>

        <section className="panel" id="projects" style={{ padding: 24, marginBottom: 18 }}>
          <div className="card-heading">
            <div><div className="section-kicker">FACTORY</div><h2>Create a new project</h2></div>
            <span className="live-label"><span className="status-dot"/> {projects.length} YOUR PROJECTS</span>
          </div>
          {!factoryReady && <div className="inline-alert warning"><CircleHelp size={17}/> Add VITE_FACTORY_ADDRESS to your frontend .env file.</div>}
          <form onSubmit={createProject} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            {[
              ["Token name", "tokenName", "text"],
              ["Token symbol", "tokenSymbol", "text"],
              ["Token decimals (0–18)", "tokenDecimals", "number"],
              ["Initial supply (whole tokens)", "initialSupply", "number"],
              ["NFT name", "nftName", "text"],
              ["NFT symbol", "nftSymbol", "text"],
              ["NFT price (whole tokens)", "nftPriceTokens", "number"]
            ].map(([label, key, type]) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 7, color: "#9297a6", fontSize: 11 }}>
                {label}
                <input
                  type={type}
                  min={type === "number" ? (key === "tokenDecimals" ? 0 : 1) : undefined}
                  max={key === "tokenDecimals" ? 18 : undefined}
                  step="1"
                  value={form[key]}
                  onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                  required
                  style={{ width: "100%", background: "#10131b", color: "#f3f4f6", border: "1px solid #343746", borderRadius: 9, padding: "12px", outline: "none" }}
                />
              </label>
            ))}
            <div style={{ display: "flex", alignItems: "end" }}>
              <button className="primary-button" type="submit" disabled={!account || !correctNetwork || !factoryReady || !!busy} style={{ marginTop: 0 }}>
                {busy === "create" ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>}
                {busy === "create" ? "Creating project..." : "Create project"}
              </button>
            </div>
          </form>
          {!account && <div className="approval-caption">Connect MetaMask to create a project. Sepolia ETH is required for gas.</div>}
          {account && !correctNetwork && <button className="primary-button" onClick={switchNetwork} disabled={!!busy}><RefreshCw size={17}/> Switch to {CHAIN_NAME}</button>}
          {projects.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="section-kicker" style={{ marginBottom: 9 }}>YOUR DEPLOYED PROJECTS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {projects.map((project) => (
                  <button key={project.projectId} onClick={() => { setSelectedProjectId(project.projectId); setLastTokenId(""); }} style={{
                    background: selectedProjectId === project.projectId ? "#30284a" : "#10131b",
                    color: selectedProjectId === project.projectId ? "#d5caff" : "#a4a8b5",
                    border: `1px solid ${selectedProjectId === project.projectId ? "#7661bd" : "#343746"}`,
                    borderRadius: 9, padding: "10px 13px", textAlign: "left", fontSize: 11
                  }}>
                    <strong>#{project.projectId} · {project.tokenSymbol}</strong><br/>
                    <span style={{ opacity: .7 }}>{project.tokenName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-grid" id="exchange">
          <div className="exchange-card panel">
            <div className="card-heading">
              <div><div className="section-kicker">THE EXCHANGE</div><h2>{selectedProject ? `Get your ${selectedProject.nftName}` : "Select a project"}</h2></div>
              <span className="live-label"><span className="status-dot"/> LIVE ON {CHAIN_NAME.toUpperCase()}</span>
            </div>

            {!selectedProject ? (
              <div className="inline-alert warning"><FolderOpen size={17}/> Create a project above or connect the wallet that created one of your projects.</div>
            ) : (
              <>
                <div className="swap-box">
                  <div className="swap-label"><span>You pay</span><span>Balance: {account ? `${tokenBalance} ${symbol}` : "—"}</span></div>
                  <div className="amount-row"><div className="amount">{Number(nftPrice).toLocaleString("en-US", { maximumFractionDigits: 6 })}</div><div className="token-chip"><span className="coin-icon">M</span><span>{symbol}</span><ChevronDown size={14}/></div></div>
                  <div className="swap-sub">Project #{selectedProject.projectId} · Fixed exchange price</div>
                </div>
                <div className="swap-arrow"><ArrowDownLeft size={17}/></div>
                <div className="receive-box">
                  <div className="swap-label"><span>You receive</span><span>Unique collectible</span></div>
                  <div className="receive-content">
                    <div className="nft-art"><div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/><Gem size={42}/><span className="art-star star-a">✦</span><span className="art-star star-b">✧</span></div>
                    <div className="receive-info"><strong>1 × {selectedProject.nftName}</strong><span>{selectedProject.nftSymbol} · ERC-721 collectible</span><span className="rarity"><Sparkles size={12}/> One of a kind</span></div>
                    <div className="receive-count">× 1</div>
                  </div>
                </div>

                {account && correctNetwork && (
                  <>
                    {Number(allowance) < Number(nftPrice) ? (
                      <button className="primary-button" onClick={approveTokens} disabled={!!busy}>
                        {busy === "approve" ? <LoaderCircle className="spin" size={17}/> : <LockKeyhole size={17}/>}
                        {busy === "approve" ? "Waiting for approval..." : `Approve ${nftPrice} ${symbol}`}
                        {!busy && <ArrowUpRight size={17}/>}
                      </button>
                    ) : (
                      <button className="primary-button" onClick={buyNFT} disabled={!!busy}>
                        {busy === "buy" ? <LoaderCircle className="spin" size={17}/> : <Gem size={17}/>}
                        {busy === "buy" ? "Purchasing NFT..." : `Buy 1 ${selectedProject.nftSymbol} NFT`}
                        {!busy && <ArrowUpRight size={17}/>}
                      </button>
                    )}
                    <div className="approval-caption">{Number(allowance) >= Number(nftPrice) ? `Approved allowance: ${formattedAllowance} ${symbol}` : `Step 1 of 2 · Approve ${nftPrice} ${symbol} for this exchange`}</div>
                  </>
                )}
              </>
            )}

            {!providerAvailable && <div className="inline-alert warning"><CircleHelp size={17}/> MetaMask is not detected. Install the extension to continue.</div>}
            {account && !correctNetwork && <button className="primary-button" onClick={switchNetwork} disabled={!!busy}><RefreshCw size={17}/> Switch to {CHAIN_NAME}</button>}
            {!account && <button className="primary-button" onClick={connectWallet} disabled={!!busy}><Wallet size={17}/> Connect wallet to continue <ArrowUpRight size={17}/></button>}
            <div className="fee-note"><ShieldCheck size={14}/> You’ll confirm each transaction in your wallet. Network gas fees apply.</div>
          </div>

          <aside className="side-column">
            <div className="stats-card panel">
              <div className="section-kicker">YOUR WALLET</div>
              <div className="stats-title">Your collection</div>
              <div className="stat-row"><div className="stat-icon token-stat"><span>M</span></div><div className="stat-copy"><span>{symbol} balance</span><strong>{account && selectedProject ? `${tokenBalance} ${symbol}` : "—"}</strong></div><span className="stat-chain">ERC-20</span></div>
              <div className="stat-divider"/>
              <div className="stat-row"><div className="stat-icon nft-stat"><Gem size={18}/></div><div className="stat-copy"><span>NFTs owned</span><strong>{account && selectedProject ? nftBalance : "—"}</strong></div><span className="stat-chain">ERC-721</span></div>
              <button className="refresh-button" onClick={() => refreshData(account, selectedProject)} disabled={!account || !selectedProject}><RefreshCw size={14}/> Refresh balances</button>
            </div>
            <div className="how-card panel" id="how-it-works">
              <div className="section-kicker">THREE SIMPLE STEPS</div>
              <h3>How it works</h3>
              <div className="step"><span className="step-number">01</span><div><strong>Create or select a project</strong><p>Factory deploys an independent Token, NFT and Exchange.</p></div></div>
              <div className="step"><span className="step-number">02</span><div><strong>Approve the token price</strong><p>Allow the selected exchange to spend the required project tokens.</p></div></div>
              <div className="step"><span className="step-number">03</span><div><strong>Receive your NFT</strong><p>The exchange mints the NFT directly to your wallet.</p></div></div>
            </div>
          </aside>
        </section>

        {selectedProject && (
          <section className="panel" style={{ padding: 20, marginTop: 18 }}>
            <div className="section-kicker">SELECTED PROJECT CONTRACTS</div>
            <div style={{ display: "grid", gap: 10, marginTop: 12, fontSize: 11, color: "#a4a8b5" }}>
              {[["Token", selectedProject.tokenAddress], ["NFT", selectedProject.nftAddress], ["Exchange", selectedProject.exchangeAddress]].map(([label, address]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{label}</strong>
                  <a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer" style={{ color: "#b8a5ff", overflowWrap: "anywhere" }}>{address} <ExternalLink size={11}/></a>
                </div>
              ))}
            </div>
          </section>
        )}

        {notice && (
          <section className={`notice ${notice.type}`}>
            <div className="notice-icon">{notice.type === "success" ? <Check size={18}/> : notice.type === "pending" ? <LoaderCircle className="spin" size={18}/> : <CircleHelp size={18}/>}</div>
            <div className="notice-copy"><strong>{notice.title}</strong><span>{notice.message}</span>{notice.hash && <a href={`${EXPLORER}/tx/${notice.hash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12}/></a>}</div>
            <button className="notice-close" onClick={() => setNotice(null)}><X size={16}/></button>
          </section>
        )}

        {lastTokenId && selectedProject && <section className="minted-banner panel"><div className="minted-icon"><Gem size={22}/></div><div><strong>Congratulations — NFT #{lastTokenId} minted!</strong><span>Your {selectedProject.nftName} has been sent to {shortAddress(account)}.</span></div><a href={`${EXPLORER}/address/${selectedProject.nftAddress}`} target="_blank" rel="noreferrer">View contract <ExternalLink size={13}/></a></section>}

        <section className="bottom-strip">
          <div><span className="bottom-icon"><ShieldCheck size={17}/></span><span><strong>Transparent by design</strong><small>Every project and purchase is recorded on-chain.</small></span></div>
          <div><span className="bottom-icon"><LockKeyhole size={17}/></span><span><strong>Your wallet, your keys</strong><small>We never ask for your recovery phrase.</small></span></div>
          <div><span className="bottom-icon"><Zap size={17}/></span><span><strong>Independent projects</strong><small>Each project has its own token and NFT.</small></span></div>
        </section>
      </main>

      <footer><a className="footer-brand" href="#">MALLAH<span>.</span></a><span>Built for the on-chain world.</span><span className="footer-network"><span className="status-dot"/> {CHAIN_NAME} TESTNET</span></footer>
    </div>
  );
}
