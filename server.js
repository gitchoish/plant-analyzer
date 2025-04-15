import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch'; // 최신 node-fetch 방식

const app = express();

// ✅ 여기에 본인의 Gemini API 키를 정확히 입력하세요!
const API_KEY = 'AIzaSyCwhypGNz8ExfrzrpJbcjsZiG_ZORTCAQ4';

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64, plantInfo } = req.body;

    if (!imageBase64 || !plantInfo) {
      return res.status(400).send({ error: '이미지 또는 설명이 누락되었습니다.' });
    }

    console.log('✅ 분석 요청 도착');
    console.log('식물 정보:', plantInfo);
    console.log('이미지 일부:', imageBase64.slice(0, 50), '...');

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.replace(/^data:image\/jpeg;base64,/, ""),
              },
            },
            {
              text: `식물 정보: ${plantInfo}. 어떤 문제가 있는지 분석하고 해결책을 제시해주세요.`,
            },
          ],
        },
      ],
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API 응답 오류:', errorText);
      return res.status(500).send({ error: 'Gemini API 호출 실패', detail: errorText });
    }

    const result = await response.json();
    const reply = result.candidates?.[0]?.content?.parts?.[0]?.text || '분석 결과 없음';
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
