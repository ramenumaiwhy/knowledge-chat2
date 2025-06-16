/**
 * 単純URL確認スクリプト
 * Railway n8nアプリケーションの検索
 */

async function checkUrls() {
  console.log('🔧 Railway n8nアプリケーション検索中...\n');
  
  const urls = [
    'https://knowledge-chat2-production.railway.app',
    'https://knowledge-chat2.railway.app',
    'https://n8n-knowledge-chat2.railway.app'
  ];
  
  for (const url of urls) {
    try {
      console.log(`🔍 Testing: ${url}`);
      
      // 通常アクセス
      let response = await fetch(url);
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      let text = await response.text();
      
      // Basic認証が必要な場合
      if (response.status === 401) {
        console.log(`  🔐 Basic認証でリトライ...`);
        
        response = await fetch(url, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
          }
        });
        
        console.log(`  Auth Status: ${response.status}`);
        
        if (response.ok) {
          text = await response.text();
        }
      }
      
      // n8n検出
      const isN8n = text.includes('n8n') || 
                   text.includes('workflow') || 
                   text.includes('automation') ||
                   text.includes('node-red') ||
                   text.includes('data-test-id');
      
      const hasLogin = text.includes('login') || text.includes('signin');
      const isHTML = response.headers.get('content-type')?.includes('text/html');
      
      console.log(`  n8n Content: ${isN8n ? '✅ YES' : '❌ NO'}`);
      console.log(`  HTML Page: ${isHTML ? 'YES' : 'NO'}`);
      console.log(`  Login Form: ${hasLogin ? 'YES' : 'NO'}`);
      
      if (isN8n) {
        console.log(`\n🎉 n8n Found: ${url}`);
        console.log(`📋 管理画面アクセス手順:`);
        console.log(`1. ブラウザで ${url} にアクセス`);
        console.log(`2. Basic認証: admin / password`);
        console.log(`3. n8n管理画面でワークフロー確認\n`);
        return url;
      }
      
      // コンテンツサンプル表示
      if (text.length > 0) {
        console.log(`  Content Sample: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('❌ n8nアプリケーションが見つかりませんでした\n');
  console.log('📋 手動確認が必要です:');
  console.log('1. https://railway.app/dashboard にアクセス');
  console.log('2. knowledge-chat2 プロジェクトを選択');
  console.log('3. Deployments タブで実際のURLを確認');
  console.log('4. Settings → Environment でポート設定確認');
  console.log('5. Logs でアプリケーション起動状況確認');
  
  return null;
}

// 特定URLの詳細チェック
async function detailedCheck(url) {
  console.log(`\n🔍 詳細チェック: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`);
    
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    if (response.ok) {
      const text = await response.text();
      console.log(`\nContent Length: ${text.length} characters`);
      console.log(`Content Preview:\n${text.substring(0, 500)}...`);
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Railway APIでプロジェクト情報取得の提案
function suggestRailwayAPICheck() {
  console.log('\n🚂 Railway API経由でのプロジェクト確認方法:');
  console.log('');
  console.log('# Railway CLI (もしインストール済みの場合)');
  console.log('railway login');
  console.log('railway status');
  console.log('railway logs');
  console.log('');
  console.log('# または、Webブラウザで直接確認:');
  console.log('https://railway.app/project/[PROJECT_ID]');
}

// メイン実行
async function main() {
  const foundUrl = await checkUrls();
  
  if (!foundUrl) {
    // 最も有望なURLで詳細チェック
    await detailedCheck('https://knowledge-chat2-production.railway.app');
    suggestRailwayAPICheck();
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkUrls, detailedCheck };