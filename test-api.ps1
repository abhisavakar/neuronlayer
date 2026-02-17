$env:OPENAI_BASE_URL = "https://swedencentral.api.cognitive.microsoft.com/openai/v1"
$env:OPENAI_API_KEY = "91hH1JEzd1G83v4vgKHDjsAEsOsSl0fxmE7eDv7vqNS7Lvdc2vo3JQQJ99CBACfhMk5XJ3w3AAAAACOG6DCi"

Write-Host "Testing memcode with Kimi-K2.5 on Azure..."
Write-Host ""

# Test the agent with a simple prompt using echo and piping
# The /exit command will exit after the response
"what is this project about?", "/exit" | node dist/agent.js --model Kimi-K2.5 --provider openai
