const E = window.Engine;
const { TYPES, STAT_TIERS, EMPTY } = E;
const SLOTS = ["頭", "甲", "手", "鞋"];
const $ = id => document.getElementById(id);
const SAVE_KEY = "nikke-reroll-v2";

const blankGear = name => ({
    name, awakened: false,
    lines: [0, 1, 2].map(() => ({ t: EMPTY, k: 0 })),
    stone: [false, false, false], key: [false, false, false]
});
let state = { stones: 0, keys: 0, gear: SLOTS.map(blankGear) };

function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state, bs: $("inputStones").value, bk: $("inputKeys").value })); } catch (e) { /* 無法儲存時照常運作 */ }
}
function load() {
    try {
        const d = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (d && d.state && d.state.gear && d.state.gear.length === 4) {
            state = d.state;
            $("inputStones").value = d.bs || "";
            $("inputKeys").value = d.bk || "";
        }
    } catch (e) { /* 忽略壞掉的存檔 */ }
}

// ---------- 小工具 ----------
let toastTimer;
function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
const pct = p => p <= 0 ? "—" : (p * 100 >= 0.01 ? (p * 100).toFixed(p * 100 >= 1 ? 2 : 3) : (p * 100).toExponential(1)) + "%";
const tierClass = k => k === 15 ? "t-max" : k >= 12 ? "t-high" : "";

function lineHTML(l, extra = "") {
    if (l.t === EMPTY) return `<div class="line empty ${extra}"><span class="line-name">空詞條</span></div>`;
    const name = TYPES[l.t];
    let segs = "";
    for (let i = 1; i <= 15; i++) segs += `<i class="${i <= l.k ? "on" : ""}"></i>`;
    return `<div class="line ${tierClass(l.k)} ${extra}">
        <span class="line-name">${name}</span>
        <span class="line-val">${STAT_TIERS[name][l.k - 1].toFixed(2)}%</span>
        <span class="line-tier">${l.k} 階</span>
        <span class="gauge" aria-hidden="true">${segs}</span>
    </div>`;
}

function budget(id) { const v = parseInt($(id).value, 10); return isNaN(v) || v < 0 ? null : v; }
function afford(stones, keys) {
    const bs = budget("inputStones"), bk = budget("inputKeys");
    if (stones && bs !== null && state.stones + stones > bs) { toast("你沒石頭了餓阿"); return false; }
    if (keys && bk !== null && state.keys + keys > bk) { toast("你沒鑰匙了餓阿"); return false; }
    return true;
}
function spend(stones, keys) { state.stones += stones; state.keys += keys; }
const lockedOf = g => g.lines.map((_, i) => g.stone[i] || g.key[i]);
const lockCount = g => lockedOf(g).filter(Boolean).length;
// 鑰匙鎖每洗一次扣一次：是唯一的鎖扣 20，另有一條鎖扣 30，兩條都是鑰匙鎖扣 50
const keyCost = g => { const m = g.key.filter(Boolean).length; return m === 0 ? 0 : m === 2 ? 50 : lockCount(g) === 2 ? 30 : 20; };

// ---------- 模擬畫面 ----------
function renderLedger() {
    $("spentStones").textContent = state.stones;
    $("spentKeys").textContent = state.keys;
    const bs = budget("inputStones"), bk = budget("inputKeys");
    $("leftStones").textContent = bs === null ? "已花" : `已花，剩 ${bs - state.stones}`;
    $("leftKeys").textContent = bk === null ? "已花" : `已花，剩 ${bk - state.keys}`;
}

