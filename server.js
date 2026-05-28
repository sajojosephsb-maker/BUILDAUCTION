// ============================================================================
// SpiceAuction Pro v6.0 Maxima — Fully Integrated Server Core
// Core Framework: Node.js | Express | Native WebSockets | Mongoose ODM
// ============================================================================

require('dotenv').config(); 
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// --- Import Decoupled Modules from Root Directory ---
const AuctionEngine = require('./auctionEngine');
const MacroPredictor = require('./macroPredictor');
const AISearchAssistant = require('./aiSearch');

const APP_SECRET = "SPICE_BOARD_SECURE_HASH_CRYPTO_KEY_2026";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/spiceAuctionMax6";
const PORT = process.env.PORT || 4000;

// --- Express App & Server Infrastructure Setup ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- MongoDB Schemas & Models Definition ---
const LotSchema = new mongoose.Schema({
    lotCode: { type: String, default: "LOT-401A", unique: true },
    commodity: { type: String, default: "Premium Idukki Cardamom" },
    basePricePerKg: { type: Number, default: 1500 },
    currentBidPrice: { type: Number, default: 1500 },
    currentHighBidder: { type: String, default: "No Bids Yet" },
    weightKgs: { type: Number, default: 500 },
    moisture: { type: Number, default: 11.4 },
    density: { type: Number, default: 785 },
    auctionType: { type: String, enum: ['ENGLISH', 'DUTCH', 'REVERSE', 'SEALED'], default: 'ENGLISH' },
    status: { type: String, enum: ['LIVE', 'SETTLED', 'SUSPENDED'], default: 'LIVE' },
    auctionEndTime: { type: Date },
    recentBidAt: { type: Date },
    bidIncrement: { type: Number, default: 10 },
    proxyMaxBids: { type: Map, of: Number, default: {} },
    escrowWalletBalance: { type: Number, default: 0 }
});

const PoolSchema = new mongoose.Schema({
    poolId: { type: String, default: "GLOBAL-VAULT" },
    totalFund: { type: Number, default: 250000 },
    contributors: { type: Map, of: Number, default: {} }
});

const MacroStateSchema = new mongoose.Schema({
    stateKey: { type: String, default: "CURRENT_MACRO" },
    climateRiskFactor: { type: Number, default: 0.0 },
    geopoliticalRiskFactor: { type: Number, default: 0.0 },
    activeClimateEvent: { type: String, default: "Stable Micro-Climate Conditions" },
    activeGeopoliticalEvent: { type: String, default: "Open Maritime Trade Corridors" }
});

const Lot = mongoose.model('Lot', LotSchema);
const Pool = mongoose.model('Pool', PoolSchema);
const MacroState = mongoose.model('MacroState', MacroStateSchema);

// --- System Utility Logging Pipeline ---
function writeToAuditLog(text) {
    const formattedLog = `[${new Date().toISOString()}] ${text}\n`;
    fs.appendFile(path.join(__dirname, 'system_audit.log'), formattedLog, (err) => {
        if (err) console.error("⛔ [LOGGING EXCEPTION]:", err);
    });
}

// --- WebSocket Broadcast Helper Node ---
function broadcastToCluster(type, payload) {
    const transmissionPacket = JSON.stringify({ type, payload });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(transmissionPacket);
        }
    });
}

// --- Instantiating Core Modular Engines ---
const auctionCore = new AuctionEngine(broadcastToCluster, writeToAuditLog);
const macroCore = new MacroPredictor(broadcastToCluster, Lot, MacroState, writeToAuditLog);

// --- REST Endpoint: Gateway JWT Access Token Minting ---
app.post('/api/auth/login', (req, res) => {
    const { uid, password } = req.body;
    const ROLES_REGISTRY = {
        'ADMIN001': 'ADMIN', 'AUC-CPA': 'AUCTIONEER',
        'TR-247': 'TRADER', 'TR-248': 'TRADER', 'QC-001': 'QUALITY_CONTROL'
    };
    if (!ROLES_REGISTRY[uid]) return res.status(401).json({ message: "Invalid Profile ID" });
    const token = jwt.sign({ uid, role: ROLES_REGISTRY[uid] }, APP_SECRET, { expiresIn: '8h' });
    return res.json({ token, uid, role: ROLES_REGISTRY[uid] });
});

// --- Seed Initial Setup Database Records ---
async function bootstrapSystemDatabase() {
    await Lot.deleteMany({});
    await Pool.deleteMany({});
    await MacroState.deleteMany({});

    const initialLot = new Lot({
        auctionEndTime: new Date(Date.now() + 8 * 60 * 1000),
        recentBidAt: new Date()
    });
    await initialLot.save();
    await (new Pool()).save();
    await (new MacroState()).save();
    console.log("🌱 [DATABASE]: Bootstrapped default collections successfully.");
}

