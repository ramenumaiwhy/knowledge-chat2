const express = require('express');
const { Client } = require('@line/bot-sdk');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);

// Webhook endpoint
app.post('/webhook', express.json(), async (req, res) => {
  try {
    const events = req.body.events;
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        
        // GitHubからCSVを取得
        const csvResponse = await axios.get(
          'https://api.github.com/repos/aiharataketo/knowledge-chat2/contents/data/knowledge.csv',
          {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        // CSVをパース
        const csvContent = Buffer.from(csvResponse.data.content, 'base64').toString('utf-8');
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
        
        // Gemini APIで回答生成
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{
                text: `あなたは恋愛アドバイザーです。以下の情報を基に、ユーザーの質問に答えてください。

ユーザーの質問: ${userMessage}

関連情報:
${searchResults.map(r => `【${r.title}】\n${r.summary}\n対象: ${r.target_group} / ${r.occupation}`).join('\n\n')}

回答は簡潔で分かりやすく、敬語で答えてください。関連情報にない場合は『申し訳ございません、その情報は見つかりませんでした』と答えてください。`
              }]
            }]
          }
        );
        
        const replyText = geminiResponse.data.candidates[0].content.parts[0].text;
        
        // LINEに返信
        await client.replyMessage(replyToken, {
          type: 'text',
          text: replyText
        });
      }
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ヘルスチェック
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});