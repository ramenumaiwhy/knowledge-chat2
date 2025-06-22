// webhook-serverの出力を確認するためのスクリプト
const { spawn } = require('child_process');

console.log('🚀 webhook-serverを起動してログを確認します...\n');

const server = spawn('node', ['webhook-server.js'], {
  env: { ...process.env, NODE_ENV: 'development' }
});

server.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  console.error(`[ERROR] ${data.toString().trim()}`);
});

// 3秒後にテストクエリを送信
setTimeout(async () => {
  console.log('\n📨 テストクエリを送信中...');
  
  const axios = require('axios');
  try {
    await axios.post('http://localhost:3000/webhook', {
      events: [{
        type: 'message',
        message: { type: 'text', text: 'ナンパのコツを教えて' },
        replyToken: 'test-token'
      }]
    });
  } catch (error) {
    console.error('テストクエリエラー:', error.message);
  }
  
  // 10秒後にサーバーを終了
  setTimeout(() => {
    console.log('\n🛑 サーバーを終了します...');
    server.kill();
    process.exit(0);
  }, 10000);
}, 3000);