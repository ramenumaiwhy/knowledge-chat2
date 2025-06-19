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
        const csvResponse = await axios.get(csvUrl);
        const csvContent = csvResponse.data;
        
        // CSVをパース
        const rows = csvContent.split('\n').map(row => {
          const matches = row.match(/(?:^|,)("(?:[^"]+|"")*"|[^,]*)/g);
          return matches ? matches.map(match => match.replace(/^,/, '').replace(/^"|"$/g, '')) : [];
        });
        
        const headers = rows[0];
        const data = rows.slice(1).filter(row => row.length > 0);
        
        // キーワード検索
        const searchResults = [];
        for (const row of data) {
          const title = row[1] || '';
          const content = row[2] || '';
          const summary = row[3] || '';
          const keywords = row[6] || '';
          
          const searchText = userMessage.toLowerCase();
          if (keywords.toLowerCase().includes(searchText) || 
              title.toLowerCase().includes(searchText) ||
              summary.toLowerCase().includes(searchText) ||
              content.toLowerCase().includes(searchText)) {
            searchResults.push({
              title: title,
              content: content,
              summary: summary,
              category: row[4],
              target_group: row[8],
              occupation: row[9]
            });
          }
        }
        
        console.log('Search results:', searchResults.length);
        
        let replyText = '';
        
        if (searchResults.length > 0) {
          // Gemini APIで回答生成
          try {
            const geminiResponse = await axios.post(
              'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDMflKhgtla1RPwrcIy9Yev6FRpQTSqUsA',
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

ユーザーの質問: ${userMessage}

関連データ:
${searchResults.slice(0, 2).map(r => `タイトル: ${r.title}\n内容: ${r.content}\n要約: ${r.summary}`).join('\n\n---\n\n')}

上記のデータのみを使って、チバとして回答してください。`
                  }]
                }]
              }
            );
            
            replyText = geminiResponse.data.candidates[0].content.parts[0].text;
          } catch (geminiError) {
            console.error('Gemini API error:', geminiError.response?.data || geminiError.message);
            replyText = 'チバです。\n\n申し訳ございません。\n\n現在システムに問題が発生しています。\n\n\nしばらく時間を置いて再度お試しください。';
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Webhook URL: /webhook');
});