const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

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

お、元気そうだね。


今日はどんな質問があるのかな。


ナンパのこと、
デートのこと、
女性とのコミュニケーションのこと、
なんでも聞いてくれ。


俺の経験から、
きっと役立つアドバイスができると思うよ。`;
          
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
                    text: `あなたはナンパ師「チバ」です。メールマガジンで読者の質問に答えるような、親しみやすく詳しい文体で回答してください。

重要な制約：
1. 提供されたデータの内容を元に、チバの経験談として自然に語る
2. 「データによると」「データにあるように」という表現は絶対に使わない
3. メルマガのような読者への語りかけ調を維持
4. 具体的なエピソードや例を交えて説明
5. 文頭は必ず「チバです。」から始める
6. 句読点ごとに改行し、段落間は空行2行
7. 記号（[]！など）は使わない
8. 相手の状況に共感し、励ましや応援のメッセージを含める

回答スタイル：
- まず相手の質問や状況に共感する
- 次に具体的な経験やアドバイスを語る
- 最後に励ましや次のステップを提示

質問タイプ: ${queryAnalysis.type}
ユーザーの質問: ${userMessage}

参考情報:
${selectedResults.map((r, idx) => `
情報${idx + 1}（関連度: ${r.score}/100）
${r.title}
${r.summary}
${r.content}`).join('\n\n')}

上記の情報を「私の経験」「実は以前」「〜という話があってね」などの自然な形で組み込み、メルマガ風の親しみやすい長文で回答してください。`
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

おっと、
システムの調子が悪いみたいだな。


でも大丈夫、
君の質問について、
俺の経験から話せることがある。


実はね、
「${result.title}」という話があってね。


${result.summary}


これは俺の実体験なんだけど、
${result.content.substring(0, 300)}...


もっと詳しく知りたかったら、
別の角度から質問してみてくれ。


システムが回復したら、
もっと詳しく話せると思うよ。`;
            } else {
              replyText = `チバです。

申し訳ない、
今ちょっとシステムの調子が悪いみたいだ。


君の質問にしっかり答えたいんだけど、
うまく情報を引き出せないんだ。


少し時間を置いてから、
もう一度試してみてくれるかな。


それか、
別の言い方で質問してみてくれ。


例えば、
もっと具体的なシチュエーションとか、
特定の悩みとか、
そういう形で聞いてもらえると、
答えやすいかもしれない。`;
            }
          }
        } else {
          // 検索失敗時のメルマガ風フォールバック
          const fallbackType = queryAnalysis.type;
          
          if (fallbackType === 'consultation') {
            replyText = `チバです。

なるほど、${userMessage}という悩みか。


実は、その点については、
俺のメルマガでまだ詳しく触れていない部分なんだ。


ただ、一般的なアドバイスとして言えるのは、
まずは行動することの大切さだね。


悩んでいる時間があったら、
一歩踏み出してみる。


失敗しても、
それが次への糧になる。


もし具体的に知りたいことがあれば、
別の角度から質問してみてくれ。


例えば「デートの誘い方」とか、
「LINEの続け方」とか、
もっと具体的な質問だと、
俺の経験から詳しく答えられるかもしれない。`;
          } else if (fallbackType === 'question') {
            replyText = `チバです。

お、いい質問だね。


「${userMessage}」か。


実はその点について、
俺のメルマガではまだ詳しく書いていないんだ。


でも、関連する話として、
ナンパやデートの基本的な考え方は伝えられる。


大切なのは、
相手の立場に立って考えること。


自分本位じゃなくて、
相手が何を求めているかを理解する。


もっと具体的な状況を教えてくれれば、
より詳しいアドバイスができるかもしれない。


例えば、
「恵比寿でのナンパ」とか、
「初デートの店選び」とか、
そういう具体的な質問なら、
俺の経験談がたくさんあるよ。`;
          } else {
            replyText = `チバです。

「${userMessage}」についてか。


申し訳ない、
その具体的なキーワードについては、
俺のメルマガでまだ触れていないんだ。


でも、もし関連する質問があれば、
ぜひ聞いてくれ。


例えば：
・ナンパの基本的な考え方
・デートでの会話術
・LINEでのやり取りのコツ
・女性心理の理解
・失敗からの立ち直り方


こういった話題なら、
俺の経験から具体的に答えられる。


遠慮なく質問してくれよ。`;
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