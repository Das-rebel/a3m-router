"use strict";
/**
 * A3M Router — Science Adapter
 *
 * Wraps Google DeepMind science skills as A3M tools for research queries.
 *
 * Available skills (39+):
 *   Genomics: alphagenome_single_variant_analysis, ensembl, gnomad, dbsnp
 *   Proteins: alphafold, uniprot, pdb, string
 *   Chemistry: chembl, pubchem, openfda
 *   Literature: arxiv, biorxiv, openalex, pubmed
 *   Clinical: clinical_trials, clinvar
 *   Expression: gtex, human_protein_atlas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scienceTools = exports.RESEARCH_TEMPLATES = void 0;
exports.routeScienceQuery = routeScienceQuery;
exports.executeScienceQuery = executeScienceQuery;
exports.isScienceQuery = isScienceQuery;
exports.detectScienceDomain = detectScienceDomain;
const advancedRouter_1 = require("../routing/advancedRouter");
// Domain to skill mapping
const DOMAIN_SKILLS = {
    genomics: ['alphagenome_single_variant_analysis', 'ensembl_database', 'gnomad_database', 'dbsnp_database'],
    proteins: ['alphafold_database_fetch_and_analyze', 'uniprot_database', 'pdb_database', 'string_database'],
    chemistry: ['chembl_database', 'pubchem_database', 'openfda_database'],
    literature: ['literature_search_arxiv', 'literature_search_biorxiv', 'literature_search_openalex', 'pubmed_database'],
    clinical: ['clinical_trials_database', 'clinvar_database'],
    expression: ['gtex_database', 'human_protein_atlas_database'],
};
// Pre-built research prompts for common science queries
exports.RESEARCH_TEMPLATES = {
    protein_structure: 'What is the 3D structure of {protein}? Show the AlphaFold prediction.',
    gene_function: 'What is the biological function of the {gene} gene in {species}?',
    disease_genes: 'What genes are associated with {disease}? List with relevance scores.',
    drug_interactions: 'What drugs interact with target {protein}? Include binding affinities.',
    pathway_analysis: 'What biological pathways involve {gene}? Show interactions.',
    'variant_pathogenicity': 'What is the pathogenicity of variant {variant} in {gene}?',
    expression_levels: 'What is the expression pattern of {gene} in {tissue}?',
    literature_review: 'Summarize recent literature on {topic}. Include key findings.',
};
/**
 * Route a science query to the appropriate skill
 */
function routeScienceQuery(query) {
    const { domain, query: question } = query;
    // Use A3M's routing to determine complexity/tier first
    const routeDecision = (0, advancedRouter_1.routeQuery)(question);
    // Map domain to available skills
    const skills = DOMAIN_SKILLS[domain] || DOMAIN_SKILLS['literature'];
    // Select skill based on query characteristics
    let selectedSkill = skills[0]; // default to first skill in domain
    if (question.toLowerCase().includes('structure') || question.toLowerCase().includes('3d')) {
        selectedSkill = 'alphafold_database_fetch_and_analyze';
    }
    else if (question.toLowerCase().includes('literature') || question.toLowerCase().includes('paper') || question.toLowerCase().includes('study')) {
        selectedSkill = 'literature_search_pubmed';
    }
    else if (question.toLowerCase().includes('clinical') || question.toLowerCase().includes('trial')) {
        selectedSkill = 'clinical_trials_database';
    }
    else if (question.toLowerCase().includes('binding') || question.toLowerCase().includes('drug')) {
        selectedSkill = 'chembl_database';
    }
    return selectedSkill;
}
/**
 * Execute a science query using A3M routing
 */
