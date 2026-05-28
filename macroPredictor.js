// ============================================================================
// Module: Macro-Climate & Geopolitical Interference Simulator
// File: macroPredictor.js
// ============================================================================

class MacroPredictor {
    constructor(ioInstance, LotModel, MacroModel, auditLogger) {
        this.io = ioInstance;
        this.Lot = LotModel;
        this.Macro = MacroModel;
        this.logger = auditLogger;
    }

    /**
     * Initializes the background matrix state cycle loop
     * @param {number} intervalMs - Frequency of environmental data shifts
     */
    startSimulationLoop(intervalMs = 25000) {
        this.logger("🌍 [MACRO INFRASTRUCTURE]: Initializing context generation streams...");
        
        setInterval(async () => {
            try {
                const macro = await this.Macro.findOne({ stateKey: "CURRENT_MACRO" });
                const lot = await this.Lot.findOne({ lotCode: "LOT-401A" });
                
                if (!macro || !lot || lot.status !== 'LIVE') return;

                // Deterministic Macro Matrices
                const CLIMATE_SCENARIOS = [
                    { event: "Delayed Monsoons Threaten Cardamom Yields across Western Ghats", variance: 0.15 },
                    { event: "Unseasonal Flash Flooding Inundates Storage Facilities", variance: 0.22 },
                    { event: "Optimal Temperate Window Enhances Outer Crop Bulk Density", variance: -0.05 }
                ];

                const GEOPOLITICAL_SCENARIOS = [
                    { event: "Suez Canal Restrictions Induce Container Deficits", variance: 0.18 },
                    { event: "EU Amends Maximum Residue Limits on Seed Imports", variance: 0.12 },
                    { event: "Bilateral Trade Pact Reduces Custom Duties", variance: -0.08 }
                ];

                const activeClimate = CLIMATE_SCENARIOS[Math.floor(Math.random() * CLIMATE_SCENARIOS.length)];
                const activeGeo = GEOPOLITICAL_SCENARIOS[Math.floor(Math.random() * GEOPOLITICAL_SCENARIOS.length)];

                // Update persistent global parameters
                macro.activeClimateEvent = activeClimate.event;
                macro.climateRiskFactor = activeClimate.variance;
                macro.activeGeopoliticalEvent = activeGeo.event;
                macro.geopoliticalRiskFactor = activeGeo.variance;
                await macro.save();

                // Compute combined asset impact valuation
                const combinedOverhead = macro.climateRiskFactor + macro.geopoliticalRiskFactor;
                
                if (combinedOverhead !== 0) {
                    // Soft price index adjustment scale (2% velocity of macro risk modifier)
                    lot.currentBidPrice = Math.round(lot.currentBidPrice * (1 + (combinedOverhead * 0.02)));
                    await lot.save();
                }

                const broadcastPayload = `🌍 [MACRO SHOCK UPDATE]\n🌤️ Climate Index: ${macro.activeClimateEvent} (Shift: +${(macro.climateRiskFactor * 100).toFixed(1)}%)\n⚓ Political Index: ${macro.activeGeopoliticalEvent} (Shift: +${(macro.geopoliticalRiskFactor * 100).toFixed(1)}%)`;
                
                this.logger(broadcastPayload);
                this.io('LOG_APPENDED', { logText: broadcastPayload, activeLot: lot });

            } catch (err) {
                console.error("⛔ [Macro Engine Exception Frame Failed]:", err.message);
            }
        }, intervalMs);
    }
}

module.exports = MacroPredictor;