import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const API_KEY = "AIzaSyCwhypGNz8ExfrzrpJbcjsZiG_ZORTCAQ4";

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64, plantInfo } = req.body;

    if (!imageBase64 || !plantInfo) {
      return res.status(400).send({ error: '이미지 또는 설명이 누락되었습니다.' });
    }

    console.log('✅ 분석 요청 도착');
    console.log('📌 사용자 설명:', plantInfo);
    console.log('🖼️ 이미지 데이터 시작:', imageBase64.slice(0, 50), '...');

    const prompt = `
다음 식물 사진과 사용자 설명을 기반으로, 아래 항목에 따라 논리적이고 구조화된 진단 리포트를 작성해 주세요.

※ 모든 항목은 번호와 제목을 포함하여 명확하게 구분된 형식으로 작성하세요.

1. 현재 식물 상태
2. 주요 문제 요약
3. 문제 원인 분석
4. 해결 방법
5. 주의할 점

사용자 설명:
${plantInfo}
    `.trim();

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/jpeg;base64,/, '')
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API 응답 오류:', errorText);
      return res.status(500).send({ error: 'Gemini API 호출 실패', detail: errorText });
    }

    const result = await response.json();
    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text || '분석 결과 없음';
    res.send({ reply });

  } catch (error) {
    console.error('❌ Gemini API 호출 중 예외 발생:', error);
    res.status(500).send({ error: '서버 내부 오류 발생', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
