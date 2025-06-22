const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
console.log('Supabase client initialized');

// ナンパ関連の類義語辞書
const SYNONYMS = {
  'ナンパ': ['声かけ', 'アプローチ', 'ストリートナンパ', 'ストナン', '声掛け', 'ピックアップ'],
  '女性': ['女', '女の子', '女子', 'ガール', 'レディ'],
  'デート': ['アポ', 'アポイント', '約束', 'お茶', '飲み', '食事'],
  'コツ': ['方法', 'やり方', 'テクニック', '秘訣', 'ポイント', 'ノウハウ'],
  '恵比寿': ['えびす', 'エビス'],
  '新宿': ['しんじゅく'],
  '渋谷': ['しぶや'],
  '六本木': ['ろっぽんぎ', 'ロッポンギ'],
  'LINE': ['ライン', '連絡', 'メッセージ'],
  '彼女': ['彼女', 'カノジョ', 'ガールフレンド', 'パートナー'],
  '成功': ['うまくいく', '成功', 'ゲット', '成果'],
  '失敗': ['うまくいかない', '失敗', 'ミス', 'ダメ'],
  '初心者': ['初心者', 'ビギナー', '初めて', '新人'],
  '上達': ['上手くなる', '成長', 'レベルアップ', 'スキルアップ']
};

