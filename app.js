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
const STAT_TYPES = Object.keys(STAT_TIERS);
const STAT_WEIGHTS = [0.10, 0.12, 0.12, 0.10, 0.12, 0.12, 0.12, 0.10, 0.10];
const SLOT_PROBS = [1.0, 0.5, 0.3];

function randomChoice(items, weights) {
    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let cum = 0;
    for(let i = 0; i < items.length; i++) {
        cum += weights[i];
        if (r < cum) return items[i];
    }
    return items[items.length - 1];
}

function getRandomType(exclude = []) {
    let available = [];
    let weights = [];
    for(let i=0; i<STAT_TYPES.length; i++) {
        if (!exclude.includes(STAT_TYPES[i])) {
            available.push(STAT_TYPES[i]);
            weights.push(STAT_WEIGHTS[i]);
        }
    }
    if (available.length === 0) return "空詞條";
    return randomChoice(available, weights);
}

function rollTier(isAwaken = false) {
    if (isAwaken) return 11;
    let r = Math.random();
    if (r < 0.60) return Math.floor(Math.random() * 5) + 1;
    else if (r < 0.95) return Math.floor(Math.random() * 5) + 6;
    else return Math.floor(Math.random() * 5) + 11;
}

function formatStat(type, tier) {
    if (type === "空詞條" || tier === 0) return "—";
    return `[${type}] ${STAT_TIERS[type][tier-1]}% (${tier}階)`;
}

// Global state
let totalStones = 0;
let totalKeys = 0;

let equipmentData = [
    { name: "頭", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] },
    { name: "甲", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] },
    { name: "手", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] },
    { name: "鞋", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] }
];

function canAfford(reqStones, reqKeys) {
    let inputStones = parseInt(document.getElementById('inputStones').value);
    let inputKeys = parseInt(document.getElementById('inputKeys').value);
    
    if (reqStones > 0 && !isNaN(inputStones) && inputStones > 0) {
        if (inputStones - totalStones - reqStones < 0) {
            alert("你沒石頭了餓阿");
            return false;
        }
    }
    if (reqKeys > 0 && !isNaN(inputKeys) && inputKeys > 0) {
        if (inputKeys - totalKeys - reqKeys < 0) {
            alert("你沒鑰匙了餓阿");
            return false;
        }
    }
    return true;
}

function addCost(stones, keys) {
    totalStones += stones;
    totalKeys += keys;
    updateTopBar();
}

function updateTopBar() {
    let rawStones = document.getElementById('inputStones').value.trim();
    let rawKeys = document.getElementById('inputKeys').value.trim();
    
    // Toggle Lock Overlay
    let overlay = document.getElementById('lockOverlay');
    if (rawStones !== "" && rawKeys !== "") {
        overlay.style.display = "none";
    } else {
        overlay.style.display = "flex";
    }

    let inputStones = parseInt(rawStones);
    let inputKeys = parseInt(rawKeys);
    
    let elStones = document.getElementById('displayStones');
    let elKeys = document.getElementById('displayKeys');

    if (!isNaN(inputStones) && inputStones > 0) {
        elStones.innerHTML = `剩餘 <span class="red-text">${inputStones - totalStones}</span> (耗: ${totalStones})`;
    } else {
        elStones.innerHTML = `已耗石頭: <span class="red-text">${totalStones}</span>`;
    }

    if (!isNaN(inputKeys) && inputKeys > 0) {
        elKeys.innerHTML = `剩餘 <span class="red-text">${inputKeys - totalKeys}</span> (耗: ${totalKeys})`;
    } else {
        elKeys.innerHTML = `已耗鑰匙: <span class="red-text">${totalKeys}</span>`;
    }
}

document.getElementById('inputStones').addEventListener('input', updateTopBar);
document.getElementById('inputKeys').addEventListener('input', updateTopBar);

