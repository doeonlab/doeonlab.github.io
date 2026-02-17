# DOEON LAB Website

간단한 정적 웹사이트입니다. HTML/CSS/JS만 사용하며, 주요 섹션은 JSON으로 관리됩니다.

## 실행 방법
로컬 서버 실행:
```bash
python -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속

## 콘텐츠 수정

### 공통 텍스트
- `site.json`
  - `yourName`: 헤더에 표시되는 이름
  - `labName`: About 상단(eyebrow) 및 footer 조합에 사용
  - `copyright`: footer 하단 문구

### Hero 섹션
- 템플릿: `hero/hero.html`
- 데이터: `hero/hero.json`
  - `eyebrow`, `title`, `lead`
  - `buttons`: 버튼 목록
  - `meta`: 메타 정보 (label/value)
  - `slides`: 이미지 슬라이드 (파일명만)

슬라이드 이미지 경로는 자동으로 `/images/hero/`가 붙습니다.

### About 섹션
- 템플릿: `about/about.html`
- 데이터: `about/about.json`

### People 섹션
- 데이터: `people/people.json`
- `photo`에 파일명만 넣으면 `/images/people/`를 자동으로 붙입니다.

### Publications
- 데이터:
  - `publications/publications_first_author.json`
  - `publications/publications_co_author.json`
- `thumb`에 파일명만 넣으면 `/images/publications/`를 자동으로 붙입니다.

### Research
- 데이터: `research/research.json`
- `image`에 파일명만 넣으면 `/images/research/`를 자동으로 붙입니다.

## 폴더 구조
```
hero/
  hero.html
  hero.json
about/
  about.html
  about.json
people/
  people.json
publications/
  index.html
  publications_first_author.json
  publications_co_author.json
research/
  index.html
  research.json
images/
  hero/
  about/ (미사용)
  people/
  publications/
  research/
```

## 배포 (GitHub Pages)
1. GitHub 저장소 생성
2. 아래 커맨드로 push
```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/사용자명/저장소이름.git
git push -u origin main
```
3. 저장소 Settings → Pages → `main` / `/ (root)` 선택

