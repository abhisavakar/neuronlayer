import { spawn } from 'child_process';

const p = spawn('node', ['dist/index.js', '--project', '.'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

p.stdout.on('data', d => {
  console.log('STDOUT RECEIVE:', d.toString());
});

const initMsg = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  }
};

console.log('SENDING:', JSON.stringify(initMsg));
p.stdin.write(JSON.stringify(initMsg) + '\n');

setTimeout(() => {
  console.log('Timeout. Killing process.');
  p.kill();
}, 5000);
