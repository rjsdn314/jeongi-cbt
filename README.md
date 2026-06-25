# 전기기사 CBT 문제풀이

동일출판사 전기기사 시리즈 기출문제를 기반으로 한 CBT(컴퓨터 기반 시험) 형식 학습 사이트.

## 과목
- 제어공학 · 회로이론 · 전기기기 · 전기자기 · 전력공학 (총 약 2,980문제)

## 기능
- 과목별 문제풀이 (문제 수 / 랜덤·순서 / 학습·실전 모드 선택)
- 학습 모드: 보기 선택 즉시 정답·오답 채점
- 실전 모드: 타이머 + 답안지(OMR), 제출 후 일괄 채점
- 자동 오답노트 / 북마크(별표) / 최근 점수 (브라우저 localStorage 저장)
- 문제 이미지 확대 보기 (수식·회로도 원본 그대로)

## 구조
```
public/
  index.html, style.css, app.js   # 정적 SPA
  data/index.json                  # 과목 목록
  data/<slug>.json                 # 과목별 문제(정답·출처·이미지경로)
  q/<slug>/0001.webp ...           # 문제 이미지(원본 PDF 크롭)
vercel.json                        # 정적 배포 설정 (outputDirectory: public)
```

## 로컬 실행
```bash
cd public
python -m http.server 8000
# http://localhost:8000
```

## 배포 (Vercel)
GitHub 저장소에 push → Vercel에서 Import → 자동 배포.
정적 사이트(빌드 없음), 산출물 디렉터리는 `public`.

> 문제 이미지는 원본 교재에서 추출한 학습용 자료입니다.