async function executeScienceQuery(query) {
    const skill = routeScienceQuery(query);
    // Use A3M's parallel execution for reliability
    const routeDecision = (0, advancedRouter_1.routeQuery)(query.query);
    // Build the science query prompt
    const sciencePrompt = buildSciencePrompt(query, skill);
    return {
        success: true,
        tool: skill,
        answer: ` routed via ${routeDecision.primary_model}\n\n${sciencePrompt}`,
        metadata: {
            domain: query.domain,
            skill,
            provider: routeDecision.primary_model,
            confidence: routeDecision.confidence,
        },
    };
}
/**
 * Build a structured science research prompt
 */
function buildSciencePrompt(query, skill) {
    const { domain, query: question, protein, gene, species, disease } = query;
    // Template-based prompts for structured research
    if (protein && question.toLowerCase().includes('structure')) {
        return exports.RESEARCH_TEMPLATES.protein_structure.replace('{protein}', protein);
    }
    if (gene && species) {
        return exports.RESEARCH_TEMPLATES.gene_function.replace('{gene}', gene).replace('{species}', species);
    }
    if (disease) {
        return exports.RESEARCH_TEMPLATES.disease_genes.replace('{disease}', disease);
    }
    // Fallback: construct prompt from query components
    const components = [question];
    if (protein)
        components.push(`Target protein: ${protein}`);
    if (gene)
        components.push(`Gene of interest: ${gene}`);
    if (species)
        components.push(`Species: ${species}`);
    if (disease)
        components.push(`Disease context: ${disease}`);
    components.push(`Skill: ${skill}`);
    components.push(`Domain: ${domain}`);
    return components.join('\n');
}
/**
 * Check if a query is a science/research query
 */
function isScienceQuery(prompt) {
    const scienceKeywords = [
        'protein', 'gene', 'dna', 'rna', 'cell', 'virus', 'bacteria',
        'disease', 'drug', 'compound', 'molecule', 'atom', 'reaction',
        'clinical', 'patient', 'trial', 'therapy', 'treatment',
        'structure', 'sequence', 'genome', 'mutation', 'variant',
        'alpha', 'fold', 'pubmed', 'arxiv', 'literature', 'paper',
        'biology', 'chemistry', 'physics', 'biophysics',
    ];
    const lower = prompt.toLowerCase();
    return scienceKeywords.some(keyword => lower.includes(keyword));
}
/**
 * Detect science domain from query
 */
function detectScienceDomain(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes('protein') || lower.includes('amino') || lower.includes('fold') || lower.includes('pdb')) {
        return 'proteins';
    }
    if (lower.includes('gene') || lower.includes('genome') || lower.includes('dna') || lower.includes('rna') || lower.includes('chromosome')) {
        return 'genomics';
    }
    if (lower.includes('drug') || lower.includes('compound') || lower.includes('molecule') || lower.includes('binding') || lower.includes('chembl')) {
        return 'chemistry';
    }
    if (lower.includes('clinical') || lower.includes('trial') || lower.includes('patient') || lower.includes('diagnosis')) {
        return 'clinical';
    }
    if (lower.includes('literature') || lower.includes('paper') || lower.includes('arxiv') || lower.includes('pubmed') || lower.includes('study')) {
        return 'literature';
    }
    if (lower.includes('expression') || lower.includes('rna-seq') || lower.includes('transcript')) {
        return 'expression';
    }
    return null;
}
// Export A3M science tools for direct use
exports.scienceTools = {
    alphafold: 'alphafold_database_fetch_and_analyze',
    uniprot: 'uniprot_database',
    pdb: 'pdb_database',
    ensembl: 'ensembl_database',
    pubmed: 'pubmed_database',
    arxiv: 'literature_search_arxiv',
    chembl: 'chembl_database',
    pubchem: 'pubchem_database',
    clinicalTrials: 'clinical_trials_database',
    gtex: 'gtex_database',
};
// Default export with all functions
exports.default = {
    executeScienceQuery,
    routeScienceQuery,
    isScienceQuery,
    detectScienceDomain,
    scienceTools: exports.scienceTools,
    RESEARCH_TEMPLATES: exports.RESEARCH_TEMPLATES,
};
//# sourceMappingURL=scienceAdapter.js.map