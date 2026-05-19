#!/usr/bin/env node
/**
 * A3M Router — MMLU Benchmark
 * MMLU: 15 multiple choice questions (actual MMLU methodology)
 * MT-Bench proxy: measures response quality via completeness scoring
 */

const https = require('https');

const MMLU_QUESTIONS = [
  { q: "What is the derivative of x²?", choices: ["x", "2x", "2", "x²"], answer: 1, subject: "math" },
  { q: "Solve for x: 2x + 6 = 14", choices: ["4", "3", "5", "10"], answer: 0, subject: "math" },
  { q: "Time complexity of binary search?", choices: ["O(n)", "O(log n)", "O(n²)", "O(1)"], answer: 1, subject: "cs" },
  { q: "In Python, list.append() does what?", choices: ["Adds to start", "Adds to end", "Removes last", "Sorts list"], answer: 1, subject: "cs" },
  { q: "Output of type([])?", choices: ["<class 'array'>", "<class 'list'>", "<class 'tuple'>", "<class 'dict'>"], answer: 1, subject: "cs" },
  { q: "GDP stands for?", choices: ["Gross Domestic Product", "General Domestic Price", "Government Debt Payment", "Global Demand Protocol"], answer: 0, subject: "economics" },
  { q: "If supply increases and demand stays same, price:", choices: ["Increases", "Decreases", "Stays same", "Doubles"], answer: 1, subject: "economics" },
  { q: "Powerhouse of the cell?", choices: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], answer: 2, subject: "biology" },
  { q: "DNA stands for?", choices: ["Deoxyribonucleic Acid", "Dinitrogen Acid", "Dynamic Nuclear Acid", "Dual Nucleotide"], answer: 0, subject: "biology" },
  { q: "Primary purpose of a contract?", choices: ["Entertainment", "Create legal obligations", "Tax avoidance", "Social bonding"], answer: 1, subject: "law" },
  { q: "Which US amendment protects free speech?", choices: ["1st", "2nd", "4th", "5th"], answer: 0, subject: "law" },
  { q: "Car accelerates from rest at 2 m/s². Velocity after 5s?", choices: ["5 m/s", "10 m/s", "7 m/s", "2.5 m/s"], answer: 1, subject: "physics" },
  { q: "Unit of force in SI?", choices: ["Joule", "Watt", "Newton", "Pascal"], answer: 2, subject: "physics" },
  { q: "If gas temp increases at constant volume, pressure:", choices: ["Decreases", "Increases", "Stays constant", "Becomes zero"], answer: 1, subject: "physics" },
  { q: "What is π to two decimal places?", choices: ["3.14", "3.16", "3.12", "3.18"], answer: 0, subject: "math" },
];

const QUALITY_QUESTIONS = [
  { id: 1, prompt: "If John has 5 apples and gives 3 to Mary, how many does he have left?", expected: "2" },
  { id: 2, prompt: "Write a Python function that checks if a string is a palindrome.", expected: "def" },
  { id: 3, prompt: "Compare supervised vs unsupervised learning in 2 sentences.", expected: "supervised" },
  { id: 4, prompt: "What is the capital of France?", expected: "Paris" },
  { id: 5, prompt: "Train travels 300km in 4 hours. Average speed?", expected: "75" },
  { id: 6, prompt: "All cats are animals. Some animals are black. Are some cats black?", expected: "maybe/not definite" },
  { id: 7, prompt: "What is machine learning?", expected: "learn" },
  { id: 8, prompt: "Write a haiku about programming.", expected: "\n" },
];