// 挨拶パターン
const GREETING_PATTERNS = [
  'こんにちは', 'こんばんは', 'おはよう', 'おはようございます',
  'こんにちわ', 'こんばんわ', 'ちわ', 'おっす', 'やあ',
  'はじめまして', '初めまして', 'よろしく'
];

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
        
        // 挨拶への特別対応
        if (queryAnalysis.isGreeting) {
          const greetingResponse = `チバです。

こんにちは。
お元気そうで何よりです。


今日はどのようなご質問でしょうか。


ナンパのこと、
デートのこと、
女性とのコミュニケーションのこと、
どんなことでもお聞きください。


私の経験から、
きっとお役に立てるアドバイスができると思います。`;
          
          await client.replyMessage(replyToken, {
            type: 'text',
            text: greetingResponse
          });
          
          console.log('Greeting reply sent');
          continue;
        }
        
        // CSVデータを構造化
        const csvData = [];
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
            csvData.push({
              id: row[0] || '',
              title: row[1] || '',
              content: row[2] || '',
              summary: row[3] || '',
              category: row[4] || '',
              keywords: row[6] || ''
            });
          } catch (parseError) {
            console.error(`Error parsing row ${i}:`, parseError.message);
          }
        }
        
        console.log('Total CSV data rows:', csvData.length);
        
        // 多段階検索の実行
        const multiStageResults = performMultiStageSearch(userMessage, queryAnalysis, csvData);
        console.log('Multi-stage search results:', multiStageResults.length);
        
        // 各結果に詳細スコアを計算
        const searchResults = multiStageResults.map(result => {
          const detailedScore = calculateRelevanceScore(
            userMessage,
            queryAnalysis,
            result
          );
          
          // ベーススコアと詳細スコアを組み合わせ
          const finalScore = Math.round((result.baseScore * 0.3 + detailedScore * 0.7));
          
          return {
            id: result.id,
            title: result.title,
            content: result.content.substring(0, 2000), // コンテキストを2000文字に増加
            summary: result.summary,
            category: result.category,
            keywords: result.keywords,
            score: finalScore,
            matchType: result.matchType
          };
        });
        
        console.log('Search results with scores:', searchResults.map(r => 
          `${r.title} (${r.matchType}: ${r.score})`
        ));
        
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
                    text: `あなたはナンパ師「チバ」です。ユーザーからの質問に対して、丁寧な敬語で親しみやすく回答してください。

【絶対に守るべき制約】
1. 必ず敬語（です・ます調）で統一する
2. 提供された情報は「参考」として、新規の回答を生成する
3. 特定の読者名（タケダさん等）は絶対に使わない
4. 「メルマガで配った」などのメタ的な内容は言わない
5. 「データによると」という表現は使わない
6. 文頭は必ず「チバです。」から始める
7. 句読点ごとに改行、段落間は空行2行
8. 記号（[]！など）は使わない

【回答の構成】
1. まず質問への共感を示す
2. 私の経験談として自然に語る（「実は私も〜」「以前〜したことがあります」）
3. 具体的なアドバイスを提供
4. 最後に励ましのメッセージ

【口調の例】
良い例：「そうですね」「〜ですよね」「〜と思います」「〜かもしれません」
悪い例：「だね」「〜よ」「〜だ」「〜かな」

質問タイプ: ${queryAnalysis.type}
ユーザーの質問: ${userMessage}

参考情報（この中から適切な内容を選んで、一般化して使用）:
${selectedResults.map((r, idx) => `
情報${idx + 1}（関連度: ${r.score}/100）
${r.title}
${r.summary}
${r.content}`).join('\n\n')}

上記の参考情報から、ユーザーの質問に関連する内容を抽出し、特定の個人名や具体的すぎる状況は一般化して、新しい回答として生成してください。`
                  }]
                }]
              }
            );
            
            replyText = geminiResponse.data.candidates[0].content.parts[0].text;
            console.log('Gemini response received');
          } catch (geminiError) {
            console.error('Gemini API error:', geminiError.response?.data || geminiError.message);
            
            // Gemini APIが失敗した場合、検索結果を直接返す（メルマガ風）
            if (searchResults.length > 0) {
              const result = searchResults[0];
              replyText = `チバです。

申し訳ございません。
システムの調子が悪いようです。


でも大丈夫です。
あなたのご質問について、
私の経験からお話しできることがあります。


実は、
「${result.title}」という話があります。


${result.summary}


これは私の実体験なんですが、
${result.content.substring(0, 300)}...


もっと詳しく知りたい場合は、
別の角度から質問していただけますか。


システムが回復しましたら、
もっと詳しくお話しできると思います。`;
            } else {
              replyText = `チバです。

申し訳ございません。
今ちょっとシステムの調子が悪いようです。


あなたのご質問にしっかりお答えしたいのですが、
うまく情報を引き出せない状態です。


少し時間を置いてから、
もう一度お試しいただけますか。


あるいは、
別の言い方でご質問いただけると助かります。


例えば、
もっと具体的なシチュエーションとか、
特定のお悩みとか、
そういう形でお聞きいただけると、
お答えしやすいかもしれません。`;
            }
          }
        } else {
          // 検索失敗時のメルマガ風フォールバック
          const fallbackType = queryAnalysis.type;
          
          if (fallbackType === 'consultation') {
            replyText = `チバです。

なるほど、
${userMessage}というお悩みですね。


実は、
その点については、
私のこれまでの経験でまだ詳しくお話ししていない部分なんです。


ただ、
一般的なアドバイスとして言えることは、
まずは行動することの大切さです。


悩んでいる時間があるなら、
一歩踏み出してみることですね。


失敗しても、
それが次への糧になります。


もし具体的に知りたいことがあれば、
別の角度から質問していただけますか。


例えば「デートの誘い方」とか、
「LINEの続け方」とか、
もっと具体的な質問でしたら、
私の経験から詳しくお答えできると思います。`;
          } else if (fallbackType === 'question') {
            replyText = `チバです。

いいご質問ですね。


「${userMessage}」についてですか。


実はその点について、
私はまだ詳しくお話ししたことがないんです。


ただ、
関連する話として、
ナンパやデートの基本的な考え方はお伝えできます。


大切なのは、
相手の立場に立って考えることです。


自分本位ではなく、
相手が何を求めているかを理解することが重要ですね。


もっと具体的な状況を教えていただければ、
より詳しいアドバイスができるかもしれません。


例えば、
「恵比寿でのナンパ」とか、
「初デートの店選び」とか、
そういう具体的な質問でしたら、
私の経験談がたくさんあります。`;
          } else {
            replyText = `チバです。

「${userMessage}」についてですね。


申し訳ございません。
その具体的なキーワードについては、
私はまだ詳しくお話ししたことがないんです。


でも、
もし関連する質問があれば、
ぜひお聞きください。


例えば：
・ナンパの基本的な考え方
・デートでの会話術
・LINEでのやり取りのコツ
・女性心理の理解
・失敗からの立ち直り方


こういった話題でしたら、
私の経験から具体的にお答えできます。


遠慮なくご質問ください。`;
          }
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

// 質問分析関数（改善版）
function analyzeQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // 挨拶チェック
  const isGreeting = GREETING_PATTERNS.some(pattern => 
    lowerQuery.includes(pattern.toLowerCase())
  );
  
  // 質問タイプの判定
  let type = 'general';
  if (isGreeting && query.length < 20) {
    type = 'greeting';
  } else if (query.includes('？') || query.includes('?') || 
      query.match(/どう|なぜ|いつ|どこ|誰|何|教えて|知りたい/)) {
    type = 'question';
  } else if (query.match(/相談|悩み|困って|助けて|アドバイス/)) {
    type = 'consultation';
  } else if (query.length < 10) {
    type = 'keyword';
  }
  
  // 形態素解析的なキーワード抽出（改善版）
  const keywords = extractKeywords(query);
  
  // 類義語展開
  const expandedKeywords = expandWithSynonyms(keywords);
  
  return {
    type: type,
    keywords: keywords,
    expandedKeywords: expandedKeywords,
    originalQuery: query,
    isGreeting: isGreeting
  };
}

// キーワード抽出関数
function extractKeywords(query) {
  // 不要な文字を除去
  let cleaned = query
    .replace(/[、。！？\s「」『』（）()]+/g, ' ')
    .replace(/です|ます|でした|ました|ですか|ますか|だ|である|ね|よ|な|の|を|が|は|に|で|と|から|まで|へ|より/g, ' ');
  
  // 意味のある単語を抽出
  const words = cleaned
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !word.match(/^(これ|それ|あれ|この|その|あの|こんな|そんな|あんな)$/));
  
  return [...new Set(words)]; // 重複除去
}