function render() {
    $("gear").innerHTML = state.gear.map((g, gi) => {
        const n = lockCount(g);
        const kc = keyCost(g);
        const rollCost = `${1 + n} 顆` + (kc ? ` + ${kc} 鑰匙` : "");
        const canValue = g.lines.some((l, i) => l.t !== EMPTY && !(g.stone[i] || g.key[i]));
        const lines = g.lines.map((l, i) => {
            const isLocked = g.stone[i] || g.key[i];
            const full = !isLocked && n >= 2;
            const dis = !g.awakened || l.t === EMPTY || full;
            const cost = n === 0 ? 2 : 3;
            return `<div class="slot ${isLocked ? "locked" : ""}">
                <span class="slot-no">${i + 1}</span>
                ${lineHTML(l)}
                <div class="locks">
                    <button class="lock stone ${g.stone[i] ? "on" : ""}" data-act="stone" data-g="${gi}" data-i="${i}"
                        ${(dis && !g.stone[i]) || g.key[i] ? "disabled" : ""} aria-pressed="${g.stone[i]}">${g.stone[i] ? "石頭鎖中" : `石頭鎖 ${cost}`}</button>
                    <button class="lock key ${g.key[i] ? "on" : ""}" data-act="key" data-g="${gi}" data-i="${i}"
                        ${(dis && !g.key[i]) || g.stone[i] ? "disabled" : ""} aria-pressed="${g.key[i]}">${g.key[i] ? "鑰匙鎖中" : `鑰匙鎖 ${cost * 10}/次`}</button>
                </div>
            </div>`;
        }).join("");
        const actions = g.awakened
            ? `<button class="btn solid" data-act="effect" data-g="${gi}" ${n > 2 ? "disabled" : ""}>效果變更<small>${rollCost}</small></button>
               <button class="btn solid alt" data-act="value" data-g="${gi}" ${canValue ? "" : "disabled"}>數值變更<small>${rollCost}</small></button>`
            : `<button class="btn solid" data-act="awaken" data-g="${gi}">開光<small>1 顆</small></button>`;
        return `<article class="plate">
            <header><h2>${g.name}</h2><button class="link" data-act="reset" data-g="${gi}">重置這件</button></header>
            ${lines}
            <div class="plate-actions">${actions}</div>
        </article>`;
    }).join("");
    renderLedger();
    save();
}

function doAwaken(g) {
    if (!afford(1, 0)) return;
    spend(1, 0);
    g.awakened = true;
    g.lines = E.rollEffect(g.lines, [false, false, false], false).map(l => l.t === EMPTY ? l : { t: l.t, k: 11 });
    render();
}

function toggleLock(g, i, kind) {
    const arr = g[kind];
    if (arr[i]) { arr[i] = false; render(); return; }
    const base = lockCount(g) === 0 ? 2 : 3;
    if (kind === "stone") {
        if (!afford(base, 0)) return;
        spend(base, 0);
    }
    arr[i] = true;
    toast(kind === "stone" ? `已鎖定，花了 ${base} 顆石頭` : `已鎖定，之後每洗一次扣 ${base * 10} 把鑰匙`);
    render();
}

let pending = null;
function doRoll(g, mode) {
    const locked = lockedOf(g);
    const cost = 1 + locked.filter(Boolean).length;
    const keys = keyCost(g);
    if (!afford(cost, keys)) return;
    spend(cost, keys);
    const roll = mode === "effect" ? E.rollEffect : E.rollValue;
    const mass = mode === "effect" ? E.massEffect : E.massValue;
    const next = roll(g.lines, locked, true);
    const mo = mass(g.lines, locked), mn = mass(next, locked);

    $("rollTitle").textContent = mode === "effect" ? "效果變更" : "數值變更";
    $("rollOld").innerHTML = g.lines.map((l, i) => lineHTML(l, locked[i] ? "is-locked" : "")).join("");
    $("rollNew").innerHTML = next.map((l, i) => {
        const o = g.lines[i];
        return lineHTML(l, locked[i] ? "is-locked" : (o.t !== l.t || o.k !== l.k) ? "changed" : "");
    }).join("");
    const boost = m => m <= 0 ? "留這組：下次機率不變" : `留這組：下次其他結果機率 +${(m / (1 - m) * 100).toFixed(m > 0.01 ? 1 : 2)}%`;
    $("massOld").textContent = boost(mo);
    $("massNew").textContent = boost(mn);
    $("rollTip").textContent = Math.max(mo, mn) < 0.01
        ? "遊戲不會再洗出你留著的那組，它原本的機率會分給其他結果。這次兩邊都不到 1%，留哪邊幾乎沒差。"
        : mo === mn ? "遊戲不會再洗出你留著的那組，它原本的機率會分給其他結果。兩邊加成一樣。"
            : `遊戲不會再洗出你留著的那組，它原本的機率會分給其他結果。兩邊都不要的話，選「${mo > mn ? "效果維持" : "效果變更"}」加成比較多。`;
    pending = { g, next };
    renderLedger();
    $("rollDialog").showModal();
}
function resolveRoll(take) {
    if (!pending) return;
    if (take) pending.g.lines = pending.next;
    pending = null;
    $("rollDialog").close();
    render();
}

