import { createA3M } from './a3m_provider';
import { generateText, streamText } from 'ai';

// Quick route (cheapest provider)
const a3m = createA3M({ strategy: 'cheapest' });

async function main() {
  // Non-streaming
  const result = await generateText({
    model: a3m('auto'),
    prompt: 'Explain quantum computing in one sentence',
  });
  console.log(result.text);

  // Streaming
  const stream = await streamText({
    model: a3m('auto'),
    prompt: 'Write a haiku about AI routing',
  });
  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }
}

main().catch(console.error);
