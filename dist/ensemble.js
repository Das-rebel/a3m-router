"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiRoundDialogOptimizer = exports.dialogOptimizer = exports.calculateEnhancedShapley = exports.HandicapCalculator = exports.LoyaltyMatrix = exports.EnsembleOrchestrator = exports.createA3MRouter = exports.A3MRouter = void 0;
const index_1 = require("./index");
Object.defineProperty(exports, "createA3MRouter", { enumerable: true, get: function () { return index_1.createA3MRouter; } });
const shapleyValue_1 = require("./ensemble/shapleyValue");
const multiRoundDialog_1 = require("./ensemble/multiRoundDialog");
// Re-export A3MRouter as the factory for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.A3MRouter = index_1.createA3MRouter;
class EnsembleOrchestrator {
    router;
    loyaltyMatrix = new shapleyValue_1.LoyaltyMatrix();
    handicapCalc = new shapleyValue_1.HandicapCalculator();
    constructor(router) {
        this.router = router;
    }
    /**
     * Execute ensemble with enhanced Shapley value credit assignment
     * Incorporates ethnocentrism (loyalty) and handicap (costly signaling)
     */
    async executeEnsemble(query, providers, strategy = 'majority', weights = {}, dialogId) {
        // 1. Parallel Execution
        const results = await Promise.all(providers.map(async (p) => {
            try {
                const res = await this.router.chat(query, { model: p });
                return { provider: p, answer: res.choices[0].message.content, success: true };
            }
            catch (e) {
                return { provider: p, answer: '', success: false };
            }
        }));
        const successful = results.filter(r => r.success);
        if (successful.length === 0) {
            throw new Error('All ensemble providers failed.');
        }
        // 2. Voting Logic
        let winnerAnswer = '';
        let winnerProvider = '';
        let confidence = 0;
        let shapleySummary;
        // Multi-round: add user turn
        if (dialogId)
            multiRoundDialog_1.dialogOptimizer.addTurn(dialogId, 'user', query);
        if (strategy === 'majority') {
            const counts = {};
            successful.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            winnerAnswer = sorted[0][0];
            confidence = sorted[0][1] / successful.length;
            winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
        }
        else if (strategy === 'weighted') {
            const weightedCounts = {};
            successful.forEach(r => {
                const w = weights[r.provider] || 1.0;
                weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + w;
            });
            const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
            winnerAnswer = sorted[0][0];
            confidence = sorted[0][1] / successful.length;
            winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
        }
        else if (strategy === 'conservative') {
            const counts = {};
            successful.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
            const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            if (best && best[1] >= 2) {
                winnerAnswer = best[0];
                confidence = best[1] / successful.length;
                winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
            }
            else {
                winnerAnswer = 'UNCERTAIN';
                confidence = 0;
                winnerProvider = 'none';
            }
        }
        else if (strategy === 'shapley') {
            // === ENHANCED SHAPLEY WITH ETHNOCENTRISM + HANDICAP ===
            const providerIds = successful.map(r => r.provider);
            // Accuracy function based on majority vote as ground truth proxy
            const accFn = (0, shapleyValue_1.createAccuracyFn)(winnerAnswer || successful[0].answer, // Will be updated after first pass
            // Will be updated after first pass
            m => successful.find(r => r.provider === m)?.answer || '');
            // Calculate enhanced Shapley with loyalty and handicap
            const contributions = (0, shapleyValue_1.calculateEnhancedShapley)(providerIds, accFn, this.loyaltyMatrix, this.handicapCalc);
            // Get majority vote using Shapley-weighted voting
            const shapleyWeights = (0, shapleyValue_1.applyCredit)(contributions, weights, 0.5);
            const weightedCounts = {};
            successful.forEach(r => {
                weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + shapleyWeights[r.provider];
            });
            const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
            winnerAnswer = sorted[0][0];
            confidence = sorted[0][1];
            winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
            // Update Shapley summary
            shapleySummary = (0, shapleyValue_1.summarize)(contributions);
            // Record performance for handicap tracking
            const isCorrect = (ans) => ans === winnerAnswer;
            successful.forEach(r => {
                const cost = weights[r.provider] || 0.001;
                this.handicapCalc.record(r.provider, cost, isCorrect(r.answer));
            });
        }
        // Record loyalty: successful collaborations build trust
        if (strategy === 'shapley') {
            for (const r of successful) {
                if (r.answer === winnerAnswer) {
                    for (const other of successful) {
                        if (other.provider !== r.provider && other.answer === winnerAnswer) {
                            this.loyaltyMatrix.recordSuccess(r.provider, other.provider, 1.0);
                        }
                    }
                }
            }
        }
        // Multi-round: add assistant turn
        if (dialogId && winnerAnswer !== 'UNCERTAIN') {
            multiRoundDialog_1.dialogOptimizer.addTurn(dialogId, 'assistant', winnerAnswer, winnerProvider);
        }
        // 3. Final Assembly
        const allResults = {};
        successful.forEach(r => {
            allResults[r.provider] = { answer: r.answer, score: r.answer === winnerAnswer ? 1.0 : 0.0 };
        });
        let dialogState;
        if (dialogId)
            dialogState = multiRoundDialog_1.dialogOptimizer.getSummary(dialogId);
        return {
            finalAnswer: winnerAnswer,
            confidence,
            isUncertain: confidence < 0.6 || winnerAnswer === 'UNCERTAIN',
            winner: winnerProvider,
            allResults,
            reasoning: `Ensemble of ${successful.length} models. ${Math.round(confidence * 100)}% agreement.`,
            shapleySummary,
            dialogState,
        };
    }
    /** Get best model for current dialog topic */
    getBestModelForTopic(dialogId, availableModels) {
        return multiRoundDialog_1.dialogOptimizer.getBestModelForTopic(dialogId, availableModels);
    }
    /** Build optimized context for multi-turn conversation */
    buildOptimizedContext(dialogId, newQuery) {
        return multiRoundDialog_1.dialogOptimizer.buildOptimizedContext(dialogId, newQuery);
    }
    /** Clear dialog state */
    clearDialog(dialogId) {
        multiRoundDialog_1.dialogOptimizer.clearState(dialogId);
    }
}
exports.EnsembleOrchestrator = EnsembleOrchestrator;
// Re-export enhanced utilities
var shapleyValue_2 = require("./ensemble/shapleyValue");
Object.defineProperty(exports, "LoyaltyMatrix", { enumerable: true, get: function () { return shapleyValue_2.LoyaltyMatrix; } });
Object.defineProperty(exports, "HandicapCalculator", { enumerable: true, get: function () { return shapleyValue_2.HandicapCalculator; } });
Object.defineProperty(exports, "calculateEnhancedShapley", { enumerable: true, get: function () { return shapleyValue_2.calculateEnhancedShapley; } });
var multiRoundDialog_2 = require("./ensemble/multiRoundDialog");
Object.defineProperty(exports, "dialogOptimizer", { enumerable: true, get: function () { return multiRoundDialog_2.dialogOptimizer; } });
Object.defineProperty(exports, "MultiRoundDialogOptimizer", { enumerable: true, get: function () { return multiRoundDialog_2.MultiRoundDialogOptimizer; } });
//# sourceMappingURL=ensemble.js.map