function renderUI() {
    let container = document.getElementById('equipmentContainer');
    container.innerHTML = '';
    equipmentData.forEach((eq, eqIdx) => {
        let div = document.createElement('div');
        div.className = 'card';
        
        let header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <div class="card-title">${eq.name}</div>
            <div class="card-actions">
                <button onclick="doReset(${eqIdx})" class="btn-reset">重置</button>
                <button onclick="doAwaken(${eqIdx})" class="btn-awaken" ${eq.awakened ? 'disabled' : ''}>開光</button>
            </div>
        `;
        div.appendChild(header);

        for (let i = 0; i < 3; i++) {
            let statRow = document.createElement('div');
            statRow.className = 'stat-row';
            
            let t = eq.stats[i].type;
            let tier = eq.stats[i].tier;
            
            let statClass = "stat-box";
            if (t !== "空詞條" && tier > 0) {
                if (tier === 15) statClass += " tier-max";
                else if (tier >= 12) statClass += " tier-high";
            }
            
            let stoneDisabled = eq.keyLocks[i] ? 'disabled' : '';
            let keyDisabled = eq.stoneLocks[i] ? 'disabled' : '';
            
            statRow.innerHTML = `
                <div class="${statClass}">${formatStat(t, tier)}</div>
                <div class="locks">
                    <label style="${eq.keyLocks[i] ? 'opacity:0.5; pointer-events:none;' : ''}">
                        <input type="checkbox" id="stone_${eqIdx}_${i}" ${eq.stoneLocks[i] ? 'checked' : ''} ${stoneDisabled} onchange="toggleStone(${eqIdx}, ${i})">
                        石頭
                    </label>
                    <label style="${eq.stoneLocks[i] ? 'opacity:0.5; pointer-events:none;' : ''}">
                        <input type="checkbox" id="key_${eqIdx}_${i}" ${eq.keyLocks[i] ? 'checked' : ''} ${keyDisabled} onchange="toggleKey(${eqIdx}, ${i})">
                        鑰匙
                    </label>
                </div>
            `;
            div.appendChild(statRow);
        }

        let btnRow = document.createElement('div');
        btnRow.className = 'action-buttons';
        btnRow.innerHTML = `
            <button class="btn-effect" onclick="doRerollEffect(${eqIdx})">效果變更</button>
            <button class="btn-value" onclick="doRerollValue(${eqIdx})">%重新設定數值</button>
        `;
        div.appendChild(btnRow);
        
        container.appendChild(div);
    });
    updateSummary();
}

function resetEverything() {
    if (!confirm("確定要重置所有裝備，並清空所有石頭與鑰匙數量嗎？")) return;
    
    document.getElementById('inputStones').value = '';
    document.getElementById('inputKeys').value = '';
    
    totalStones = 0;
    totalKeys = 0;
    
    equipmentData = [
        { name: "頭", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] },
        { name: "甲", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] },
        { name: "手", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] },
        { name: "鞋", awakened: false, stats: Array(3).fill().map(() => ({type: "空詞條", tier: 0})), stoneLocks: [false,false,false], keyLocks: [false,false,false] }
    ];
    
    updateTopBar();
    renderUI();
}

function doReset(eqIdx) {
    equipmentData[eqIdx].awakened = false;
    equipmentData[eqIdx].stats = Array(3).fill().map(() => ({type: "空詞條", tier: 0}));
    equipmentData[eqIdx].stoneLocks = [false, false, false];
    equipmentData[eqIdx].keyLocks = [false, false, false];
    renderUI();
}

function doAwaken(eqIdx) {
    if (equipmentData[eqIdx].awakened) return;
    if (!canAfford(1, 0)) return;
    addCost(1, 0);
    equipmentData[eqIdx].awakened = true;
    let usedTypes = [];
    for(let i=0; i<3; i++) {
        if(Math.random() < SLOT_PROBS[i]) {
            let newT = getRandomType(usedTypes);
            usedTypes.push(newT);
            equipmentData[eqIdx].stats[i] = {type: newT, tier: 11};
        }
    }
    renderUI();
}

function toggleStone(eqIdx, slotIdx) {
    let eq = equipmentData[eqIdx];
    let cb = document.getElementById(`stone_${eqIdx}_${slotIdx}`);
    if (cb.checked) {
        let lockedCount = eq.stoneLocks.filter(v=>v).length + eq.keyLocks.filter(v=>v).length;
        let cost = (lockedCount === 0) ? 2 : 3;
        
        if (!canAfford(cost, 0)) { cb.checked = false; return; }
        if (confirm(`是否要鎖定詞條，需要石頭 ${cost} 個`)) {
            addCost(cost, 0);
            eq.stoneLocks[slotIdx] = true;
            renderUI();
        } else {
            cb.checked = false;
        }
    } else {
        if (confirm("是否確定要解除鎖定？")) {
            eq.stoneLocks[slotIdx] = false;
            renderUI();
        } else {
            cb.checked = true;
        }
    }
}

function toggleKey(eqIdx, slotIdx) {
    let eq = equipmentData[eqIdx];
    let cb = document.getElementById(`key_${eqIdx}_${slotIdx}`);
    if (cb.checked) {
        let lockedCount = eq.stoneLocks.filter(v=>v).length + eq.keyLocks.filter(v=>v).length;
        let cost = (lockedCount === 0) ? 20 : 30;
        
        if (!canAfford(0, cost)) { cb.checked = false; return; }
        if (confirm(`是否要鎖定詞條，需要鑰匙 ${cost} 個`)) {
            addCost(0, cost);
            eq.keyLocks[slotIdx] = true;
            renderUI();
        } else {
            cb.checked = false;
        }
    } else {
        if (confirm("是否確定要解除鎖定？")) {
            eq.keyLocks[slotIdx] = false;
            renderUI();
        } else {
            cb.checked = true;
        }
    }
}

let pendingReroll = null;

function showModal(title, oldStats, newStats, onComplete) {
    document.getElementById('modalTitle').innerText = title;
    
    let oldContainer = document.getElementById('modalOldStats');
    let newContainer = document.getElementById('modalNewStats');
    oldContainer.innerHTML = '';
    newContainer.innerHTML = '';
    
    for(let i=0; i<3; i++) {
        let t1 = oldStats[i].type; let tier1 = oldStats[i].tier;
        let d1 = document.createElement('div');
        d1.className = "stat-box" + (tier1 === 15 ? " tier-max" : (tier1 >= 12 ? " tier-high" : ""));
        d1.innerText = formatStat(t1, tier1);
        oldContainer.appendChild(d1);
        
        let t2 = newStats[i].type; let tier2 = newStats[i].tier;
        let changed = (t1 !== t2 || tier1 !== tier2);
        let d2 = document.createElement('div');
        d2.className = "stat-box" + (tier2 === 15 ? " tier-max" : (tier2 >= 12 ? " tier-high" : ""));
        if (changed && t2 !== "空詞條") d2.classList.add('changed-highlight');
        d2.innerText = formatStat(t2, tier2);
        newContainer.appendChild(d2);
    }
    
    document.getElementById('modalOverlay').classList.add('active');
    pendingReroll = onComplete;
}

function resolveModal(replace) {
    document.getElementById('modalOverlay').classList.remove('active');
    if (pendingReroll) pendingReroll(replace);
    pendingReroll = null;
}

function doRerollEffect(eqIdx) {
    let eq = equipmentData[eqIdx];
    if (!eq.awakened) return;
    let lockedCount = 0;
    for(let i=0; i<3; i++) if(eq.stoneLocks[i] || eq.keyLocks[i]) lockedCount++;
    if (lockedCount > 2) return;
    
    let stoneCost = 1 + lockedCount;
    if (!canAfford(stoneCost, 0)) return;
    
    addCost(stoneCost, 0);
    
    let lockedSlots = [];
    let usedTypes = [];
    for(let i=0; i<3; i++) {
        lockedSlots[i] = eq.stoneLocks[i] || eq.keyLocks[i];
        if (lockedSlots[i] && eq.stats[i].type !== "空詞條") usedTypes.push(eq.stats[i].type);
    }
    
    let newStats = JSON.parse(JSON.stringify(eq.stats));
    for(let i=0; i<3; i++) {
        if (!lockedSlots[i]) {
            if (Math.random() < SLOT_PROBS[i]) {
                let newT = getRandomType(usedTypes);
                usedTypes.push(newT);
                newStats[i] = {type: newT, tier: rollTier()};
            } else {
                newStats[i] = {type: "空詞條", tier: 0};
            }
        }
    }
    
    showModal("效果變更確認", eq.stats, newStats, (replace) => {
        if (replace) eq.stats = newStats;
        eq.keyLocks = [false, false, false];
        renderUI();
    });
}

function doRerollValue(eqIdx) {
    let eq = equipmentData[eqIdx];
    if (!eq.awakened) return;
    let lockedCount = 0;
    for(let i=0; i<3; i++) if(eq.stoneLocks[i] || eq.keyLocks[i]) lockedCount++;
    if (lockedCount > 2) return;
    
    let stoneCost = 1 + lockedCount;
    if (!canAfford(stoneCost, 0)) return;
    addCost(stoneCost, 0);
    
    let lockedSlots = [];
    for(let i=0; i<3; i++) lockedSlots[i] = eq.stoneLocks[i] || eq.keyLocks[i];
    
    let newStats = JSON.parse(JSON.stringify(eq.stats));
    for(let i=0; i<3; i++) {
        if (newStats[i].type !== "空詞條" && !lockedSlots[i]) {
            newStats[i].tier = rollTier();
        }
    }
    
    showModal("數值變更確認", eq.stats, newStats, (replace) => {
        if (replace) eq.stats = newStats;
        eq.keyLocks = [false, false, false];
        renderUI();
    });
}

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById('nav-' + tabId).classList.add('active');
    
    // Toggle top bar visibility
    let topBar = document.getElementById('topBar');
    if (tabId === 'tab-sim') {
        topBar.style.display = 'block';
    } else {
        topBar.style.display = 'none';
    }
}

function openSummaryModal() {
    updateSummary();
    document.getElementById('summaryModalOverlay').classList.add('active');
}

function closeSummaryModal() {
    document.getElementById('summaryModalOverlay').classList.remove('active');
}

function updateSummary() {
    let sums = {};
    STAT_TYPES.forEach(t => sums[t] = 0);
    
    equipmentData.forEach(eq => {
        eq.stats.forEach(st => {
            if (st.type !== "空詞條") {
                sums[st.type] += STAT_TIERS[st.type][st.tier-1];
            }
        });
    });
    
    let score = 0;
    score += sums["優越代碼傷害"] * 0.6;
    score += sums["攻擊力"] * 0.8;
    score += sums["最大彈藥數"] * 0.05;
    score += sums["蓄力速度"] * 0.8;
    score += sums["暴擊傷害"] * 0.2;
    score += sums["暴擊率"] * 0.6;
    score += sums["蓄力傷害"] * 0.1;

    let title = "";
    let quote = "";
    let titleColor = "#E88D38";
    
    if (score >= 110) {
        title = "共鬥天帝"; quote = "詞條掛發我，求求了"; titleColor = "#FF3333";
    } else if (score >= 95) {
        title = "個突皇帝"; quote = "我命令你馬上上號帶我前百"; titleColor = "#FF8800";
    } else if (score >= 80) {
        title = "凱瑞大C"; quote = "共鬥亮出戰力，其他人都要自覺跪下"; titleColor = "#E88D38";
    } else if (score >= 60) {
        title = "也就那樣"; quote = "下次會戰前記得提升不然優化你"; titleColor = "#1CB0F6";
    } else if (score >= 40) {
        title = "你洗了嗎"; quote = "不會吧你還有錢吧去買石頭阿"; titleColor = "#5E5545";
    } else if (score >= 20) {
        title = "路邊一條"; quote = "記得把輔助技能拉滿，自覺一點"; titleColor = "#888888";
    } else {
        title = ":)"; quote = ":)"; titleColor = "#AAAAAA";
    }
    
    document.getElementById('scoreTitle').innerText = title;
    document.getElementById('scoreTitle').style.color = titleColor;
    document.getElementById('scoreQuote').innerHTML = `${quote}<br><br><span style="color:#5E5545;font-weight:bold;">這輪總共消耗：${totalStones} 顆石頭 / ${totalKeys} 把鑰匙</span>`;
    
    let container = document.getElementById('summaryContent');
    container.innerHTML = '';
    
    let hasStats = false;
    STAT_TYPES.forEach(t => {
        if (sums[t] > 0) {
            hasStats = true;
            let div = document.createElement('div');
            div.className = "summary-item";
            div.innerHTML = `<span>${t}</span> <span>+${sums[t].toFixed(2)}%</span>`;
            container.appendChild(div);
        }
    });
    
    if (!hasStats) {
        container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">目前沒有任何詞條</div>';
    }
}

function initReference() {
    let container = document.getElementById('referenceContent');
    container.innerHTML = '';
    STAT_TYPES.forEach(t => {
        let div = document.createElement('div');
        div.className = "summary-item";
        div.innerHTML = `<span>${t}</span> <span>${STAT_TIERS[t][0].toFixed(2)}% ~ ${STAT_TIERS[t][14].toFixed(2)}%</span>`;
        container.appendChild(div);
    });
}

function buildCalculatorUI() {
    let currHtml = '';
    for(let i=0; i<3; i++) {
        let typeOpts = '<option value="空詞條">空詞條</option>' + STAT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
        let tierOpts = '';
        for(let j=1; j<=15; j++) tierOpts += `<option value="${j}" ${j===11?'selected':''}>${j}</option>`;
        
        currHtml += `
        <div class="calc-row">
            <span style="font-size:14px; font-weight:bold; margin-right:8px; white-space:nowrap;">槽位${i+1}</span>
            <select id="calc_cur_type_${i}" style="flex:1; min-width:0;">${typeOpts}</select>
            <select id="calc_cur_tier_${i}" style="margin-left:5px;">${tierOpts}</select> <span style="font-size:12px; margin-left:3px; white-space:nowrap;">階</span>
            <label style="font-size:14px; margin-left:8px; white-space:nowrap; display:flex; align-items:center;">
                <input type="checkbox" id="calc_cur_lock_${i}" style="margin-right:2px; transform:scale(1.2);"> 鎖
            </label>
        </div>`;
    }
    document.getElementById('calcCurrentContainer').innerHTML = currHtml;

    let tgtHtml = '';
    for(let i=0; i<6; i++) {
        let typeOpts = '<option value="空詞條">空詞條</option>' + STAT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
        let tierOpts = '';
        for(let j=1; j<=15; j++) tierOpts += `<option value="${j}" ${j===11?'selected':''}>${j}</option>`;
        
        tgtHtml += `
        <div class="calc-row">
            <span style="font-size:14px; font-weight:bold; margin-right:8px;">目標${i+1}</span>
            <select id="calc_tgt_type_${i}" style="flex:1;">${typeOpts}</select>
            <select id="calc_tgt_tier_${i}" style="margin-left:5px;">${tierOpts}</select> <span style="font-size:12px; margin-left:3px;">階</span>
        </div>`;
    }
    document.getElementById('calcTargetContainer').innerHTML = tgtHtml;
}

function isValidType(statType, targets) {
    if (statType === "空詞條") return false;
    return targets.some(tgt => tgt.type === statType);
}

function isValidTypeTier(statType, statTier, targets) {
    if (statType === "空詞條") return false;
    return targets.some(tgt => tgt.type === statType && statTier >= tgt.tier);
}

function checkTypesReady(state, targets) {
    if (targets.length === 0) return true;
    let count = 0;
    for (let s of state) {
        if (isValidType(s.type, targets)) count++;
    }
    return count >= targets.length;
}

function checkFullGraduated(state, targets) {
    if (targets.length === 0) return true;
    let count = 0;
    for (let s of state) {
        if (isValidTypeTier(s.type, s.tier, targets)) count++;
    }
    return count >= targets.length;
}

// Phase 1: Lock by TYPE match (ignore tier)
function applyPhase1Strategy(strategyId, state, targets) {
    switch(strategyId) {
        case 0: // 只要有有效詞條就鎖
            for (let i=0; i<3; i++) {
                if (!state[i].locked && isValidType(state[i].type, targets)) {
                    state[i].locked = true;
                }
            }
            break;
        case 1: // 先鎖三號詞條再鎖二號
            if (!state[2].locked && isValidType(state[2].type, targets)) {
                state[2].locked = true;
            } else if (state[2].locked && !state[1].locked && isValidType(state[1].type, targets)) {
                state[1].locked = true;
            }
            break;
        case 2: // 二三號詞條只要有效就鎖
            for (let i=1; i<3; i++) {
                if (!state[i].locked && isValidType(state[i].type, targets)) {
                    state[i].locked = true;
                }
            }
            break;
        case 3: // 一二號位有效且高於目標數值時鎖，否則先鎖3再鎖2
            {
                let didLock = false;
                for (let i=0; i<2; i++) {
                    if (!state[i].locked && isValidTypeTier(state[i].type, state[i].tier, targets)) {
                        state[i].locked = true;
                        didLock = true;
                    }
                }
                if (!didLock) {
                    if (!state[2].locked && isValidType(state[2].type, targets)) {
                        state[2].locked = true;
                    } else if (state[2].locked && !state[1].locked && isValidType(state[1].type, targets)) {
                        state[1].locked = true;
                    }
                }
            }
            break;
        case 4: // 二號位有效且高於目標數值時鎖，否則先鎖3再鎖2
            {
                let didLock = false;
                if (!state[1].locked && isValidTypeTier(state[1].type, state[1].tier, targets)) {
                    state[1].locked = true;
                    didLock = true;
                }
                if (!didLock) {
                    if (!state[2].locked && isValidType(state[2].type, targets)) {
                        state[2].locked = true;
                    } else if (state[2].locked && !state[1].locked && isValidType(state[1].type, targets)) {
                        state[1].locked = true;
                    }
                }
            }
            break;
    }
}

const STRATEGY_NAMES = [
    "只要有有效詞條就鎖",
    "先鎖三號詞條再鎖二號",
    "二三號詞條只要有效就鎖",
    "一二號位有效且高於目標數值時鎖，否則先鎖3再鎖2",
    "二號位有效且高於目標數值時鎖，否則先鎖3再鎖2"
];

function runOneStrategy(strategyId, initialState, targets, simCount) {
    let totalStones = 0;
    let successCount = 0;
    let needTierCheck = targets.some(t => t.tier > 1);

    for (let iter = 0; iter < simCount; iter++) {
        let state = initialState.map(s => ({...s}));
        let stonesUsed = 0;

        // === Phase 1: Effect Reroll - find correct TYPES ===
        while (!checkTypesReady(state, targets) && stonesUsed < 10000) {
            applyPhase1Strategy(strategyId, state, targets);

            let lockedCount = state.filter(s => s.locked).length;
            if (lockedCount > 2) break;

            stonesUsed += 1 + lockedCount;
            let usedTypes = state.filter(s => s.locked && s.type !== "空詞條").map(s => s.type);

            for (let i = 0; i < 3; i++) {
                if (!state[i].locked) {
                    if (Math.random() < SLOT_PROBS[i]) {
                        let newType = getRandomType(usedTypes);
                        usedTypes.push(newType);
                        state[i] = { type: newType, tier: rollTier(), locked: false };
                    } else {
                        state[i] = { type: '空詞條', tier: 0, locked: false };
                    }
                }
            }
        }

        // === Phase 2: Value Reroll - reach target TIER ===
        if (needTierCheck && checkTypesReady(state, targets) && !checkFullGraduated(state, targets)) {
            // Unlock all slots for Phase 2
            for (let i = 0; i < 3; i++) state[i].locked = false;

            while (!checkFullGraduated(state, targets) && stonesUsed < 10000) {
                // Lock slots that already meet tier target
                for (let i = 0; i < 3; i++) {
                    if (!state[i].locked && isValidTypeTier(state[i].type, state[i].tier, targets)) {
                        state[i].locked = true;
                    }
                }

                let lockedCount = state.filter(s => s.locked).length;
                if (lockedCount > 2) break;
                if (checkFullGraduated(state, targets)) break;

                stonesUsed += 1 + lockedCount;

                // Value reroll: only change TIER, keep TYPE
                for (let i = 0; i < 3; i++) {
                    if (!state[i].locked && isValidType(state[i].type, targets)) {
                        state[i].tier = rollTier();
                    }
                }
            }
        }

        if (stonesUsed < 10000 && checkFullGraduated(state, targets)) {
            totalStones += stonesUsed;
            successCount++;
        }
    }

    if (successCount === 0) return null;
    return (totalStones / successCount).toFixed(1);
}

function runSimulation() {
    let targets = [];
    for (let i = 0; i < 6; i++) {
        let type = document.getElementById(`calc_tgt_type_${i}`).value;
        let tier = parseInt(document.getElementById(`calc_tgt_tier_${i}`).value);
        if (type !== "空詞條") targets.push({ type, tier });
    }

    let resultCard = document.getElementById('calcResultCard');
    let resultList = document.getElementById('calcResultList');

    if (targets.length === 0) {
        resultCard.style.display = 'block';
        resultList.innerHTML = '<div style="text-align:center; color:#FF3333; font-weight:bold;">請至少設定一個目標詞條</div>';
        return;
    }

    let initialState = [];
    for (let i = 0; i < 3; i++) {
        let type = document.getElementById(`calc_cur_type_${i}`).value;
        let tier = parseInt(document.getElementById(`calc_cur_tier_${i}`).value);
        let locked = document.getElementById(`calc_cur_lock_${i}`).checked;
        initialState.push({ type: type, tier: type === "空詞條" ? 0 : tier, locked: locked });
    }

    let simCount = parseInt(document.getElementById('calcSimCount').value);

    resultCard.style.display = 'block';
    resultList.innerHTML = '<div style="text-align:center; color:#5E5545; font-weight:bold;">計算中...</div>';

    setTimeout(() => {
        let results = [];
        for (let sid = 0; sid < 5; sid++) {
            let avg = runOneStrategy(sid, initialState, targets, simCount);
            results.push({ name: STRATEGY_NAMES[sid], avg: avg });
        }

        // Sort by avg stones (lowest first), nulls last
        results.sort((a, b) => {
            if (a.avg === null) return 1;
            if (b.avg === null) return -1;
            return parseFloat(a.avg) - parseFloat(b.avg);
        });

        let html = '';
        results.forEach((r, idx) => {
            let bgColor = idx === 0 ? '#d4edda' : '#F7F4EB';
            let textColor = idx === 0 ? '#155724' : '#5E5545';
            let badge = idx === 0 ? ' (最省)' : '';
            let avgText = r.avg !== null ? `${r.avg} 顆石頭` : '無法畢業';
            let avgColor = r.avg !== null ? '#1CB0F6' : '#FF3333';

            html += `<div style="background:${bgColor}; padding:10px; margin-bottom:8px; border-radius:6px;">
                <div style="font-size:13px; color:${textColor}; font-weight:bold; margin-bottom:4px;">${idx + 1}. ${r.name}${badge}</div>
                <div style="font-size:16px; color:${avgColor}; font-weight:bold;">${avgText}</div>
            </div>`;
        });

        resultList.innerHTML = html;
    }, 50);
}

window.onload = () => {
    initReference();
    buildCalculatorUI();
    renderUI();
    updateTopBar();
};

