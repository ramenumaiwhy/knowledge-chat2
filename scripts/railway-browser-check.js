/**
 * Railway ブラウザ自動化チェック
 * Puppeteerでn8n管理画面を確認
 */

const puppeteer = require('puppeteer');

class RailwayBrowserCheck {
  constructor() {
    this.baseUrls = [
      'https://knowledge-chat2-production.railway.app',
      'https://knowledge-chat2.railway.app',
      'https://railway.app' // Railway Dashboard
    ];
  }

  // ブラウザでURLにアクセス
  async checkWithBrowser(url) {
    let browser;
    
    try {
      console.log(`🌐 ブラウザで ${url} にアクセス中...`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // User-Agentを設定
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // ページアクセス
      const response = await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
      
      // ページタイトルとコンテンツを取得
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      
      console.log(`📄 Title: ${title}`);
      console.log(`📝 Content Preview: ${bodyText.substring(0, 200)}...`);
      
      // n8n特有の要素を検索
      const n8nElements = await page.evaluate(() => {
        const elements = [];
        if (document.querySelector('[data-test-id]')) elements.push('n8n-test-attributes');
        if (document.querySelector('.n8n-')) elements.push('n8n-css-classes');
        if (document.body.innerText.includes('workflow')) elements.push('workflow-text');
        if (document.body.innerText.includes('n8n')) elements.push('n8n-text');
        return elements;
      });
      
      console.log(`🔍 n8n Elements: ${n8nElements.join(', ') || 'None found'}`);
      
      // Basic認証が必要かチェック
      if (response.status() === 401) {
        console.log('🔐 Basic認証が必要です');
        
        // Basic認証でリトライ
        await page.setExtraHTTPHeaders({
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        });
        
        const authResponse = await page.goto(url, { waitUntil: 'networkidle0' });
        
        if (authResponse.ok()) {
          const authTitle = await page.title();
          console.log(`✅ 認証成功 - Title: ${authTitle}`);
          
          // スクリーンショット取得
          await page.screenshot({ path: 'railway-screenshot.png' });
          console.log('📸 スクリーンショットを保存: railway-screenshot.png');
        }
      }
      
      return {
        url,
        status: response.status(),
        title,
        isN8n: n8nElements.length > 0,
        elements: n8nElements
      };
      
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
      return {
        url,
        status: 0,
        error: error.message
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Railway Dashboardアクセス
  async checkRailwayDashboard() {
    console.log('\n🚂 Railway Dashboard確認中...');
    
    let browser;
    
    try {
      browser = await puppeteer.launch({ headless: false }); // ヘッドレスモードオフ
      const page = await browser.newPage();
      
      await page.goto('https://railway.app/dashboard', { waitUntil: 'networkidle0' });
      
      console.log('📋 Railway Dashboardが開きました');
      console.log('👆 手動でプロジェクトを確認し、n8nのURLを探してください');
      console.log('⏱️  10秒後に自動でブラウザを閉じます...');
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error('❌ Dashboard Error:', error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // 実行
  async run() {
    console.log('🔍 Railway n8nアプリケーション ブラウザチェック開始\n');
    
    for (const url of this.baseUrls.slice(0, 2)) { // Railway URLのみ
      const result = await this.checkWithBrowser(url);
      
      if (result.isN8n) {
        console.log(`\n🎉 n8nアプリケーション発見: ${url}`);
        return url;
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    console.log('❌ n8nアプリケーションが見つかりませんでした');
    console.log('\n💡 Railway Dashboardで手動確認を行います...');
    
    await this.checkRailwayDashboard();
  }
}

// Puppeteerなしの代替実装
class SimpleBrowserCheck {
  async checkUrls() {
    console.log('🔧 Puppeteerが利用できません。代替チェックを実行...\n');
    
    const urls = [
      'https://knowledge-chat2-production.railway.app',
      'https://knowledge-chat2.railway.app'
    ];
    
    for (const url of urls) {
      try {
        console.log(`🔍 Testing: ${url}`);
        
        // Basic認証付きアクセス
        const response = await fetch(url, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
          }
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.ok) {
          const text = await response.text();
          const isN8n = text.includes('n8n') || text.includes('workflow');
          console.log(`n8n Content: ${isN8n ? 'YES' : 'NO'}`);
          
          if (isN8n) {
            console.log(`\n✅ n8n Found: ${url}`);
            return url;
          }
        }
        
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('❌ n8nが見つかりませんでした');
    console.log('\n📋 手動確認手順:');
    console.log('1. https://railway.app/dashboard にアクセス');
    console.log('2. knowledge-chat2 プロジェクトを選択');
    console.log('3. Deployments タブで実際のURLを確認');
    console.log('4. n8n管理画面のURLをコピー');
  }
}

// 実行
async function main() {
  // Puppeteerが利用できない場合の代替手段
  const simpleChecker = new SimpleBrowserCheck();
  await simpleChecker.checkUrls();
}

if (require.main === module) {
  main();
}

module.exports = { RailwayBrowserCheck, SimpleBrowserCheck };