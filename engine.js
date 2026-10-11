// 洗詞條核心邏輯（瀏覽器與 Node 共用，不碰 DOM）
(function (root) {
    const STAT_TIERS = {
        "優越代碼傷害": [9.54, 10.94, 12.34, 13.75, 15.15, 16.55, 17.95, 19.35, 20.75, 22.15, 23.56, 24.96, 26.36, 27.76, 29.16],
        "命中率": [4.77, 5.47, 6.18, 6.88, 7.59, 8.29, 8.99, 9.70, 10.40, 11.11, 11.81, 12.51, 13.22, 13.92, 14.63],
        "最大彈藥數": [27.84, 31.93, 36.05, 40.16, 44.28, 48.39, 52.50, 56.60, 60.71, 64.82, 68.93, 73.04, 77.15, 81.26, 85.37],
        "攻擊力": [4.77, 5.47, 6.18, 6.88, 7.59, 8.29, 8.99, 9.70, 10.40, 11.11, 11.81, 12.51, 13.22, 13.92, 14.63],
        "蓄力傷害": [4.77, 5.47, 6.18, 6.88, 7.59, 8.29, 8.99, 9.70, 10.40, 11.11, 11.81, 12.51, 13.22, 13.92, 14.63],
        "蓄力速度": [1.98, 2.28, 2.57, 2.86, 3.16, 3.45, 3.75, 4.04, 4.33, 4.63, 4.92, 5.22, 5.51, 5.80, 6.09],
        "暴擊傷害": [6.64, 7.62, 8.60, 9.58, 10.56, 11.54, 12.52, 13.50, 14.48, 15.46, 16.44, 17.42, 18.40, 19.38, 20.36],
        "暴擊率": [2.30, 2.64, 2.98, 3.32, 3.66, 4.00, 4.34, 4.68, 5.02, 5.34, 5.70, 6.04, 6.38, 6.72, 7.07],
        "防禦力": [4.77, 5.47, 6.18, 6.88, 7.59, 8.29, 8.99, 9.70, 10.40, 11.11, 11.81, 12.51, 13.22, 13.92, 14.63]
    };
    const TYPES = Object.keys(STAT_TIERS);
    const WEIGHTS = [0.10, 0.12, 0.12, 0.10, 0.12, 0.12, 0.12, 0.10, 0.10];
    const SLOT_P = [1.0, 0.5, 0.3];
    // 1~5 階各 12%、6~10 階各 7%、11~15 階各 1%
    const TIER_P = [0, .12, .12, .12, .12, .12, .07, .07, .07, .07, .07, .01, .01, .01, .01, .01];
    const EMPTY = -1;

    function rollTier() {
        const r = Math.random();
        if (r < 0.60) return 1 + ((r / 0.12) | 0);
        if (r < 0.95) return 6 + (((r - 0.60) / 0.07) | 0);
        return Math.min(15, 11 + (((r - 0.95) / 0.01) | 0));
    }

    function rollType(usedMask) {
        let total = 0;
        for (let i = 0; i < 9; i++) if (!(usedMask >> i & 1)) total += WEIGHTS[i];
        let r = Math.random() * total;
        let last = EMPTY;
        for (let i = 0; i < 9; i++) {
            if (usedMask >> i & 1) continue;
            last = i;
            r -= WEIGHTS[i];
            if (r < 0) return i;
        }
        return last;
    }

    function lockedMask(lines, locked) {
        let m = 0;
        for (let i = 0; i < 3; i++) if (locked[i] && lines[i].t !== EMPTY) m |= 1 << lines[i].t;
        return m;
    }

    // 效果變更：未鎖定的槽位重抽「有無 / 種類 / 階級」。
    // exclude=true 時套用新機制：結果與目前完全相同就重抽；
    // 但未鎖定槽位全空的結果不受保護（官方：空槽位仍可能維持空）。
    function rollEffect(lines, locked, exclude) {
        const base = lockedMask(lines, locked);
        for (let guard = 0; guard < 1000; guard++) {
            const out = [];
            let used = base, same = true, allEmpty = true;
            for (let i = 0; i < 3; i++) {
                if (locked[i]) { out.push(lines[i]); continue; }
                let n;
                if (Math.random() < SLOT_P[i]) {
                    const t = rollType(used);
                    used |= 1 << t;
                    n = { t, k: rollTier() };
                    allEmpty = false;
                } else n = { t: EMPTY, k: 0 };
                if (n.t !== lines[i].t || n.k !== lines[i].k) same = false;
                out.push(n);
            }
            if (!exclude || !same || allEmpty) return out;
        }
        return lines.slice();
    }

    // 數值變更：未鎖定且非空的詞條只重抽階級。新機制同樣排除「全部一樣」的結果。
    function rollValue(lines, locked, exclude) {
        let any = false;
        for (let i = 0; i < 3; i++) if (!locked[i] && lines[i].t !== EMPTY) any = true;
        if (!any) return lines.slice();
        for (;;) {
            const out = [];
            let same = true;
            for (let i = 0; i < 3; i++) {
                if (locked[i] || lines[i].t === EMPTY) { out.push(lines[i]); continue; }
                const k = rollTier();
                if (k !== lines[i].k) same = false;
                out.push({ t: lines[i].t, k });
            }
            if (!exclude || !same) return out;
        }
    }

    // 某個結果在一次「效果變更」中被抽到的原始機率（也就是保留它時被排除掉的機率）
    function massEffect(lines, locked) {
        let used = lockedMask(lines, locked), p = 1, allEmpty = true;
        for (let i = 0; i < 3; i++) {
            if (locked[i]) continue;
            const l = lines[i];
            if (l.t === EMPTY) { p *= 1 - SLOT_P[i]; continue; }
            allEmpty = false;
            let total = 0;
            for (let j = 0; j < 9; j++) if (!(used >> j & 1)) total += WEIGHTS[j];
            p *= SLOT_P[i] * (WEIGHTS[l.t] / total) * TIER_P[l.k];
            used |= 1 << l.t;
        }
        return allEmpty ? 0 : p;
    }

    function massValue(lines, locked) {
        let p = 1, any = false;
        for (let i = 0; i < 3; i++) {
            if (locked[i] || lines[i].t === EMPTY) continue;
            any = true;
            p *= TIER_P[lines[i].k];
        }
        return any ? p : 0;
    }

    // ---------- 期望計算 ----------
    const LOCK_STRATEGIES = [
        "有效詞條一出現就鎖",
        "先鎖 3 號位，再鎖 2 號位",
        "2、3 號位有效就鎖",
        "1、2 號位達標就鎖，否則先 3 後 2",
        "2 號位達標就鎖，否則先 3 後 2"
    ];
    const KEEP_POLICIES = ["一律換成新結果", "沒用的結果留機率高的"];

    // targets: 長度 9 的陣列，0 = 不要，1~15 = 最低階級
    function simulate(cfg) {
        const { strategy, keepHigh, init, targets, need, runs, exclude } = cfg;
        const LIMIT = 10000;
        const okType = l => l.t !== EMPTY && targets[l.t] > 0;
        const okTier = l => l.t !== EMPTY && targets[l.t] > 0 && l.k >= targets[l.t];
        const count = (ls, f) => (f(ls[0]) ? 1 : 0) + (f(ls[1]) ? 1 : 0) + (f(ls[2]) ? 1 : 0);
        const nLocked = lk => (lk[0] ? 1 : 0) + (lk[1] ? 1 : 0) + (lk[2] ? 1 : 0);

        // 回傳這個策略想新鎖的槽位
        function wants(ls, lk) {
            const w = [];
            const t = i => !lk[i] && okType(ls[i]);
            const tt = i => !lk[i] && okTier(ls[i]);
            const three2 = () => { if (t(2)) w.push(2); else if (lk[2] && t(1)) w.push(1); };
            switch (strategy) {
                case 0: for (let i = 0; i < 3; i++) if (t(i)) w.push(i); break;
                case 1: three2(); break;
                case 2: for (let i = 1; i < 3; i++) if (t(i)) w.push(i); break;
                case 3: for (let i = 0; i < 2; i++) if (tt(i)) w.push(i); if (!w.length) three2(); break;
                case 4: if (tt(1)) w.push(1); else three2(); break;
            }
            return w;
        }

        const costs = [];
        let fails = 0;
        for (let it = 0; it < runs; it++) {
            let ls = init.map(l => ({ t: l.t, k: l.k }));
            const lk = init.map(l => !!l.locked && l.t !== EMPTY);
            let used = 0;
            const lock = i => { used += nLocked(lk) === 0 ? 2 : 3; lk[i] = true; };

            // 第一階段：效果變更，湊齊種類
            while (count(ls, okType) < need && used < LIMIT) {
                for (const i of wants(ls, lk)) if (nLocked(lk) < 2) lock(i);
                used += 1 + nLocked(lk);
                const nw = rollEffect(ls, lk, exclude);
                let take = true;
                if (keepHigh && count(nw, okType) < need && wants(nw, lk).length === 0) {
                    take = massEffect(nw, lk) >= massEffect(ls, lk);
                }
                if (take) ls = nw;
            }

            // 第二階段：數值變更，把階級洗到目標
            if (count(ls, okType) >= need) {
                for (let i = 0; i < 3; i++) if (lk[i] && !okTier(ls[i])) lk[i] = false;
                while (count(ls, okTier) < need && used < LIMIT) {
                    for (let i = 0; i < 3; i++) if (!lk[i] && okTier(ls[i]) && nLocked(lk) < 2) lock(i);
                    used += 1 + nLocked(lk);
                    const nw = rollValue(ls, lk, exclude);
                    let take = true;
                    if (keepHigh && count(nw, okTier) <= count(ls, okTier)) {
                        take = massValue(nw, lk) >= massValue(ls, lk);
                    }
                    if (take) ls = nw;
                }
            }

            if (count(ls, okTier) >= need && used < LIMIT) costs.push(used); else fails++;
        }

        if (!costs.length) return { avg: null, median: null, p90: null, fails };
        costs.sort((a, b) => a - b);
        const sum = costs.reduce((a, b) => a + b, 0);
        return {
            avg: sum / costs.length,
            median: costs[costs.length >> 1],
            p90: costs[Math.min(costs.length - 1, Math.floor(costs.length * 0.9))],
            fails
        };
    }

    const api = { STAT_TIERS, TYPES, WEIGHTS, SLOT_P, TIER_P, EMPTY, rollTier, rollType, rollEffect, rollValue, massEffect, massValue, simulate, LOCK_STRATEGIES, KEEP_POLICIES };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
