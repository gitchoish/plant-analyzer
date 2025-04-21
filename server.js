import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const API_KEY = '여기에_실제_Gemini_API_KEY를_입력하세요'; // 또는 환경변수 사용

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
    console.log('사용자 설명:', plantInfo);
    console.log('이미지 길이:', imageBase64.length);

    // 프롬프트 구성 (분석 내용 + JSON 좌표 반환 요청 포함)
    const prompt = `
다음 식물 사진과 설명을 기반으로 두 가지 정보를 JSON 형식으로 반환해 주세요:

1. "boxes": 이미지 상의 문제 위치를 좌표로 설명해주세요.
   형식 예시:
   "boxes": [
     { "x": 80, "y": 120, "width": 100, "height": 40, "label": "잎끝 마름" },
     { "x": 200, "y": 160, "width": 80, "height": 30, "label": "건강한 잎" }
   ]

2. "reply": 다음 5단계 항목으로 분석 내용을 작성해 주세요:
1. 현재 식물 상태
2. 주요 문제 요약
3. 문제 원인 분석
4. 해결 방법
5. 주의할 점

사용자 설명:
${plantInfo}
`;

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.replace(/^data:image\/jpeg;base64,/, ""),
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

    const result = await response.json();

    if (!result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).send({ error: 'AI 응답 없음', detail: result });
    }

    const rawText = result.candidates[0].content.parts[0].text;
    console.log('🧠 AI 응답 텍스트:\n', rawText);

    // boxes와 reply를 분리 파싱
    const boxMatch = rawText.match(/"boxes"\s*:\s*(\[[\s\S]*?\])/);
    let boxes = [];
    if (boxMatch) {
      try {
        boxes = JSON.parse(boxMatch[1]);
      } catch (e) {
        console.error('❌ boxes 파싱 오류:', e.message);
      }
    }

    const replySection = rawText.replace(/"boxes"\s*:\s*\[[\s\S]*?\]/, '').trim();

    res.send({
      reply: replySection,
      boxes: boxes
    });

  } catch (error) {
    console.error('❌ Gemini API 호출 중 예외 발생:', error);
    res.status(500).send({ error: '서버 내부 오류 발생', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
