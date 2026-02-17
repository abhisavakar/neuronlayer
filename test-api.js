// Quick API test for Azure OpenAI endpoint

const baseURL = process.env.OPENAI_BASE_URL || 'https://swedencentral.api.cognitive.microsoft.com/openai/v1';
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Set OPENAI_API_KEY environment variable');
  process.exit(1);
}

const model = process.argv[2] || 'Kimi-K2.5';

console.log(`Testing Azure OpenAI endpoint...`);
console.log(`Base URL: ${baseURL}`);
console.log(`Model: ${model}`);
console.log('');

async function test() {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'What is 2+2? Answer in one word.' }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error ${response.status}: ${error}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
