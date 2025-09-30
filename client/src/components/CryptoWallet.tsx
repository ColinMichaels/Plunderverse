import { useState, useEffect } from "react";
import { useCrypto } from "../lib/stores/useCrypto";
import { SpaceUIPanel } from "./SpaceUIPanel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

function getOrCreatePlayerId(): string {
  const PLAYER_ID_KEY = 'space_game_player_id';
  let playerId = localStorage.getItem(PLAYER_ID_KEY);
  
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(PLAYER_ID_KEY, playerId);
    console.log('[CRYPTO-WALLET] Generated new player ID:', playerId);
  } else {
    console.log('[CRYPTO-WALLET] Using existing player ID:', playerId);
  }
  
  return playerId;
}

export function CryptoWallet() {
  const {
    isInitialized,
    walletAddress,
    balance,
    currency,
    marketPrice,
    showWallet,
    isProcessingTransaction,
    lastTransactionResult,
    initializeCrypto,
    toggleWallet,
    refreshBalance,
    refreshMarketPrice,
    transferToPlayer,
    clearLastTransactionResult
  } = useCrypto();

  const [transferAmount, setTransferAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferMemo, setTransferMemo] = useState("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Auto-refresh balance and market price every 30 seconds
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      refreshBalance();
      refreshMarketPrice();
    }, 30000);

    return () => clearInterval(interval);
  }, [isInitialized, refreshBalance, refreshMarketPrice]);

  // Clear transaction result after 5 seconds
  useEffect(() => {
    if (lastTransactionResult) {
      const timer = setTimeout(() => {
        clearLastTransactionResult();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastTransactionResult, clearLastTransactionResult]);

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!recipientAddress.trim()) {
      alert("Please enter a recipient address");
      return;
    }

    if (amount > balance) {
      alert("Insufficient balance");
      return;
    }

    const success = await transferToPlayer(recipientAddress.trim(), amount, transferMemo.trim() || undefined);
    
    if (success) {
      setTransferAmount("");
      setRecipientAddress("");
      setTransferMemo("");
      setShowTransferDialog(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number | undefined) => {
    if (balance === undefined || balance === null) return '0.00';
    return balance.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  };

  const handleInitializeWallet = async () => {
    setIsInitializing(true);
    setInitError(null);
    
    try {
      const playerId = getOrCreatePlayerId();
      console.log('[CRYPTO-WALLET] Initializing wallet with player ID:', playerId);
      
      const success = await initializeCrypto(playerId);
      
      if (!success) {
        setInitError('Failed to initialize wallet. Please try again.');
      }
    } catch (error) {
      console.error('[CRYPTO-WALLET] Initialization error:', error);
      setInitError('An error occurred during initialization.');
    } finally {
      setIsInitializing(false);
    }
  };

  if (!isInitialized) {
    return (
      <SpaceUIPanel
        id="crypto-wallet"
        title="CRYPTO WALLET"
        icon="💰"
        zone="right-sidebar"
        priority={2}
        defaultExpanded={true}
      >
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <div className="text-yellow-400 font-semibold">
              Wallet Not Initialized
            </div>
            <div className="text-sm text-slate-400">
              Initialize your crypto wallet to:
            </div>
            <ul className="text-xs text-slate-300 space-y-1 text-left list-disc list-inside">
              <li>Earn cryptocurrency from mining</li>
              <li>Trade resources for crypto</li>
              <li>Transfer funds to other players</li>
            </ul>
          </div>
          
          <Button
            onClick={handleInitializeWallet}
            disabled={isInitializing}
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold"
          >
            {isInitializing ? (
              <>⏳ INITIALIZING...</>
            ) : (
              <>🚀 INITIALIZE CRYPTO WALLET</>
            )}
          </Button>
          
          {initError && (
            <div className="space-status-bar border border-red-400/30 bg-red-900/20 rounded">
              <div className="space-status-item">
                <span className="text-red-400 text-xs">
                  ❌ {initError}
                </span>
              </div>
            </div>
          )}
          
          {isInitializing && (
            <div className="space-status-bar border border-cyan-400/30 bg-cyan-900/20 rounded">
              <div className="space-status-item">
                <span className="text-cyan-400 text-xs">
                  ⏳ Creating wallet and connecting to blockchain...
                </span>
              </div>
            </div>
          )}
        </div>
      </SpaceUIPanel>
    );
  }

  return (
    <SpaceUIPanel
      id="crypto-wallet"
      title="CRYPTO WALLET"
      icon="💰"
      zone="right-sidebar"
      priority={2}
      defaultExpanded={showWallet}
    >
      <div className="space-y-3">
        {/* Wallet Address */}
        <div className="space-status-bar">
          <div className="space-status-item">
            <span className="text-cyan-400 font-mono text-xs">WALLET:</span>
            <span className="font-mono text-xs">{formatAddress(walletAddress || "")}</span>
          </div>
        </div>

        {/* Balance */}
        <div className="space-status-bar border border-green-400/30 bg-green-900/20 rounded">
          <div className="space-status-item">
            <span className="text-green-300 font-mono">BALANCE:</span>
            <span className="text-green-400 font-bold font-mono">
              {formatBalance(balance)} {currency}
            </span>
          </div>
        </div>

        {/* Market Price */}
        {marketPrice && marketPrice.priceInUSD !== undefined && (
          <div className="space-status-bar border border-blue-400/30 bg-blue-900/20 rounded">
            <div className="space-status-item">
              <span className="text-blue-300 font-mono text-xs">MARKET:</span>
              <span className="text-blue-400 font-mono text-xs">
                ${marketPrice.priceInUSD.toFixed(4)}
                {marketPrice.change24h !== undefined && (
                  <span className={`ml-1 ${marketPrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({marketPrice.change24h >= 0 ? '+' : ''}{marketPrice.change24h.toFixed(2)}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={refreshBalance}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            disabled={isProcessingTransaction}
          >
            🔄 REFRESH BALANCE
          </Button>

          <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
            <DialogTrigger asChild>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                disabled={isProcessingTransaction || balance <= 0}
              >
                💸 TRANSFER
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border border-slate-600">
              <DialogHeader>
                <DialogTitle className="text-cyan-400">Transfer {currency}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Recipient Address</label>
                  <Input
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="Enter wallet address"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">
                    Amount (Available: {formatBalance(balance)} {currency})
                  </label>
                  <Input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                    max={(balance || 0).toString()}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Memo (Optional)</label>
                  <Input
                    value={transferMemo}
                    onChange={(e) => setTransferMemo(e.target.value)}
                    placeholder="Add a note..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowTransferDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTransfer}
                    disabled={isProcessingTransaction}
                    className="flex-1 bg-purple-600 hover:bg-purple-500"
                  >
                    {isProcessingTransaction ? "Processing..." : "Transfer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transaction Result */}
        {lastTransactionResult && (
          <div className={`space-status-bar border rounded ${
            lastTransactionResult.success 
              ? 'border-green-400/30 bg-green-900/20' 
              : 'border-red-400/30 bg-red-900/20'
          }`}>
            <div className="space-status-item">
              <span className={`text-xs ${
                lastTransactionResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {lastTransactionResult.success ? '✅' : '❌'} {lastTransactionResult.message}
              </span>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isProcessingTransaction && (
          <div className="space-status-bar border border-yellow-400/30 bg-yellow-900/20 rounded">
            <div className="space-status-item">
              <span className="text-yellow-400 text-xs">
                ⏳ Processing transaction...
              </span>
            </div>
          </div>
        )}
      </div>
    </SpaceUIPanel>
  );
}