$("gear").addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const g = state.gear[+b.dataset.g], i = +b.dataset.i;
    switch (b.dataset.act) {
        case "awaken": doAwaken(g); break;
        case "reset": state.gear[+b.dataset.g] = blankGear(g.name); render(); break;
        case "stone": toggleLock(g, i, "stone"); break;
        case "key": toggleLock(g, i, "key"); break;
        case "effect": doRoll(g, "effect"); break;
        case "value": doRoll(g, "value"); break;
    }
});
$("btnKeep").onclick = () => resolveRoll(false);
$("btnTake").onclick = () => resolveRoll(true);
$("rollDialog").addEventListener("cancel", e => { e.preventDefault(); resolveRoll(false); });
$("inputStones").addEventListener("input", () => { renderLedger(); save(); });
$("inputKeys").addEventListener("input", () => { renderLedger(); save(); });

let resetArmed = 0;
$("btnResetAll").onclick = () => {
    if (Date.now() - resetArmed > 3000) { resetArmed = Date.now(); toast("再按一次就清空所有裝備和花費"); return; }
    resetArmed = 0;
    state = { stones: 0, keys: 0, gear: SLOTS.map(blankGear) };
    $("inputStones").value = ""; $("inputKeys").value = "";
    render();
    toast("已全部重置");
};

// ---------- 詞條總和 ----------
const VERDICTS = [
    [110, "共鬥天帝", "詞條掛發我，求求了"],
    [95, "個突皇帝", "我命令你馬上上號帶我前百"],
    [80, "凱瑞大C", "共鬥亮出戰力，其他人都要自覺跪下"],
    [60, "也就那樣", "下次會戰前記得提升不然優化你"],
    [40, "你洗了嗎", "不會吧你還有錢吧去買石頭阿"],
    [20, "路邊一條", "記得把輔助技能拉滿，自覺一點"],
    [-1, ":)", ":)"]
];
const SCORE_W = { "優越代碼傷害": 0.6, "攻擊力": 0.8, "最大彈藥數": 0.05, "蓄力速度": 0.8, "暴擊傷害": 0.2, "暴擊率": 0.6, "蓄力傷害": 0.1 };

$("btnSummary").onclick = () => {
    const sums = {};
    state.gear.forEach(g => g.lines.forEach(l => {
        if (l.t !== EMPTY) sums[TYPES[l.t]] = (sums[TYPES[l.t]] || 0) + STAT_TIERS[TYPES[l.t]][l.k - 1];
    }));
    let score = 0;
    for (const t in sums) score += sums[t] * (SCORE_W[t] || 0);
    const v = VERDICTS.find(x => score >= x[0]);
    $("scoreTitle").textContent = v[1];
    $("scoreQuote").textContent = v[2];
    const rows = TYPES.filter(t => sums[t]).map(t => `<div class="sum-row"><span>${t}</span><b>+${sums[t].toFixed(2)}%</b></div>`).join("");
    $("sumList").innerHTML = rows || `<p class="hint">還沒有任何詞條，先幫裝備開光。</p>`;
    $("sumCost").textContent = `這輪總共花了 ${state.stones} 顆石頭、${state.keys} 把鑰匙。`;
    $("sumDialog").showModal();
};
$("btnSumClose").onclick = () => $("sumDialog").close();

// ---------- 分頁 ----------
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
    document.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.id === "tab-" + b.dataset.tab));
    window.scrollTo(0, 0);
});

// ---------- 階級表 ----------
function buildRef() {
    let h = `<thead><tr><th>階級</th><th>機率</th>${TYPES.map(t => `<th>${t}</th>`).join("")}</tr></thead><tbody>`;
    for (let k = 15; k >= 1; k--) {
        h += `<tr class="${tierClass(k)}"><th>${k}</th><td>${(E.TIER_P[k] * 100).toFixed(0)}%</td>${TYPES.map(t => `<td>${STAT_TIERS[t][k - 1].toFixed(2)}</td>`).join("")}</tr>`;
    }
    h += `</tbody><tfoot><tr><th>種類</th><td></td>${E.WEIGHTS.map(w => `<td>${(w * 100).toFixed(0)}%</td>`).join("")}</tr></tfoot>`;
    $("refTable").innerHTML = h;
}

