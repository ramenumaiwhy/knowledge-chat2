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
        
        // GitHubからCSVを取得（公開URLを使用）
        const csvUrl = 'https://raw.githubusercontent.com/aiharataketo/knowledge-chat2/main/data/knowledge.csv';
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
          const summary = row[3] || '';
          const keywords = row[6] || '';
          
          const searchText = userMessage.toLowerCase();
          if (keywords.toLowerCase().includes(searchText) || 
              title.toLowerCase().includes(searchText) ||
              summary.toLowerCase().includes(searchText)) {
            searchResults.push({
              title: title,
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
                    text: `あなたは恋愛アドバイザーです。以下の情報を基に、ユーザーの質問に答えてください。

ユーザーの質問: ${userMessage}

関連情報:
${searchResults.slice(0, 3).map(r => `【${r.title}】\n${r.summary}\n対象: ${r.target_group} / ${r.occupation}`).join('\n\n')}

回答は簡潔で分かりやすく、敬語で答えてください。`
                  }]
                }]
              }
            );
            
            replyText = geminiResponse.data.candidates[0].content.parts[0].text;
          } catch (geminiError) {
            console.error('Gemini API error:', geminiError.response?.data || geminiError.message);
            replyText = `関連情報が見つかりました：\n\n${searchResults.slice(0, 2).map(r => `【${r.title}】\n${r.summary}`).join('\n\n')}`;
          }
        } else {
          replyText = '申し訳ございません、その情報は見つかりませんでした。他にご質問がございましたらお聞かせください。';
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