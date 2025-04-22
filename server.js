import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();

// 환경변수에서 API 키 불러오기
const API_KEY = process.env.GEMINI_API_KEY;

// API 키 존재 여부 로깅
console.log('🔑 API Key 설정 상태:', API_KEY ? '✅ 있음' : '❌ 없음');

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.post('/analyze', async (req, res) => {
  try {
    // API 키 존재 확인
    if (!API_KEY) {
      console.error('❌ 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.');
      return res.status(500).send({ error: 'API 키 누락', detail: '서버에 API 키가 설정되지 않았습니다.' });
    }

    const { imageBase64, plantInfo } = req.body;

    // 요청 유효성 검사
    if (!imageBase64 || !plantInfo) {
      return res.status(400).send({ error: '이미지 또는 설명이 누락되었습니다.' });
    }

    console.log('✅ 분석 요청 도착');
    console.log('📝 설명:', plantInfo);
    console.log('📷 이미지 길이:', imageBase64.length);

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

    console.log('🚀 Gemini API 호출 시작');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    console.log('📥 Gemini 응답 원문:', JSON.stringify(result, null, 2));

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).send({ error: 'AI 응답 없음', detail: result });
    }

    console.log('🧠 AI 응답 텍스트:', text.slice(0, 300), '...');

    // boxes 추출
    const boxMatch = text.match(/"boxes"\s*:\s*(\[[\s\S]*?\])/);
    let boxes = [];
    if (boxMatch) {
      try {
        boxes = JSON.parse(boxMatch[1]);
        console.log('✅ 박스 추출 성공:', boxes);
      } catch (e) {
        console.error('❌ boxes JSON 파싱 실패:', e.message);
      }
    } else {
      console.warn('⚠️ 응답 내 boxes 항목 없음');
    }

    // reply 본문 추출
    const replySection = text.replace(/"boxes"\s*:\s*\[[\s\S]*?\]/, '').trim();

    res.send({
      reply: replySection,
      boxes: boxes
    });

  } catch (error) {
    console.error('❌ 서버 예외 발생:', error);
    res.status(500).send({ error: '서버 내부 오류 발생', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
