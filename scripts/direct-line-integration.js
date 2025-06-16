/**
 * 直接LINE Bot統合 - Railway n8n代替案
 * Express.js + Supabase Vector Search
 */

const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Bot設定
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(lineConfig);

// Supabase Vector Search
async function searchKnowledge(query) {
  const response = await fetch('https://qkpasrtfnhcbqjofiukz.supabase.co/rest/v1/rpc/hybrid_search_chiba', {
    method: 'POST',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query_text: query,
      query_embedding: null,
      match_threshold: 0.5,
      match_count: 5
    })
  });

  return await response.json();
}

// Gemini Response生成
async function generateResponse(query, knowledge) {
  const prompt = `あなたは恋愛コーチの「チバ」です。以下の知識を基に、チバのメルマガスタイルで800-1200文字の詳細な回答を作成してください。

質問: ${query}

参考知識:
${knowledge.map(item => `タイトル: ${item.title}\n要約: ${item.summary || item.content.substring(0, 200)}`).join('\n---\n')}

回答要件:
- チバの親しみやすい口調で始める
- 個人的な体験談や具体例を含める
- 実践的なアドバイスを段階的に説明
- メルマガのような詳細解説
- 800-1200文字程度
- 最後に励ましのメッセージで締める`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
    })
  });

  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

// LINE Webhook
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        
        // 1. Supabase Vector Search
        const knowledge = await searchKnowledge(userMessage);
        
        // 2. Gemini Response生成
        const response = await generateResponse(userMessage, knowledge);
        
        // 3. LINE返信
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: response
        });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('Chiba LINE Bot - Direct Integration');
});

app.listen(port, () => {
  console.log(`🤖 Chiba LINE Bot running on port ${port}`);
});