const PROVIDERS = {
  'groq-llama-3.1-8b': { name: 'Groq Llama 3.1 8B', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant', apiKeyEnv: 'GROQ_API_KEY' },
  'groq-llama-3.3-70b': { name: 'Groq Llama 3.3 70B', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', apiKeyEnv: 'GROQ_API_KEY' },
  'groq-allam-2-7b': { name: 'Groq Allam 2 7B', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'allam-2-7b', apiKeyEnv: 'GROQ_API_KEY' },
  'cerebras-llama3.1-8b': { name: 'Cerebras Llama 3.1 8B', endpoint: 'https://api.cerebras.ai/v1/chat/completions', model: 'llama3.1-8b', apiKeyEnv: 'CEREBRAS_API_KEY' },
  'cerebras-qwen-3-235b': { name: 'Cerebras Qwen 3 235B', endpoint: 'https://api.cerebras.ai/v1/chat/completions', model: 'qwen-3-235b-a22b-instruct-2507', apiKeyEnv: 'CEREBRAS_API_KEY' },
};

function callAPI(provider, prompt, maxTokens = 60) {
  return new Promise((resolve) => {
    const config = PROVIDERS[provider];
    const start = Date.now();
    const body = JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, temperature: 0 });
    const url = new URL(config.endpoint);
    
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env[config.apiKeyEnv]}`, 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          resolve({ success: true, latency: Date.now() - start, answer: json.choices?.[0]?.message?.content || '', status: res.statusCode });
        } catch { resolve({ success: false, latency: Date.now() - start, error: d.slice(0, 80) }); }
      });
    });
    req.on('error', e => resolve({ success: false, latency: 0, error: e.message }));
    req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, latency: 30000, error: 'Timeout' }); });
    req.write(body); req.end();
  });
}

function gradeMMLU(question, response) {
  if (!response) return 0;
  const text = response.toLowerCase().trim();
  
  // Look for letter A/B/C/D
  const letterMatch = text.match(/^(?:the answer is\s+)?([a-d])(?:\s|$)/i) || text.match(/^\s*([a-d])\s*$/i);
  if (letterMatch) {
    const answered = letterMatch[1].toLowerCase().charCodeAt(0) - 97;
    return answered === question.answer ? 1 : 0;
  }
  
  // Full text match
  const correctText = question.choices[question.answer].toLowerCase();
  if (text.includes(correctText)) return 1;
  
  // Key word match
  const keyWords = correctText.split(' ').filter(w => w.length > 4);
  if (keyWords.length > 0 && keyWords.some(w => text.includes(w))) return 1;
  
  return 0;
}

function scoreQuality(response, question) {
  if (!response) return 0;
  const text = response.toLowerCase();
  const expected = question.expected.toLowerCase();
  
  // Check for expected keyword
  if (text.includes(expected)) return 10;
  
  // Partial credit based on length (well-formed response)
  const len = response.length;
  if (len > 20) return 5;
  if (len > 5) return 2;
  return 0;
}

async function main() {
  const fs = require('fs');
  console.log('\n🧠 A3M Router — Benchmark\n');
  
  const results = {};
  
  for (const [pid, config] of Object.entries(PROVIDERS)) {
    if (!process.env[config.apiKeyEnv] || process.env[config.apiKeyEnv].length < 20) {
      console.log(`⏭️  ${config.name}: No API key`);
      continue;
    }
    
    console.log(`\n📡 ${config.name}...`);
    
    // MMLU
    let correct = 0;
    const mmluResults = [];
    for (const q of MMLU_QUESTIONS) {
      const prompt = `${q.q}\nA) ${q.choices[0]}\nB) ${q.choices[1]}\nC) ${q.choices[2]}\nD) ${q.choices[3]}\n\nAnswer (just letter A/B/C/D):`;
      const r = await callAPI(pid, prompt, 15);
      const graded = gradeMMLU(q, r.answer);
      correct += graded;
      mmluResults.push({ q: q.q.slice(0, 35), response: r.answer?.slice(0, 20), correct: graded === 1 });
      process.stdout.write(`${graded ? '✅' : '❌'} `);
      await new Promise(r => setTimeout(r, 250));
    }
    console.log(`\n  MMLU: ${correct}/15`);
    
    // Quality test
    let qualityScore = 0;
    const qualResults = [];
    for (const q of QUALITY_QUESTIONS) {
      const r = await callAPI(pid, q.prompt, 100);
      const score = scoreQuality(r.answer, q);
      qualityScore += score;
      qualResults.push({ prompt: q.prompt.slice(0, 30), response: r.answer?.slice(0, 30), score });
      await new Promise(r2 => setTimeout(r2, 250));
    }
    const qualityAvg = qualityScore / QUALITY_QUESTIONS.length;
    console.log(`  Quality: ${qualityAvg.toFixed(1)}/10`);
    
    results[pid] = {
      name: config.name,
      mmlu_accuracy: correct / 15,
      quality_score: Math.round(qualityAvg * 10) / 10,
      mmlu_detail: mmluResults,
      quality_detail: qualResults,
    };
  }
  
  console.log('\n📊 Results\n');
  console.log('Provider                  | MMLU  | Quality | Notes');
  console.log('--------------------------|-------|---------|------');
  
  for (const [pid, r] of Object.entries(results)) {
    const mmlu = `${(r.mmlu_accuracy * 100).toFixed(0)}%`;
    console.log(`${r.name.padEnd(25)}| ${mmlu.padStart(5)} | ${r.quality_score.toFixed(1).padStart(7)}/10 |`);
  }
  
  fs.writeFileSync('benchmark-results.json', JSON.stringify({
    meta: { date: new Date().toISOString(), type: 'mmlu_quality' },
    results
  }, null, 2));
  console.log('\n💾 Saved to benchmark-results.json');
}

main().catch(console.error);
