/**
 * Railway アプリケーションURL検索スクリプト
 * 複数のURL形式を試してn8nインスタンスを見つける
 */

class RailwayURLFinder {
  constructor() {
    this.possibleUrls = [
      'https://knowledge-chat2-production.railway.app',
      'https://knowledge-chat2.railway.app',
      'https://n8n-knowledge-chat2.railway.app',
      'https://chiba-chatbot.railway.app',
      'https://knowledge-chat2-production.up.railway.app',
      'https://web-production-1234.up.railway.app', // 典型的なRailway URL
      'https://web-production-5678.up.railway.app'
    ];
  }

  // 単一URLテスト
  async testUrl(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000
      });

      const contentType = response.headers.get('content-type') || '';
      const isHTML = contentType.includes('text/html');
      const isJSON = contentType.includes('application/json');
      
      // n8nらしい応答を検出
      if (response.ok && isHTML) {
        const text = await response.text();
        if (text.includes('n8n') || text.includes('workflow') || text.includes('automation')) {
          return {
            url,
            status: response.status,
            type: 'n8n',
            working: true
          };
        }
      }

      return {
        url,
        status: response.status,
        type: isJSON ? 'api' : isHTML ? 'web' : 'unknown',
        working: response.ok
      };

    } catch (error) {
      return {
        url,
        status: 0,
        type: 'error',
        working: false,
        error: error.message
      };
    }
  }

  // 全URLを並行テスト
  async findWorkingUrl() {
    console.log('🔍 Railway n8nアプリケーションURL検索中...\n');

    const results = await Promise.all(
      this.possibleUrls.map(url => this.testUrl(url))
    );

    console.log('📊 検索結果:');
    console.log('='.repeat(60));

    let workingUrls = [];

    results.forEach(result => {
      const status = result.working ? '✅' : '❌';
      const statusCode = result.status || 'ERR';
      
      console.log(`${status} ${result.url}`);
      console.log(`    Status: ${statusCode} | Type: ${result.type}`);
      
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      
      if (result.working) {
        workingUrls.push(result);
      }
      
      console.log('');
    });

    console.log('='.repeat(60));
    
    if (workingUrls.length > 0) {
      console.log(`\n✅ 動作中のURL: ${workingUrls.length}件見つかりました`);
      
      const n8nUrls = workingUrls.filter(r => r.type === 'n8n');
      if (n8nUrls.length > 0) {
        console.log(`\n🎯 n8nアプリケーション発見:`);
        n8nUrls.forEach(r => console.log(`  ${r.url}`));
        return n8nUrls[0].url;
      } else {
        console.log(`\n📝 候補URL:`);
        workingUrls.forEach(r => console.log(`  ${r.url} (${r.type})`));
        return workingUrls[0].url;
      }
    } else {
      console.log('\n❌ 動作中のURLが見つかりませんでした');
      return null;
    }
  }

  // Railway API経由で実際のURL取得（将来の実装用）
  async getRailwayApiUrls() {
    console.log('\n🔧 Railway API経由でのURL取得方法:');
    console.log('1. Railway CLI: railway status');
    console.log('2. Railway Dashboard → Project → Deployments');
    console.log('3. 環境変数 RAILWAY_STATIC_URL の確認');
  }

  // ローカルでの代替手段
  suggestAlternatives() {
    console.log('\n🔧 代替手段:');
    console.log('1. Railway Dashboard (https://railway.app) でプロジェクト確認');
    console.log('2. Deployments タブで実際のURLを取得');  
    console.log('3. n8nの管理画面URLをコピー');
    console.log('4. 環境変数として .env に追加');
  }

  // 実行
  async run() {
    const workingUrl = await this.findWorkingUrl();
    
    if (workingUrl) {
      console.log(`\n🎉 推奨URL: ${workingUrl}`);
      
      // Basic認証テスト
      console.log('\n🔐 Basic認証テスト実行中...');
      await this.testBasicAuth(workingUrl);
      
    } else {
      this.getRailwayApiUrls();
      this.suggestAlternatives();
    }
  }

  // Basic認証テスト
  async testBasicAuth(url) {
    const testCredentials = [
      'admin:password',
      'admin:admin',
      'n8n:n8n'
    ];

    for (const cred of testCredentials) {
      try {
        const auth = Buffer.from(cred).toString('base64');
        const response = await fetch(url, {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });

        if (response.ok) {
          console.log(`✅ Basic認証成功: ${cred}`);
          return cred;
        }
      } catch (error) {
        // 認証失敗は正常
      }
    }

    console.log('❌ Basic認証情報が必要です');
    console.log('Railway Dashboard → Variables で N8N_BASIC_AUTH_PASSWORD を確認してください');
  }
}

// 実行
async function main() {
  const finder = new RailwayURLFinder();
  await finder.run();
}

if (require.main === module) {
  main();
}

module.exports = RailwayURLFinder;