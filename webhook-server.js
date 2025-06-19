const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot設定（直接埋め込み）
const config = {
  channelAccessToken: 'ZYXENzJhD225b6FE6ufYq8hA6H7EFvR77sovwRd4kzsJLmGiv9gaNOFodY+8ddsapgFlJTFf2yzzY3FYGuvXfwRVEE4f+Nl30aSpt2bIesSnkjMFva7TWbLBtVB3Os3t+sukMR4MJZeaqfqYGt6AGQdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'ed364273343f02c13ce41050cb93470a'
};

const client = new Client(config);

// ヘルスチェック（最初に定義）
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// LINE署名検証ミドルウェア
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    console.log('Webhook received');
    const events = req.body.events;
    
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        
        console.log('User message:', userMessage);
        
        // GitHubからCSVを取得（正しいURLを使用）
        const csvUrl = 'https://raw.githubusercontent.com/ramenumaiwhy/knowledge-chat2/main/data/knowledge.csv';
        console.log('Fetching CSV from:', csvUrl);
        
        const csvResponse = await axios.get(csvUrl);
        const csvContent = csvResponse.data;
        console.log('CSV content length:', csvContent.length);
        
        // CSVをパース（より堅牢なパーサー）
        const lines = csvContent.split('\n');
        console.log('Total lines:', lines.length);
        
        const headers = lines[0].split(',');
        console.log('Headers:', headers);
        
        // 質問分析
        const queryAnalysis = analyzeQuery(userMessage);
        console.log('Query analysis:', queryAnalysis);
        
        // 改善された検索
        const searchResults = [];
        const searchText = userMessage.toLowerCase();
        console.log('Searching for:', searchText);
        
        // ヘッダー行をスキップして、各行を処理
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i] || lines[i].trim() === '') continue;
          
          try {
            // CSVの行をパース（引用符を考慮）
            const row = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
              const char = lines[i][j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            row.push(current.trim());
            
            // 各列のデータを取得
            const id = row[0] || '';
            const title = row[1] || '';
            const content = row[2] || '';
            const summary = row[3] || '';
            const category = row[4] || '';
            const keywords = row[6] || '';
            
            // スコアベースの検索
            const score = calculateRelevanceScore(
              userMessage,
              queryAnalysis,
              { title, content, summary, keywords, category }
            );
            
            if (score > 0) {
              searchResults.push({
                id: id,
                title: title,
                content: content.substring(0, 1500), // コンテキスト増加
                summary: summary,
                category: category,
                keywords: keywords,
                score: score
              });
              
              console.log(`Found match in row ${i}: ${title} (score: ${score})`);
            }
          } catch (parseError) {
            console.error(`Error parsing row ${i}:`, parseError.message);
          }
        }
        
        // スコアでソート
        searchResults.sort((a, b) => b.score - a.score);
        console.log('Total search results:', searchResults.length);
        
        let replyText = '';
        
        if (searchResults.length > 0) {
          // Gemini APIで回答生成（モデル名を更新）
          try {
            const selectedResults = searchResults.slice(0, 3); // 最大3件に増加
            console.log('Sending to Gemini:', selectedResults.length, 'results');
            
            // Gemini 1.5 Flashモデルを使用
            const geminiResponse = await axios.post(
              'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDMflKhgtla1RPwrcIy9Yev6FRpQTSqUsA',
              {
                contents: [{
                  parts: [{
                    text: `あなたはナンパ師「チバ」として、以下の制約に従って回答してください：

制約：
1. 提供されたデータの内容のみを使用して回答する。データにない内容を絶対に推測では答えないこと。
2. 丁寧な口調を維持する
3. データの例え表現をそのまま活用する
4. 行動に対する質問の場合は、まずその行動を評価する
5. 褒めるべき点がある場合は、冒頭で褒める。相手に寄り添った回答を心がける。
6. 以下の要素を順番に含めて回答する：
   - 行動への評価や褒める部分（該当する場合）
   - 質問への直接的な回答
   - 具体的なアドバイスや例示
7. 見出しや[]や！などの記号は使用しない
8. 文頭は「チバです。」
9. 句読点があるごとに改行する。
10. 文を空行2行で区切る。
11. データに基づいて回答する一方で、データを参照して回答していることをユーザーには伝わらない様に回答する。

質問タイプ: ${queryAnalysis.type}
ユーザーの質問: ${userMessage}

関連データ（関連度順）:
${selectedResults.map((r, idx) => `
【データ${idx + 1}】関連度: ${r.score}/100
タイトル: ${r.title}
要約: ${r.summary}
内容: ${r.content}`).join('\n\n')}

上記のデータを使って、ユーザーの質問に対して会話として自然に答えてください。質問の意図を理解し、最も関連性の高いデータを中心に回答を構成してください。`
                  }]
                }]
              }
            );
            
            replyText = geminiResponse.data.candidates[0].content.parts[0].text;
            console.log('Gemini response received');
          } catch (geminiError) {
            console.error('Gemini API error:', geminiError.response?.data || geminiError.message);
            
            // Gemini APIが失敗した場合、検索結果を直接返す
            if (searchResults.length > 0) {
              const result = searchResults[0];
              replyText = `チバです。

その質問について、
私の経験からお話しします。


${result.summary}


詳しくは、
「${result.title}」という記事で触れています。


他にご質問があれば、
お聞かせください。`;
            } else {
              replyText = 'チバです。\n\nその質問について、\n私の経験の中では該当する情報がありません。\n\n\n別の質問があれば、\nぜひお聞かせください。';
            }
          }
        } else {
          replyText = 'チバです。\n\nその質問について、\n私の経験の中では該当する情報がありません。\n\n\n別の質問があれば、\nぜひお聞かせください。';
        }
        
        console.log('Replying...');
        
        // LINEに返信
        await client.replyMessage(replyToken, {
          type: 'text',
          text: replyText
        });
        
        console.log('Reply sent');
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    // LINEは200を返さないと再送してくるので、エラーでも200を返す
    res.status(200).send('OK');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// 質問分析関数
function analyzeQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // 質問タイプの判定
  let type = 'general';
  if (query.includes('？') || query.includes('?') || 
      query.match(/どう|なぜ|いつ|どこ|誰|何/)) {
    type = 'question';
  } else if (query.match(/相談|悩み|困って|助けて/)) {
    type = 'consultation';
  } else if (query.length < 10) {
    type = 'keyword';
  }
  
  // キーワード抽出（簡易版）
  const keywords = query
    .split(/[、。！？\s]+/)
    .filter(word => word.length > 1);
  
  return {
    type: type,
    keywords: keywords,
    originalQuery: query
  };
}

// 関連性スコア計算関数
function calculateRelevanceScore(query, queryAnalysis, data) {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  
  // 各フィールドの重み
  const weights = {
    title: 30,
    keywords: 25,
    summary: 20,
    content: 15,
    category: 10
  };
  
  // 完全一致ボーナス
  const exactMatchBonus = 20;
  
  // 各フィールドでの検索
  for (const [field, weight] of Object.entries(weights)) {
    const fieldValue = (data[field] || '').toLowerCase();
    
    // 完全一致
    if (fieldValue.includes(lowerQuery)) {
      score += weight + exactMatchBonus;
    }
    
    // キーワードマッチ
    for (const keyword of queryAnalysis.keywords) {
      if (fieldValue.includes(keyword.toLowerCase())) {
        score += weight * 0.7;
      }
    }
  }
  
  // 正規化（0-100）
  return Math.min(100, Math.round(score));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Webhook URL: /webhook');
});