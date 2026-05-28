// ============================================================================
// Module: Multi-Paradigm Auction Core & Clock Guard
// File: auctionEngine.js
// ============================================================================

class AuctionEngine {
    constructor(ioInstance, auditLogger) {
        this.io = ioInstance;
        this.logger = auditLogger;
    }

    /**
     * Validates incoming bids based on specific auction rules
     * @param {Object} lot - Mongoose Document
     * @param {number} bidAmount - Proposed bid value
     * @param {string} bidderId - Identity of the bidding node
     */
    processBid(lot, bidAmount, bidderId) {
        if (lot.status !== 'LIVE') {
            throw new Error('Transaction Rejected: Auction window is closed or suspended.');
        }

        const proposedBid = parseFloat(bidAmount);
        if (isNaN(proposedBid)) throw new Error('Invalid numeric allocation entry.');

        switch (lot.auctionType) {
            case 'ENGLISH':
                // Open-cry ascending rules
                const minimumRequired = lot.currentBidPrice + (lot.bidIncrement || 10);
                if (proposedBid < minimumRequired) {
                    throw new Error(`Outbid requirements unmet. Minimum acceptable quote: ₹${minimumRequired}`);
                }
                break;

            case 'REVERSE':
                // Downward procurement sourcing rules
                if (proposedBid >= lot.currentBidPrice) {
                    throw new Error(`Procurement failure: Supply bids must sit strictly below current baseline of ₹${lot.currentBidPrice}`);
                }
                break;

            case 'DUTCH':
                // Descending price clock tick matching
                if (proposedBid < lot.currentBidPrice) {
                    throw new Error(`Dutch Clock Match Error: Bids cannot be lower than the active descending tick: ₹${lot.currentBidPrice}`);
                }
                // In Dutch auctions, the first valid bid at or above the current tick instantly secures the asset
                lot.status = 'SETTLED';
                break;

            default:
                throw new Error('Execution Block: Unknown bidding state matrix paradigm.');
        }

        // Apply mutations
        lot.currentBidPrice = proposedBid;
        lot.currentHighBidder = bidderId;
        lot.recentBidAt = new Date();

        // Trigger Anti-Sniper Window Extension Evaluation
        this.enforceAntiSniperProtection(lot);

        return lot;
    }

    /**
     * Extends auction runway if a bid lands within the critical expiry threshold
     */
    enforceAntiSniperProtection(lot) {
        if (!lot.auctionEndTime || lot.status !== 'LIVE') return;

        const SNIPER_WINDOW_MS = 45000; // 45 seconds buffer zone
        const EXTENSION_TIME_MS = 90000; // 90 seconds runway injection
        
        const remainingRunway = new Date(lot.auctionEndTime).getTime() - Date.now();

        if (remainingRunway > 0 && remainingRunway <= SNIPER_WINDOW_MS) {
            lot.auctionEndTime = new Date(Date.now() + EXTENSION_TIME_MS);
            const alertText = `⏱️ [Clock Guard]: Sniper window mitigation triggered for ${lot.lotCode}. Deadline extended by 90s.`;
            this.logger(alertText);
            this.io('STATUS_UPDATED', { activeLot: lot, logText: alertText });
        }
    }
}

module.exports = AuctionEngine;