// ---------- 期望計算 ----------
const tierOpts = sel => { let s = ""; for (let k = 1; k <= 15; k++) s += `<option ${k === sel ? "selected" : ""}>${k}</option>`; return s; };
const piecesNow = () => +$("calcPieces").value;
function buildCalc() {
    const typeOpts = `<option value="-1">空詞條</option>` + TYPES.map((t, i) => `<option value="${i}">${t}</option>`).join("");
    $("calcCurrent").innerHTML = [0, 1, 2].map(i => `<div class="row">
        <span class="slot-no">${i + 1}</span>
        <select id="cType${i}" aria-label="${i + 1} 號位種類">${typeOpts}</select>
        <select id="cTier${i}" aria-label="${i + 1} 號位階級">${tierOpts(11)}</select><span>階</span>
        <label class="check"><input type="checkbox" id="cLock${i}"> 已鎖</label>
    </div>`).join("");
    const row = i => `<span class="tname">${TYPES[i]}</span>
        <input type="checkbox" id="tReq${i}" aria-label="${TYPES[i]} 每件都要">
        <span class="stepper"><button type="button" data-step="${i},-1" aria-label="${TYPES[i]} 減一條">−</button><b id="tQ${i}">0</b><button type="button" data-step="${i},1" aria-label="${TYPES[i]} 加一條">+</button></span>
        <select id="tTier${i}" class="tier-col" aria-label="${TYPES[i]} 最低階級">${tierOpts(11)}</select>`;
    const head = `<span class="th">種類</span><span class="th">每件</span><span class="th">另外</span><span class="th tier-col">最低階級</span>`;
    $("calcTargets").innerHTML = head + MAIN_TYPES.map(row).join("");
    $("calcTargetsMore").innerHTML = TYPES.map((_, i) => i).filter(i => !MAIN_TYPES.includes(i)).map(row).join("");
    document.querySelector(".calc-form").addEventListener("change", syncCalc);
    document.querySelector(".calc-form").addEventListener("click", ev => {
        const b = ev.target.closest("[data-step]");
        if (!b) return;
        const [i, d] = b.dataset.step.split(",").map(Number);
        extra[i] = Math.max(0, Math.min(piecesNow(), extra[i] + d));
        syncCalc();
    });
    setPreset([0, 3]);
}
// 優越、攻擊、彈藥、爆傷、爆率放在外面，其餘收在「其他詞條」
const MAIN_TYPES = [0, 3, 2, 6, 7];
const extra = TYPES.map(() => 0);
function setPreset(ids) {
    TYPES.forEach((_, i) => { $("tReq" + i).checked = ids.includes(i); });
    syncCalc();
}
function syncCalc() {
    const n = piecesNow();
    const useTier = $("calcUseTier").checked;
    let req = 0, total = 0;
    const quota = [], minTier = [];
    TYPES.forEach((_, i) => {
        const r = $("tReq" + i).checked;
        extra[i] = Math.min(extra[i], n);
        const q = r ? 0 : extra[i];
        if (r) req |= 1 << i;
        quota.push(q);
        minTier.push(useTier ? +$("tTier" + i).value : 1);
        total += r ? n : q;
        $("tQ" + i).textContent = r ? "—" : q;
        const st = $("tQ" + i).parentElement;
        st.classList.toggle("off", r);
        st.querySelectorAll("button").forEach((b, k) => { b.disabled = r || (k === 0 ? q <= 0 : q >= n); });
        $("tTier" + i).disabled = !r && q === 0;
    });
    document.querySelector(".calc-form").classList.toggle("show-tier", useTier);
    $("calcCurrentWrap").hidden = n !== 1;
    $("calcCount").textContent = `目前共 ${total} 條，${n} 件裝備最多放 ${n * 3} 條。`;
    $("calcCount").classList.toggle("error", total > n * 3);
    return { req, quota, minTier, total, pieces: n };
}
document.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => setPreset(b.dataset.preset.split(",").map(Number)));

