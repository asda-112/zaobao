function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compactIssues(issues) {
  return issues.slice(0, 4).map((issue, index) => ({
    number: index + 1,
    title: issue.candidate.title,
    summary: issue.candidate.content
  }));
}

export function createJuyaStyleCard({date, issues, theme}) {
  const cards = compactIssues(issues)
    .map(
      (issue) => `
        <article class="news-card">
          <span class="badge">#${issue.number}</span>
          <h2>${escapeHtml(issue.title)}</h2>
          <p>${escapeHtml(issue.summary)}</p>
        </article>
      `
    )
    .join('');

  const html = `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>AI 早报 ${escapeHtml(date)}</title>
    <style>
      :root {
        --bg: #fff8f1;
        --card: #ffffff;
        --text: #6c2b14;
        --subtext: #8d4d2f;
        --primary: ${theme?.primary || '#F59E0B'};
        --accent: ${theme?.accent || '#F9A8D4'};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        background:
          radial-gradient(circle at top right, rgba(249,168,212,.22), transparent 28%),
          radial-gradient(circle at left bottom, rgba(245,158,11,.18), transparent 30%),
          var(--bg);
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        color: var(--text);
      }
      .frame {
        width: 100%;
        height: 100%;
        padding: 72px;
        display: flex;
        flex-direction: column;
        gap: 36px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 32px;
      }
      .hero-tag {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 999px;
        background: rgba(245,158,11,.14);
        color: #b45309;
        font-weight: 700;
        font-size: 20px;
      }
      .hero h1 {
        margin: 14px 0 0;
        font-size: 68px;
        line-height: 1.12;
      }
      .hero p {
        margin: 18px 0 0;
        font-size: 26px;
        line-height: 1.5;
        color: var(--subtext);
      }
      .date-pill {
        padding: 12px 18px;
        border-radius: 20px;
        background: rgba(255,255,255,.85);
        border: 1px solid rgba(245,158,11,.18);
        font-size: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
        flex: 1;
      }
      .news-card {
        background: var(--card);
        border-radius: 28px;
        padding: 30px 30px 28px;
        box-shadow: 0 30px 70px rgba(245,158,11,.08);
        min-height: 0;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 52px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(249,168,212,.18);
        color: #be185d;
        font-weight: 700;
      }
      .news-card h2 {
        margin: 18px 0 12px;
        font-size: 34px;
        line-height: 1.28;
      }
      .news-card p {
        margin: 0;
        font-size: 22px;
        line-height: 1.55;
        color: var(--subtext);
      }
    </style>
  </head>
  <body>
    <main class="frame">
      <section class="hero">
        <div>
          <span class="hero-tag">橘鸦风格摘要卡</span>
          <h1>AI 早报 ${escapeHtml(date)}</h1>
          <p>清爽简洁的暖橘与淡粉信息卡，用于 B 站封面、片头卡或公众号头图。</p>
        </div>
        <div class="date-pill">${escapeHtml(date)}</div>
      </section>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>
  `.trim();

  const prompt = [
    'Create a single-file 1920x1080 HTML news card image.',
    'Style: clean, warm, light, orange primary with soft pink accent.',
    'Use 2-4 rounded cards with strong hierarchy, generous whitespace, and editorial polish.',
    `Headline: AI 早报 ${date}.`,
    `Stories: ${compactIssues(issues).map((issue) => `${issue.number}. ${issue.title}`).join(' | ')}`
  ].join(' ');

  return {html, prompt};
}
