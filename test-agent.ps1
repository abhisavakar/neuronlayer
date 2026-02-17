$env:ANTHROPIC_FOUNDRY_BASE_URL = "https://swedencentral.api.cognitive.microsoft.com/anthropic"
$env:ANTHROPIC_FOUNDRY_API_KEY = "91hH1JEzd1G83v4vgKHDjsAEsOsSl0fxmE7eDv7vqNS7Lvdc2vo3JQQJ99CBACfhMk5XJ3w3AAAAACOG6DCi"

Write-Host "Testing memcode with Azure Anthropic Foundry..."
Write-Host "Model: claude-3-5-haiku-20241022"
Write-Host ""

# Simple API test - just echo a question and answer
$testPrompt = "what is 2+2? Answer in one word."

Write-Host "Sending test prompt: $testPrompt"
Write-Host ""

# Use echo to pipe the prompt - the agent will process and respond
echo "$testPrompt`n/exit" | node dist/agent.js --model claude-3-5-haiku-20241022
