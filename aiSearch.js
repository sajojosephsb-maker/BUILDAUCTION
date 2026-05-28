// ============================================================================
// Module: Lexical Context Filtering & Semantic AI Assistant
// File: aiSearch.js
// ============================================================================

class AISearchAssistant {
    /**
     * Parses loose linguistic sentences to identify explicit database parameters
     * @param {string} rawQueryString - Direct string input from UI terminal
     * @param {Object} activeLotDocument - Mongoose reference containing physical tracking parameters
     * @param {Object} activeMacroState - Mongoose reference containing global trend indices
     */
    static evaluateQueryContext(rawQueryString, activeLotDocument, activeMacroState) {
        const query = rawQueryString.toLowerCase();
        let technicalResponse = "";

        // Intent Node 1: Quality Parameters & Moisture Rules
        if (query.includes("moisture") || query.includes("quality") || query.includes("hydric")) {
            const ceilingThreshold = 12.0;
            const deviationStatus = activeLotDocument.moisture > ceilingThreshold 
                ? "CRITICAL CRITERIA EXCEEDED: Non-compliant lot." 
                : "COMPLIANCE LANE CONFIRMED: Safe tracking parameters verified.";

            technicalResponse = `🔍 [AI Assistant]: Quality Assessment Layer verified item reference [${activeLotDocument.lotCode}]. Evaluated moisture content maps at ${activeLotDocument.moisture}%. Statutory ceiling baseline reads ${ceilingThreshold}%. Status: ${deviationStatus}`;
        } 
        
        // Intent Node 2: Meteorological Volatility & Trends
        else if (query.includes("weather") || query.includes("climate") || query.includes("trend") || query.includes("forecast")) {
            technicalResponse = `🔍 [AI Assistant]: Current Environmental Trend Analysis running. Matrix Context: [${activeMacroState.activeClimateEvent}]. Systematic tracking modules have induced a pricing volatility premium modifier of +${(activeMacroState.climateRiskFactor * 100).toFixed(1)}% across relative crop lots.`;
        } 
        
        // Intent Node 3: Geopolitical Obstructions & Trade Tariffs
        else if (query.includes("politics") || query.includes("geopolitical") || query.includes("tariff") || query.includes("suez")) {
            technicalResponse = `🔍 [AI Assistant]: Trade Security Registry logging global events. Core Indicator: [${activeMacroState.activeGeopoliticalEvent}]. Operational overhead tracking indicates a global logistics friction variable running at ${(activeMacroState.geopoliticalRiskFactor * 100).toFixed(1)}%. Protect proxy caps accordingly.`;
        } 
        
        // Intent Node 4: Generic Fallback Telemetry Hydration
        else {
            technicalResponse = `🔍 [AI Assistant]: Query indexed across core nodes. Active Asset: ${activeLotDocument.commodity} (${activeLotDocument.lotCode}). Pricing Mechanism Engine: [${activeLotDocument.auctionType}]. Active quote tracking is stabilized at ₹${activeLotDocument.currentBidPrice}/Kg under high-bidder token profile: [${activeLotDocument.currentHighBidder}].`;
        }

        return technicalResponse;
    }
}

module.exports = AISearchAssistant;