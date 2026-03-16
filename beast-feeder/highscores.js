// ─────────────────────────────────────────────────────────
//  highscores.js  —  shared by all KobieCade games
//  Stores top 5 scores per game in localStorage.
//  Each entry: { score, date }
//  A new score is only saved if it beats the current high score.
// ─────────────────────────────────────────────────────────

const HS_MAX = 5;

function hsKey(gameId) {
  return 'kobiecade_hs_' + gameId;
}

// Load scores for a game — returns array sorted highest first
function hsLoad(gameId) {
  try {
    return JSON.parse(localStorage.getItem(hsKey(gameId))) || [];
  } catch (e) {
    return [];
  }
}

// Returns the current best score for a game, or 0 if none
function hsBest(gameId) {
  const scores = hsLoad(gameId);
  return scores.length > 0 ? scores[0].score : 0;
}

// Save a score only if it beats the current high score.
// Returns { saved, rank }
function hsSave(gameId, score) {
  const scores = hsLoad(gameId);
  const best   = scores.length > 0 ? scores[0].score : 0;

  if (score <= best) {
    return { saved: false, rank: null };
  }

  const entry = {
    score,
    date: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: '2-digit' }),
  };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const rank    = scores.findIndex(e => e === entry) + 1;
  const trimmed = scores.slice(0, HS_MAX);
  try {
    localStorage.setItem(hsKey(gameId), JSON.stringify(trimmed));
  } catch (e) {}
  return { saved: true, rank: rank <= HS_MAX ? rank : null };
}

// Render full top-5 table (game over screen)
function hsRender(gameId, containerId, newRank) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const scores = hsLoad(gameId);

  if (scores.length === 0) {
    el.innerHTML = '<p class="hs-empty">No high score yet!</p>';
    return;
  }

  const rows = scores.map((s, i) => {
    const isNew = (i + 1) === newRank;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const cls   = isNew ? ' hs-new' : '';
    return `<tr class="hs-row${cls}">
      <td class="hs-rank">${medal}</td>
      <td class="hs-score">${s.score.toLocaleString()}</td>
      <td class="hs-date">${s.date}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <table class="hs-table">
      <thead><tr>
        <th colspan="3" class="hs-title">HIGH SCORES</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// Render just the single best score (landing page)
function hsRenderBest(gameId, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const scores = hsLoad(gameId);

  if (scores.length === 0) {
    el.innerHTML = '<p class="hs-empty">No score yet — play to set one!</p>';
    return;
  }

  const best = scores[0];
  el.innerHTML = `
    <table class="hs-table">
      <tbody>
        <tr class="hs-row">
          <td class="hs-rank">🥇</td>
          <td class="hs-score">${best.score.toLocaleString()}</td>
          <td class="hs-date">${best.date}</td>
        </tr>
      </tbody>
    </table>`;
}