// 類義語展開関数
function expandWithSynonyms(keywords) {
  const expanded = new Set(keywords);
  
  keywords.forEach(keyword => {
    // 類義語辞書から展開
    Object.entries(SYNONYMS).forEach(([key, synonyms]) => {
      if (key === keyword || synonyms.includes(keyword)) {
        expanded.add(key);
        synonyms.forEach(syn => expanded.add(syn));
      }
    });
  });
  
  return Array.from(expanded);
}

// 関連性スコア計算関数（大幅改善版）
function calculateRelevanceScore(query, queryAnalysis, data) {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  
  // 各フィールドの重み
  const weights = {
    title: 35,
    keywords: 30,
    summary: 20,
    content: 10,
    category: 5
  };
  
  // 完全一致ボーナス
  const exactMatchBonus = 30;
  const partialMatchBonus = 15;
  
  // 各フィールドでの検索
  for (const [field, weight] of Object.entries(weights)) {
    const fieldValue = (data[field] || '').toLowerCase();
    
    // 完全一致（クエリ全体）
    if (fieldValue.includes(lowerQuery)) {
      score += weight + exactMatchBonus;
    }
    
    // オリジナルキーワードマッチ
    for (const keyword of queryAnalysis.keywords) {
      if (fieldValue.includes(keyword.toLowerCase())) {
        score += weight * 0.8;
      }
    }
    
    // 展開されたキーワードマッチ（類義語）
    for (const keyword of queryAnalysis.expandedKeywords) {
      if (fieldValue.includes(keyword.toLowerCase())) {
        score += weight * 0.5;
      }
    }
    
    // AND検索（複数キーワードすべて含む場合のボーナス）
    if (queryAnalysis.keywords.length > 1) {
      const allKeywordsMatch = queryAnalysis.keywords.every(kw => 
        fieldValue.includes(kw.toLowerCase())
      );
      if (allKeywordsMatch) {
        score += weight + partialMatchBonus;
      }
    }
  }
  
  // N-gram部分一致（2文字以上の部分文字列）
  if (lowerQuery.length >= 2) {
    const allText = `${data.title} ${data.keywords} ${data.summary}`.toLowerCase();
    for (let i = 0; i < lowerQuery.length - 1; i++) {
      const bigram = lowerQuery.substring(i, i + 2);
      if (allText.includes(bigram)) {
        score += 2;
      }
    }
  }
  
  // 正規化（0-100）
  return Math.min(100, Math.round(score));
}

// N-gram生成関数
function generateNgrams(text, n = 2) {
  const ngrams = [];
  const cleanText = text.toLowerCase().replace(/[、。！？\s]+/g, '');
  
  for (let i = 0; i <= cleanText.length - n; i++) {
    ngrams.push(cleanText.substring(i, i + n));
  }
  
  return ngrams;
}

// 多段階検索関数
function performMultiStageSearch(query, queryAnalysis, csvData) {
  const results = new Map(); // ID -> データのマップ
  
  // 第1段階：完全一致検索
  csvData.forEach(data => {
    if (data.content && data.content.toLowerCase().includes(query.toLowerCase())) {
      if (!results.has(data.id)) {
        results.set(data.id, { ...data, matchType: 'exact', baseScore: 100 });
      }
    }
  });
  
  // 第2段階：AND検索（すべてのキーワードを含む）
  if (queryAnalysis.keywords.length > 1) {
    csvData.forEach(data => {
      const allText = `${data.title} ${data.content} ${data.summary} ${data.keywords}`.toLowerCase();
      const allMatch = queryAnalysis.keywords.every(kw => 
        allText.includes(kw.toLowerCase())
      );
      
      if (allMatch && !results.has(data.id)) {
        results.set(data.id, { ...data, matchType: 'and', baseScore: 80 });
      }
    });
  }
  
  // 第3段階：OR検索（いずれかのキーワードを含む）
  queryAnalysis.keywords.forEach(keyword => {
    csvData.forEach(data => {
      const allText = `${data.title} ${data.content} ${data.summary} ${data.keywords}`.toLowerCase();
      
      if (allText.includes(keyword.toLowerCase()) && !results.has(data.id)) {
        results.set(data.id, { ...data, matchType: 'or', baseScore: 60 });
      }
    });
  });
  
  // 第4段階：類義語検索
  queryAnalysis.expandedKeywords.forEach(keyword => {
    csvData.forEach(data => {
      const allText = `${data.title} ${data.content} ${data.summary} ${data.keywords}`.toLowerCase();
      
      if (allText.includes(keyword.toLowerCase()) && !results.has(data.id)) {
        results.set(data.id, { ...data, matchType: 'synonym', baseScore: 40 });
      }
    });
  });
  
  return Array.from(results.values());
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Webhook URL: /webhook');
});