function runCalc() {
    const out = $("calcResult");
    const g = syncCalc();
    let init = null;
    if (g.pieces === 1) {
        init = [0, 1, 2].map(i => {
            const t = +$("cType" + i).value;
            return { t, k: t === EMPTY ? 0 : +$("cTier" + i).value, locked: $("cLock" + i).checked };
        });
        const used = init.filter(l => l.t !== EMPTY).map(l => l.t);
        if (new Set(used).size !== used.length) { out.innerHTML = `<p class="error">現在的詞條有重複種類，同一件裝備不會出現兩條一樣的。</p>`; return; }
    }
    if (!g.total) { out.innerHTML = `<p class="error">請至少選一種想要的詞條。</p>`; return; }
    if (g.total > g.pieces * 3) { out.innerHTML = `<p class="error">目標共 ${g.total} 條，${g.pieces} 件裝備只放得下 ${g.pieces * 3} 條。減少條數或增加件數。</p>`; return; }

    const runs = +$("calcRuns").value;
    const base = { init, req: g.req, quota: g.quota, minTier: g.minTier, pieces: g.pieces, runs };
    const jobs = [];
    for (let s = 0; s < 5; s++) for (let k = 0; k < 2; k++) jobs.push({ strategy: s, keepHigh: !!k });
    const results = [];
    $("btnCalc").disabled = true;
    const step = () => {
        const j = jobs[results.length];
        results.push({ ...j, ...E.simulate({ ...base, ...j, exclude: true }) });
        out.innerHTML = `<p class="hint">計算中 ${results.length} / ${jobs.length}</p>`;
        if (results.length < jobs.length) return setTimeout(step, 0);
        results.sort((a, b) => (a.avg === null) - (b.avg === null) || a.avg - b.avg);
        const best = results[0];
        const old = best.avg === null ? null : E.simulate({ ...base, strategy: best.strategy, keepHigh: false, exclude: false });
        showResults(results, old);
        $("btnCalc").disabled = false;
    };
    out.innerHTML = `<p class="hint">計算中 0 / ${jobs.length}</p>`;
    setTimeout(step, 30);
}

function showResults(results, old) {
    const best = results[0];
    if (best.avg === null) { $("calcResult").innerHTML = `<p class="error">每種策略都有裝備在 10,000 顆內洗不到，目標可能太高。</p>`; return; }
    const max = Math.max(...results.map(r => r.avg || 0));
    let h = `<div class="answer">
        <div class="answer-num"><b>${best.avg.toFixed(0)}</b> 顆<small>平均</small></div>
        <p>一半的人在 ${best.median} 顆內洗完，九成的人在 ${best.p90} 顆內。</p>
        <p>最省的洗法：${E.LOCK_STRATEGIES[best.strategy]}，${E.KEEP_POLICIES[+best.keepHigh]}。</p>
    </div>`;
    if (old && old.avg !== null) {
        const d = old.avg - best.avg;
        h += `<p class="hint">同樣的鎖法在舊機制平均要 ${old.avg.toFixed(0)} 顆，新機制${d >= 0 ? "省" : "多"} ${Math.abs(d).toFixed(0)} 顆。</p>`;
    }
    h += `<details class="more"><summary>看全部 ${results.length} 種洗法</summary><ol class="rank">`;
    results.forEach((r, i) => {
        h += `<li class="${i === 0 ? "best" : ""}">
            <div class="rank-name">${E.LOCK_STRATEGIES[r.strategy]}<span class="tag ${r.keepHigh ? "hi" : ""}">${E.KEEP_POLICIES[+r.keepHigh]}</span></div>
            ${r.avg === null ? `<div class="rank-num">洗不到</div>` : `
            <div class="bar"><i style="width:${(r.avg / max * 100).toFixed(1)}%"></i></div>
            <div class="rank-num"><b>${r.avg.toFixed(1)}</b> 顆<small>中位數 ${r.median}，九成在 ${r.p90} 顆內</small></div>`}
        </li>`;
    });
    h += `</ol><p class="hint">各洗法差距在平均的 2% 以內時屬於模擬誤差。</p></details>`;
    $("calcResult").innerHTML = h;
}
$("btnCalc").onclick = runCalc;

load();
buildRef();
buildCalc();
render();