// --- WebSocket Gateway Routing Infrastructure ---
wss.on('connection', async (ws) => {
    const currentLot = await Lot.findOne({ lotCode: "LOT-401A" });
    const defaultPool = await Pool.findOne({ poolId: "GLOBAL-VAULT" });
    const currentMacro = await MacroState.findOne({ stateKey: "CURRENT_MACRO" });

    ws.send(JSON.stringify({ 
        type: 'INITIAL_STATE', 
        payload: { activeLot: currentLot, defaultPool, currentMacro, logText: "🔌 Connected to cluster." } 
    }));

    ws.on('message', async (message) => {
        try {
            const packet = JSON.parse(message);
            const { type, token, data } = packet;

            let decodedTokenCtx = null;
            if (token) {
                try { decodedTokenCtx = jwt.verify(token, APP_SECRET); } 
                catch(e) { return ws.send(JSON.stringify({ type: 'TX_ERROR', message: 'Cryptographic failure.' })); }
            }

            const activeLot = await Lot.findOne({ lotCode: "LOT-401A" });
            const activePool = await Pool.findOne({ poolId: "GLOBAL-VAULT" });
            const activeMacro = await MacroState.findOne({ stateKey: "CURRENT_MACRO" });

            switch(type) {
                case 'SUBMIT_BID':
                    try {
                        const updatedLot = auctionCore.processBid(activeLot, data.bidAmount, decodedTokenCtx.uid);
                        await updatedLot.save();
                        const trText = `⚖️ [Bid Accepted]: Node ${decodedTokenCtx.uid} set quote to ₹${data.bidAmount}/Kg`;
                        writeToAuditLog(trText);
                        broadcastToCluster('BID_UPDATED', { activeLot: updatedLot, logText: trText });
                    } catch(err) {
                        ws.send(JSON.stringify({ type: 'TX_ERROR', message: err.message }));
                    }
                    break;

                case 'REGISTER_PROXY_LIMIT':
                    if (!decodedTokenCtx || decodedTokenCtx.role !== 'TRADER') return;
                    activeLot.proxyMaxBids.set(decodedTokenCtx.uid, parseFloat(data.maxLimit));
                    await activeLot.save();
                    ws.send(JSON.stringify({ type: 'LOG_APPENDED', payload: { logText: `🤖 Proxy configured at ₹${data.maxLimit}/Kg` } }));
                    break;

                case 'CONTRIBUTE_TO_POOL':
                    if (!decodedTokenCtx || decodedTokenCtx.role !== 'TRADER') return;
                    const deposit = parseFloat(data.amount);
                    activePool.totalFund += deposit;
                    activePool.contributors.set(decodedTokenCtx.uid, (activePool.contributors.get(decodedTokenCtx.uid) || 0) + deposit);
                    await activePool.save();
                    broadcastToCluster('POOL_UPDATED', { pool: activePool, logText: `👥 [Pool Balance]: Vault now reads ₹${activePool.totalFund.toLocaleString('en-IN')}` });
                    break;

                case 'SET_ENGINE_TYPE':
                    if (!decodedTokenCtx || (decodedTokenCtx.role !== 'ADMIN' && decodedTokenCtx.role !== 'AUCTIONEER')) return;
                    activeLot.auctionType = data.engineType;
                    if (data.engineType === 'DUTCH') activeLot.currentBidPrice = activeLot.basePricePerKg * 1.3;
                    if (data.engineType === 'REVERSE') activeLot.currentBidPrice = activeLot.basePricePerKg;
                    await activeLot.save();
                    broadcastToCluster('STATUS_UPDATED', { activeLot, logText: `⚙️ Engine changed to: ${data.engineType}` });
                    break;

                case 'UPDATE_QUALITY_METRICS':
                    if (!decodedTokenCtx || (decodedTokenCtx.role !== 'QUALITY_CONTROL' && decodedTokenCtx.role !== 'ADMIN')) return;
                    activeLot.moisture = parseFloat(data.moisture);
                    await activeLot.save();
                    broadcastToCluster('QUALITY_UPDATED', { activeLot, logText: `🧪 Lab Metrics calibrated -> Moisture: ${data.moisture}%` });
                    break;

                case 'EXECUTE_HAMMER_FALL':
                    if (!decodedTokenCtx || (decodedTokenCtx.role !== 'AUCTIONEER' && decodedTokenCtx.role !== 'ADMIN')) return;
                    activeLot.status = 'SETTLED';
                    activeLot.escrowWalletBalance = activeLot.currentBidPrice * activeLot.weightKgs;
                    await activeLot.save();
                    broadcastToCluster('STATUS_UPDATED', { activeLot, logText: `🔨 [HAMMER FALL]: Asset secured: ₹${activeLot.escrowWalletBalance.toLocaleString('en-IN')}` });
                    break;

                case 'AI_SEARCH_QUERY':
                    const aiInsightText = AISearchAssistant.evaluateQueryContext(data.query, activeLot, activeMacro);
                    ws.send(JSON.stringify({ type: 'LOG_APPENDED', payload: { logText: aiInsightText } }));
                    break;
            }
        } catch(err) {
            console.error("⛔ [Routing Fault]:", err);
        }
    });
});

// --- Bootstrapping Execution Pipeline ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("💾 Secured connection to cloud database.");
        bootstrapSystemDatabase().then(() => {
            macroCore.startSimulationLoop(25000);
            server.listen(PORT, () => console.log(`🌿 Server streaming live at http://localhost:${PORT}`));
        });
    })
    .catch(err => console.error("Database initialization fault:", err));
