// ============================================================================
// CYCLE 12: AGE OF DOMINION — MAIN APPLICATION CONTROLLER (v3 PWA)
// Interactive Visual Novel + 3D Galaxy Strategy + Real-Time 3D Arena +
// 72-Character 3D Inspector + Diplomacy / Lore Codex / Offline Save System
// ============================================================================

import { META, FACTIONS, PLAYABLE, SUPERWEAPONS, SPECIES, TIMELINE } from "./data/lore.js";
import { SECTORS, SECTOR_BY_ID, findLocation, SECTOR_KIND_LABEL, BODY_KIND_LABEL, PLACE_KIND_LABEL } from "./data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID, RELATIONS, RACE_STYLE } from "./data/characters.js";
import { CHAPTERS, CHAPTER_BY_ID, buildEncounterScene } from "./data/story.js";
import { GameState, ACHIEVEMENTS } from "./game/state.js";
import { UniverseEngine3D } from "./render/engine.js";
import { getPortraitUrl, moodLabel } from "./render/portraits.js";
import { SFX } from "./render/sfx.js";

const ESC = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

class Cycle12App {
  constructor() {
    this.game = new GameState();
    const hadAutoSave = this.game.loadFromSlot("auto");

    this.currentMode = "vn";
    this.selectedSectorId = "sylvalon";
    this.selectedBodyId = null;
    this.inspectedCharId = "arisia";
    this.codexTab = "diplomacy";

    // Visual Novel runtime
    this.activeEncounterScript = null;
    this.typeTimer = null;
    this.vnAutoPlay = false;
    this.vnAutoTimer = null;
    this.isTyping = false;
    this.fullVnText = "";
    this.lastAppliedNodeKey = null;
    this.pendingStoryBattle = null;
    this.pendingInvasionSectorId = null;

    // Floating label DOM pool
    this.labelDomCache = new Map();
    this.deferredInstallPrompt = null;

    // Khởi tạo Three.js 3D Engine
    this.engine = new UniverseEngine3D("canvas3d-container", {
      onSectorSelect: (secId) => this.selectSector(secId, true),
      onBodySelect: (secId, bodyId) => this.selectBody(secId, bodyId),
      onCombatTick: (tick) => this.handleCombatTick(tick),
      onCombatEnd: (res) => this.handleCombatEnd(res),
      onProjectLabels: (labels) => this.renderFloatingLabels(labels),
      onFloatingDamage: (evt) => this.spawnFloatingDamage(evt)
    });

    this.registerPWA();
    this.initNavigation();
    this.initTopHUD();
    this.initVNUI();
    this.initGalaxyUI();
    this.initArenaUI();
    this.initInspectorUI();
    this.initCodexUI();

    this.engine.updateSectorColors(this.game);
    this.refreshTopResources();
    this.renderVNNode();
    this.switchMode("vn");

    if (hadAutoSave) {
      this.showToast("Đã khôi phục tiến trình", `Chu kỳ ${this.game.cycleMajor}.${this.game.cycleMinor} • ${this.game.facName(this.game.playerFaction)}`);
    } else {
      this.showToast("CYCLE 12: AGE OF DOMINION", "Sẵn sàng trải nghiệm Visual Novel & Vũ trụ 3D!");
    }

    this.startUiLoop();
  }

  // ==========================================================================
  // PWA SERVICE WORKER & APP INSTALL PROMPT
  // ==========================================================================
  registerPWA() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("SW registration skipped:", err);
      });
    }

    const installBtn = document.getElementById("btn-install-app");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      installBtn?.classList.remove("hidden");
    });

    installBtn?.addEventListener("click", async () => {
      SFX.click();
      if (!this.deferredInstallPrompt) return;
      this.deferredInstallPrompt.prompt();
      const res = await this.deferredInstallPrompt.userChoice;
      if (res.outcome === "accepted") {
        this.showToast("Đã cài App!", "CYCLE 12 đã sẵn sàng trên màn hình chính.");
        installBtn.classList.add("hidden");
      }
      this.deferredInstallPrompt = null;
    });
  }

  // ==========================================================================
  // NAVIGATION & MODE SWITCHING
  // ==========================================================================
  initNavigation() {
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.switchMode(btn.dataset.mode);
      });
    });
  }

  switchMode(mode) {
    this.currentMode = mode;

    // Sync active buttons on desktop & mobile bars
    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });

    // Toggle panels
    ["vn", "galaxy", "arena", "inspector", "codex"].forEach((m) => {
      const panel = document.getElementById(`panel-${m}`);
      if (panel) panel.classList.toggle("hidden", m !== mode);
    });

    // Clear floating galaxy labels outside galaxy mode
    if (mode !== "galaxy") {
      this.renderFloatingLabels([]);
    }

    this.engine.switchMode(mode);
    SFX.setMusicScene(mode);
    if (SFX.bgmOn && !SFX.bgmTimer) SFX.startBGM();

    if (mode === "vn") {
      const { node } = this.getActiveVNContext();
      this.engine.setVNBackdrop(node?.sector || "sylvalon");
      this.renderVNNode();
    } else if (mode === "galaxy") {
      this.engine.updateSectorColors(this.game);
      if (this.selectedSectorId) {
        this.engine.zoomToSector(this.selectedSectorId);
      } else {
        this.engine.resetGalaxyCamera();
      }
      this.renderGalaxyFactionBox();
      this.renderSectorList();
      this.renderSectorDetails();
    } else if (mode === "arena") {
      if (!this.engine.arenaState) {
        this.startConfiguredArenaMatch();
      }
    } else if (mode === "inspector") {
      this.engine.showcaseCharacter(this.inspectedCharId);
      this.renderInspectorCard();
    } else if (mode === "codex") {
      this.renderCodexTab();
    }
  }

  // ==========================================================================
  // TOP HUD & TURN PROGRESSION
  // ==========================================================================
  initTopHUD() {
    const sfxBtn = document.getElementById("btn-toggle-sfx");
    sfxBtn.textContent = SFX.muted ? "🔇" : "🔊";
    sfxBtn.addEventListener("click", () => {
      const muted = SFX.toggleMute();
      sfxBtn.textContent = muted ? "🔇" : "🔊";
      if (!muted) SFX.click();
    });

    const bgmBtn = document.getElementById("btn-toggle-bgm");
    const syncBgmBtn = () => {
      if (!bgmBtn) return;
      bgmBtn.classList.toggle("active", SFX.bgmOn);
      bgmBtn.textContent = SFX.bgmOn ? "🎶" : "🎵";
    };
    syncBgmBtn();
    bgmBtn?.addEventListener("click", () => {
      SFX.toggleBGM();
      SFX.setMusicScene(this.currentMode);
      syncBgmBtn();
      this.showToast(SFX.bgmOn ? "🎶 Đã bật nhạc nền Synth" : "🎵 Đã tắt nhạc nền", "Âm thanh biến đổi theo VN, Ngân Hà & Đấu Trường 3D.");
    });

    // Kích hoạt BGM sau cử chỉ đầu tiên nếu đang bật sẵn trong localStorage
    window.addEventListener("pointerdown", () => {
      if (SFX.bgmOn && !SFX.bgmTimer) {
        SFX.setMusicScene(this.currentMode);
        SFX.startBGM();
      }
    }, { once: true });

    document.getElementById("btn-next-turn").addEventListener("click", () => {
      const res = this.game.nextTurn();
      SFX.choice();
      this.engine.updateSectorColors(this.game);
      this.refreshTopResources();

      if (this.currentMode === "galaxy") {
        this.renderGalaxyFactionBox();
        this.renderSectorList();
        this.renderSectorDetails();
      } else if (this.currentMode === "codex") {
        this.renderCodexTab();
      }

      if (res.event) {
        SFX.alert();
        this.showToast(`⚡ ${res.event.title}`, res.event.desc);
      } else if (res.pactExpired) {
        SFX.alert();
        this.showToast("⚠️ Hiệp Ước Cursew Đã Hết Hiệu Lực!", "Ranh giới đỏ có thể bùng phát chiến tranh tổng lực bất cứ lúc nào!");
      } else {
        this.showToast(`⏩ Chu Kỳ ${res.turn}`, `Tất cả thế lực đã thu ngân sách & bình ổn lại các hệ sao.`);
      }
      this.checkAndToastAchievements();
    });
  }

  refreshTopResources() {
    const res = this.game.resources[this.game.playerFaction] || { credits: 0 };
    document.getElementById("stat-turn").textContent = `${this.game.cycleMajor}.${this.game.cycleMinor}`;
    document.getElementById("stat-credits").textContent = Number(res.credits || 0).toLocaleString("en-US");
    document.getElementById("stat-tension").textContent = `${Math.round(this.game.tension)}%`;
    const facSel = document.getElementById("active-faction-select");
    if (facSel && facSel.value !== this.game.playerFaction) {
      facSel.value = this.game.playerFaction;
    }
  }

  showToast(title, desc) {
    const el = document.getElementById("lore-toast");
    document.getElementById("lore-toast-title").textContent = title;
    document.getElementById("lore-toast-desc").textContent = desc;
    el.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add("hidden"), 4800);
  }

  checkAndToastAchievements() {
    const newly = this.game.evaluateAchievements();
    if (newly.length > 0) {
      SFX.victory();
      this.refreshTopResources();
      const first = newly[0];
      const extra = newly.length > 1 ? ` (+${newly.length - 1} thành tựu khác)` : "";
      this.showToast(`🏅 Mở khóa: ${first.title}${extra}`, `${first.desc} (+${first.rewardCr} Cr, +${first.rewardInf} Inf)`);
      if (this.currentMode === "codex" && this.codexTab === "achievements") {
        this.renderCodexTab();
      }
    }
  }

  // ==========================================================================
  // MODE 1: INTERACTIVE VISUAL NOVEL ENGINE
  // ==========================================================================
  initVNUI() {
    const chapSel = document.getElementById("vn-chapter-select");
    this.populateChapterSelect();

    chapSel.addEventListener("change", () => {
      SFX.click();
      this.activeEncounterScript = null;
      this.game.vn.currentChapterId = chapSel.value;
      this.game.vn.currentNodeId = "start";
      this.lastAppliedNodeKey = null;
      this.game.saveToSlot("auto");
      this.renderVNNode();
    });

    document.getElementById("btn-vn-auto").addEventListener("click", (e) => {
      SFX.click();
      this.vnAutoPlay = !this.vnAutoPlay;
      e.currentTarget.classList.toggle("active", this.vnAutoPlay);
      e.currentTarget.textContent = this.vnAutoPlay ? "⏸ Đang tự đọc" : "▶ Tự đọc";
      if (this.vnAutoPlay && !this.isTyping) {
        this.scheduleVNAutoAdvance();
      } else if (!this.vnAutoPlay) {
        clearTimeout(this.vnAutoTimer);
      }
    });

    document.getElementById("btn-vn-restart").addEventListener("click", () => {
      SFX.click();
      this.game.vn.currentNodeId = "start";
      this.lastAppliedNodeKey = null;
      this.game.saveToSlot("auto");
      this.renderVNNode();
      this.showToast("↺ Đã khởi động lại chương", "Bạn có thể chọn nhánh rẽ khác!");
    });

    const histModal = document.getElementById("vn-history-modal");
    document.getElementById("btn-vn-history").addEventListener("click", () => {
      SFX.click();
      const list = document.getElementById("vn-history-list");
      const items = (this.game.vn.history || []).slice().reverse();
      list.innerHTML = items.length
        ? items.map(h => `<div class="vn-history-item"><strong style="color:var(--gold);">${ESC(h.speaker)}</strong> <span class="muted">(${ESC(h.chapter)})</span><div style="margin-top:3px;">${ESC(h.text)}</div></div>`).join("")
        : `<div class="muted">Chưa có dòng thoại nào được ghi lại.</div>`;
      histModal.classList.remove("hidden");
    });
    document.getElementById("btn-close-vn-history").addEventListener("click", () => {
      SFX.click();
      histModal.classList.add("hidden");
    });

    // Click dialogue box to skip typing or advance linear node
    document.getElementById("vn-dialogue-box").addEventListener("click", (e) => {
      if (e.target.closest(".vn-choice-btn")) return;
      this.advanceVN();
    });
  }

  populateChapterSelect() {
    const sel = document.getElementById("vn-chapter-select");
    const doneSet = new Set(this.game.vn.completedChapters || []);
    let opts = CHAPTERS.map((ch) => {
      const mark = doneSet.has(ch.id) ? "✓ " : "";
      return `<option value="${ch.id}">${mark}${ESC(ch.num)}: ${ESC(ch.title)}</option>`;
    });

    if (this.activeEncounterScript) {
      opts.unshift(`<option value="__encounter__">💬 ${ESC(this.activeEncounterScript.title)}</option>`);
    }
    sel.innerHTML = opts.join("");
    sel.value = this.activeEncounterScript ? "__encounter__" : (CHAPTER_BY_ID[this.game.vn.currentChapterId] ? this.game.vn.currentChapterId : CHAPTERS[0].id);
  }

  getActiveVNContext() {
    if (this.activeEncounterScript) {
      const ch = this.activeEncounterScript;
      const nId = ch.nodes[this.game.vn.currentNodeId] ? this.game.vn.currentNodeId : "start";
      return { script: ch, isEncounter: true, nodeId: nId, node: ch.nodes[nId] };
    }

    let cId = this.game.vn.currentChapterId;
    if (!CHAPTER_BY_ID[cId]) {
      cId = CHAPTERS[0].id;
      this.game.vn.currentChapterId = cId;
    }
    const ch = CHAPTER_BY_ID[cId];
    let nId = this.game.vn.currentNodeId;
    if (!ch.nodes[nId]) {
      nId = "start";
      this.game.vn.currentNodeId = "start";
    }
    return { script: ch, isEncounter: false, nodeId: nId, node: ch.nodes[nId] };
  }

  startEncounter(charId) {
    const script = buildEncounterScene(charId, this.game);
    if (!script) return;
    this.activeEncounterScript = script;
    this.game.vn.currentNodeId = "start";
    this.lastAppliedNodeKey = null;
    this.populateChapterSelect();
    this.switchMode("vn");
  }

  renderVNNode() {
    clearTimeout(this.typeTimer);
    clearTimeout(this.vnAutoTimer);

    const { script, isEncounter, nodeId, node } = this.getActiveVNContext();
    if (!node) return;

    this.populateChapterSelect();

    const bannerEl = document.getElementById("vn-chapter-banner");
    if (bannerEl) {
      if (nodeId === "start") {
        bannerEl.textContent = script.num ? `${script.num} • ${script.title}` : script.title;
        bannerEl.classList.remove("hidden");
      } else {
        bannerEl.classList.add("hidden");
      }
    }

    // Áp dụng side-effects của node 1 lần duy nhất
    const nodeKey = `${script.id}:${nodeId}`;
    if (this.lastAppliedNodeKey !== nodeKey) {
      this.lastAppliedNodeKey = nodeKey;
      if (typeof node.effects === "function") {
        node.effects(this.game);
        this.refreshTopResources();
        this.engine.updateSectorColors(this.game);
      }
      if (node.end && !isEncounter && !this.game.vn.completedChapters.includes(script.id)) {
        this.game.vn.completedChapters.push(script.id);
        this.populateChapterSelect();
      }
      this.game.saveToSlot("auto");
      this.checkAndToastAchievements();
    }

    // Cập nhật 3D backdrop theo hệ sao của cảnh truyện
    const sec = SECTOR_BY_ID[node.sector];
    document.getElementById("vn-location-pill").textContent = `📍 ${sec ? sec.name : "Vũ Trụ Gaiastra"}${sec?.realm ? " • " + sec.realm : ""}`;
    if (this.currentMode === "vn") {
      const moodGlow = node.speaker !== "narrator" && CHAR_BY_ID[node.speaker]
        ? (RACE_STYLE[CHAR_BY_ID[node.speaker].race]?.aura || "#38bdf8")
        : "#38bdf8";
      this.engine.setVNBackdrop(node.sector || "sylvalon", moodGlow);
    }

    // Nhân vật 2 bên
    this.updateVNSprite("left", node.leftChar, node.leftMood, node.speaker);
    this.updateVNSprite("right", node.rightChar, node.rightMood, node.speaker);

    // Speaker badge
    const badge = document.getElementById("vn-speaker-badge");
    const titleEl = document.getElementById("vn-speaker-title");
    let speakerLabel = "NGƯỜI DẪN CHUYỆN";
    if (node.speaker === "narrator") {
      badge.textContent = speakerLabel;
      badge.classList.add("narrator");
      titleEl.textContent = `${script.num}: ${script.title}`;
    } else {
      const c = CHAR_BY_ID[node.speaker];
      speakerLabel = c ? c.name : node.speaker;
      badge.textContent = speakerLabel;
      badge.classList.remove("narrator");
      const fac = c ? FACTIONS[c.fac] : null;
      titleEl.textContent = c ? `${c.title} • ${fac?.name || ""}` : "";
    }

    // Văn bản đối thoại (hỗ trợ hàm động theo state)
    const rawText = typeof node.text === "function" ? node.text(this.game) : String(node.text || "");
    this.fullVnText = rawText;

    // Lưu lịch sử hội thoại nếu chưa trùng dòng vừa ghi
    const hist = this.game.vn.history;
    const last = hist[hist.length - 1];
    if (!last || last.text !== rawText || last.speaker !== speakerLabel) {
      hist.push({ speaker: speakerLabel, text: rawText, chapter: script.num || script.title });
      if (hist.length > 60) hist.shift();
    }

    // Gọi hiệu ứng đánh chữ (typewriter)
    const textEl = document.getElementById("vn-text");
    const choicesEl = document.getElementById("vn-choices");
    const hintEl = document.getElementById("vn-tap-hint");
    choicesEl.innerHTML = "";

    let idx = 0;
    this.isTyping = true;
    textEl.textContent = "";
    hintEl.textContent = "Chạm để hiện nhanh ▸";

    const stepType = () => {
      idx += 2;
      if (idx >= this.fullVnText.length) {
        this.finishTypingAndShowControls(node, isEncounter, script);
        return;
      }
      textEl.textContent = this.fullVnText.slice(0, idx);
      if (idx % 10 === 0) SFX.blip(node.speaker === "narrator" ? 380 : 520);
      this.typeTimer = setTimeout(stepType, 16);
    };
    stepType();
  }

  updateVNSprite(side, charId, mood, activeSpeaker) {
    const slot = document.getElementById(`vn-${side}-slot`);
    const img = document.getElementById(`vn-${side}-img`);
    const nameEl = document.getElementById(`vn-${side}-name`);
    const moodEl = document.getElementById(`vn-${side}-mood`);

    if (!charId || !CHAR_BY_ID[charId]) {
      slot.classList.add("hidden");
      slot.classList.remove("speaking", "dim");
      return;
    }

    const c = CHAR_BY_ID[charId];
    slot.classList.remove("hidden");
    img.src = getPortraitUrl(c);
    img.alt = c.name;
    nameEl.textContent = c.name;
    moodEl.textContent = moodLabel(mood || "neutral");

    if (activeSpeaker === charId) {
      slot.classList.add("speaking");
      slot.classList.remove("dim");
    } else {
      slot.classList.remove("speaking");
      slot.classList.add("dim");
    }
  }

  finishTypingAndShowControls(node, isEncounter, script) {
    clearTimeout(this.typeTimer);
    this.isTyping = false;
    document.getElementById("vn-text").textContent = this.fullVnText;

    const choicesEl = document.getElementById("vn-choices");
    const hintEl = document.getElementById("vn-tap-hint");
    choicesEl.innerHTML = "";

    if (node.choices && node.choices.length > 0) {
      hintEl.textContent = "Chọn một quyết định bên trên";
      const visibleChoices = node.choices.filter(ch => !ch.cond || ch.cond(this.game));
      visibleChoices.forEach((ch) => {
        const btn = document.createElement("button");
        btn.className = `vn-choice-btn ${ch.battle ? "battle-choice" : ""}`;
        btn.innerHTML = `<span>${ESC(ch.label)}</span>${ch.hint ? `<span class="vn-choice-hint">${ESC(ch.hint)}</span>` : ""}`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.choice();
          this.selectVNChoice(ch, script, isEncounter);
        });
        choicesEl.appendChild(btn);
      });
    } else if (node.end) {
      hintEl.textContent = `🏁 ${node.end.title} — ${node.end.summary}`;
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "8px";

      if (isEncounter) {
        const backBtn = document.createElement("button");
        backBtn.className = "btn-primary";
        backBtn.textContent = "↩️ Quay Lại Cốt Truyện Chính";
        backBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.click();
          this.activeEncounterScript = null;
          this.game.vn.currentNodeId = "start";
          this.lastAppliedNodeKey = null;
          this.renderVNNode();
        });
        wrap.appendChild(backBtn);

        const inspBtn = document.createElement("button");
        inspBtn.className = "btn-glass";
        inspBtn.textContent = "🌌 Mở Bản Đồ Ngân Hà";
        inspBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.activeEncounterScript = null;
          this.switchMode("galaxy");
        });
        wrap.appendChild(inspBtn);
      } else {
        const curIdx = CHAPTERS.findIndex(c => c.id === script.id);
        const nextChap = curIdx >= 0 && curIdx + 1 < CHAPTERS.length ? CHAPTERS[curIdx + 1] : null;
        if (nextChap) {
          const nextBtn = document.createElement("button");
          nextBtn.className = "btn-gold";
          nextBtn.textContent = `📖 Tiếp Sang ${nextChap.num}: ${nextChap.title}`;
          nextBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            SFX.choice();
            this.game.vn.currentChapterId = nextChap.id;
            this.game.vn.currentNodeId = "start";
            this.lastAppliedNodeKey = null;
            this.renderVNNode();
          });
          wrap.appendChild(nextBtn);
        }
        const galBtn = document.createElement("button");
        galBtn.className = "btn-primary";
        galBtn.textContent = "🌌 Quản Lý Ngân Hà 3D";
        galBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.switchMode("galaxy");
        });
        wrap.appendChild(galBtn);
      }
      choicesEl.appendChild(wrap);
    } else {
      hintEl.textContent = "Chạm / Click để tiếp tục ▸";
      if (this.vnAutoPlay) {
        this.scheduleVNAutoAdvance();
      }
    }
  }

  scheduleVNAutoAdvance() {
    clearTimeout(this.vnAutoTimer);
    this.vnAutoTimer = setTimeout(() => {
      if (this.currentMode === "vn" && this.vnAutoPlay && !this.isTyping) {
        const { node } = this.getActiveVNContext();
        if (node && node.next && !(node.choices && node.choices.length)) {
          this.advanceVN();
        }
      }
    }, 2400);
  }

  advanceVN() {
    const { script, isEncounter, node } = this.getActiveVNContext();
    if (!node) return;
    if (this.isTyping) {
      this.finishTypingAndShowControls(node, isEncounter, script);
      return;
    }
    if (node.choices && node.choices.length > 0) return;
    if (node.next && script.nodes[node.next]) {
      SFX.click();
      this.game.vn.currentNodeId = node.next;
      this.renderVNNode();
    }
  }

  selectVNChoice(choice, script, isEncounter) {
    if (typeof choice.effects === "function") {
      choice.effects(this.game);
      this.refreshTopResources();
      this.engine.updateSectorColors(this.game);
    }

    if (choice.battle) {
      // Lưu ngữ cảnh trận đấu cốt truyện và chuyển thẳng sang Đấu trường 3D
      this.pendingStoryBattle = {
        isEncounter,
        scriptId: script.id,
        encounterScript: isEncounter ? this.activeEncounterScript : null,
        winNext: choice.battle.winNext,
        loseNext: choice.battle.loseNext
      };
      this.pendingInvasionSectorId = null;

      this.switchMode("arena");
      document.getElementById("arena-player-select").value = choice.battle.playerId;
      document.getElementById("arena-enemy-select").value = choice.battle.enemyId;
      document.getElementById("arena-stage-select").value = choice.battle.stageId;
      this.startConfiguredArenaMatch();
      return;
    }

    if (choice.next && script.nodes[choice.next]) {
      this.game.vn.currentNodeId = choice.next;
      this.game.saveToSlot("auto");
      this.renderVNNode();
    }
  }

  // ==========================================================================
  // MODE 2: 3D GALAXY CONQUEST & SECTOR HIERARCHY
  // ==========================================================================
  initGalaxyUI() {
    const facSel = document.getElementById("active-faction-select");
    facSel.innerHTML = PLAYABLE.map(id => {
      const f = FACTIONS[id];
      return `<option value="${id}">${ESC(f.name)} (${ESC(f.realm)})</option>`;
    }).join("");
    facSel.value = this.game.playerFaction;

    facSel.addEventListener("change", () => {
      SFX.click();
      this.game.playerFaction = facSel.value;
      this.game.saveToSlot("auto");
      this.refreshTopResources();
      this.renderGalaxyFactionBox();
      this.renderSectorDetails();
      this.renderSuperweaponButtons();
    });

    document.getElementById("btn-galaxy-overview").addEventListener("click", () => {
      SFX.click();
      this.selectedSectorId = null;
      this.selectedBodyId = null;
      this.engine.resetGalaxyCamera();
      this.renderSectorList();
      this.renderSectorDetails();
    });

    // Mobile bottom-sheet switcher for Galaxy panels
    document.querySelectorAll("[data-gsheet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        const mode = btn.dataset.gsheet;
        document.querySelectorAll("[data-gsheet]").forEach(b => b.classList.toggle("active", b === btn));
        document.getElementById("galaxy-left-sidebar").classList.toggle("mobile-sheet-active", mode === "left");
        document.getElementById("galaxy-right-sidebar").classList.toggle("mobile-sheet-active", mode === "right");
      });
    });

    // Strategic sector action buttons
    document.getElementById("btn-invade-sector").addEventListener("click", () => {
      if (!this.selectedSectorId) return;
      const sData = SECTOR_BY_ID[this.selectedSectorId];
      if (!sData || sData.lost || sData.neutral) {
        this.showToast("Không thể tấn công", "Khu vực này là trung lập hoặc đã biến mất!");
        return;
      }
      const defenderOwner = this.game.ownerOf(sData.id);
      if (defenderOwner === this.game.playerFaction) {
        this.showToast("Khu vực đồng minh", "Khu vực này đã thuộc quyền kiểm soát của bạn!");
        return;
      }

      SFX.alert();
      const playerChamp = this.game.getChampionForFaction(this.game.playerFaction) || "arisia";
      const enemyChamp = (this.game.sectors[sData.id]?.garrison?.[0]) || this.game.getChampionForFaction(defenderOwner) || "overlord";

      this.pendingStoryBattle = null;
      this.pendingInvasionSectorId = sData.id;

      const secDefense = this.game.sectors[sData.id]?.defense ?? 50;
      const buffMult = secDefense < 35 ? 1.15 : 1;

      this.switchMode("arena");
      document.getElementById("arena-player-select").value = playerChamp;
      document.getElementById("arena-enemy-select").value = enemyChamp;
      document.getElementById("arena-stage-select").value = sData.id;
      this.startConfiguredArenaMatch({ buffMult });
      if (buffMult > 1) {
        this.pushArenaLog("system", "🕵️ Lợi thế Tình Báo: Phòng thủ địch < 35, tướng bạn nhận +15% công lực!");
      }
    });

    document.getElementById("btn-fortify-sector").addEventListener("click", () => {
      if (!this.selectedSectorId) return;
      const res = this.game.fortifySector(this.selectedSectorId);
      res.ok ? SFX.choice() : SFX.alert();
      this.refreshTopResources();
      this.renderSectorList();
      this.renderSectorDetails();
      this.showToast(res.ok ? "🛡️ Gia Cố Thành Công" : "Không thể gia cố", res.msg);
    });

    document.getElementById("btn-stabilize-sector").addEventListener("click", () => {
      if (!this.selectedSectorId) return;
      const res = this.game.stabilizeSector(this.selectedSectorId);
      res.ok ? SFX.choice() : SFX.alert();
      this.refreshTopResources();
      this.renderSectorList();
      this.renderSectorDetails();
      this.showToast(res.ok ? "🕊️ Đã Bình Ổn" : "Không thể bình ổn", res.msg);
    });

    document.getElementById("btn-recon-sector")?.addEventListener("click", () => {
      if (!this.selectedSectorId) return;
      const res = this.game.sabotageSector(this.selectedSectorId);
      res.ok ? SFX.choice() : SFX.alert();
      this.refreshTopResources();
      this.renderSectorList();
      this.renderSectorDetails();
      this.showToast(res.ok ? "🕵️ Tình Báo & Phá Hoại" : "Không thể tình báo", res.msg);
      if (res.ok) this.checkAndToastAchievements();
    });

    document.getElementById("btn-goto-vn-sector").addEventListener("click", () => {
      SFX.click();
      const secId = this.selectedSectorId || "sylvalon";
      const matchChap = CHAPTERS.find(ch => ch.sector === secId);
      if (matchChap) {
        this.activeEncounterScript = null;
        this.game.vn.currentChapterId = matchChap.id;
        this.game.vn.currentNodeId = "start";
        this.lastAppliedNodeKey = null;
        this.switchMode("vn");
      } else {
        const secState = this.game.sectors[secId];
        const charId = secState?.garrison?.[0] || "arisia";
        this.startEncounter(charId);
      }
    });

    this.renderGalaxyFactionBox();
    this.renderSectorList();
    this.renderSectorDetails();
    this.renderSuperweaponButtons();
  }

  renderGalaxyFactionBox() {
    const fac = FACTIONS[this.game.playerFaction];
    const res = this.game.resources[this.game.playerFaction] || { credits: 0, influence: 0, research: 0, tributes: 0 };
    const pct = this.game.getFactionTerritoryPct(this.game.playerFaction);

    document.getElementById("faction-info-box").innerHTML = `
      <div class="planet-meta-grid">
        <div><strong>Lãnh đạo:</strong><br/>${ESC(fac.leader)}</div>
        <div><strong>Lãnh thổ:</strong><br/><span style="color:${fac.color};font-weight:800;">${pct}% Ngân hà</span></div>
        <div><strong>Ảnh hưởng:</strong> ${Math.round(res.influence)}</div>
        <div><strong>Nghiên cứu:</strong> ${Math.round(res.research)}</div>
        <div style="grid-column:span 2;"><strong>Chính phủ:</strong> ${ESC(fac.gov)}</div>
        <div style="grid-column:span 2;" class="muted">${ESC(fac.desc)}</div>
      </div>
    `;
  }

  renderSectorList() {
    const list = document.getElementById("galaxy-sector-list");
    list.innerHTML = SECTORS.map((sec) => {
      const dyn = this.game.sectors[sec.id];
      const ownerFac = FACTIONS[dyn.owner];
      const active = this.selectedSectorId === sec.id ? "active" : "";
      const col = ownerFac?.color || (sec.lost ? "#f472b6" : "#94a3b8");

      return `
        <div class="sector-card ${active}" data-secid="${sec.id}">
          <div class="sector-head">
            <strong style="font-size:13px;">${ESC(sec.name)}${sec.inferred ? " *" : ""}</strong>
            <span class="badge" style="color:${col};border-color:${col};">${ESC(SECTOR_KIND_LABEL[sec.kind] || sec.kind)}</span>
          </div>
          <div class="muted" style="margin-top:3px;">
            <span style="color:${col};font-weight:700;">${ESC(this.game.facName(dyn.owner))}</span>
            • Thủ ${dyn.defense}/${dyn.maxDefense} • Ổn định ${dyn.stability}%
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".sector-card").forEach((card) => {
      card.addEventListener("click", () => {
        SFX.click();
        this.selectSector(card.dataset.secid, true);
        if (window.innerWidth <= 960) {
          document.querySelector('[data-gsheet="right"]')?.click();
        }
      });
    });
  }

  selectSector(secId, zoom = true) {
    this.selectedSectorId = secId;
    this.selectedBodyId = null;
    if (zoom) this.engine.zoomToSector(secId);
    this.renderSectorList();
    this.renderSectorDetails();
    this.renderSuperweaponButtons();
  }

  selectBody(secId, bodyId) {
    this.selectedSectorId = secId;
    this.selectedBodyId = bodyId;
    this.engine.zoomToBody(secId, bodyId);
    this.renderSectorDetails();
    const sec = SECTOR_BY_ID[secId];
    const body = sec?.bodies?.find(b => b.id === bodyId);
    if (body) {
      SFX.click();
      this.showToast(`🪐 ${body.name}`, body.desc || "Thiên thể trực thuộc hệ sao.");
    }
  }

  renderSectorDetails() {
    const box = document.getElementById("planet-detail-box");
    const sec = SECTOR_BY_ID[this.selectedSectorId];
    if (!sec) {
      box.innerHTML = `<div class="muted">Đang ở chế độ Toàn cảnh Ngân Hà Gaiastra. Hãy chạm vào một quả cầu hệ sao 3D hoặc chọn trong danh sách để khảo sát.</div>`;
      return;
    }

    const dyn = this.game.sectors[sec.id];
    const ownerFac = FACTIONS[dyn.owner];
    const col = ownerFac?.color || "#94a3b8";

    const bodiesHtml = (sec.bodies || []).length
      ? sec.bodies.map((b) => {
          const isSel = this.selectedBodyId === b.id;
          return `
            <div class="body-card" data-bodyid="${b.id}" style="${isSel ? "border-color:var(--gold);background:rgba(251,191,36,0.1);" : ""}">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="color:${b.color || "#38bdf8"};">● ${ESC(b.name)}</strong>
                <span class="badge">${ESC(BODY_KIND_LABEL[b.kind] || b.kind)}</span>
              </div>
              <div class="muted" style="margin-top:3px;">${ESC(b.desc || "")}</div>
              ${(b.places || []).length ? `<div class="chip-row">${b.places.map(p => `<span class="chip">📍 ${ESC(p.name)}</span>`).join("")}</div>` : ""}
            </div>
          `;
        }).join("")
      : `<div class="muted">Không phải hệ sao hành tinh (Vùng không gian / Chiều dị biệt).</div>`;

    const placesHtml = (sec.places || []).length
      ? `<div style="margin-top:8px;"><strong style="font-size:11.5px;">Địa danh trực thuộc:</strong><div class="chip-row">${sec.places.map(p => `<span class="chip">${ESC(PLACE_KIND_LABEL[p.kind] || "Địa danh")}: ${ESC(p.name)}</span>`).join("")}</div></div>`
      : "";

    const garrisonHtml = (dyn.garrison || []).length
      ? `<div style="margin-top:8px;"><strong style="font-size:11.5px;">Nhân vật đang đóng quân (${dyn.garrison.length}):</strong>
           <div class="chip-row">${dyn.garrison.map(cid => {
             const ch = CHAR_BY_ID[cid];
             return ch ? `<span class="chip clickable" data-garrison-char="${ch.id}">💬 ${ESC(ch.name)} (CR ${ch.cr})</span>` : "";
           }).join("")}</div>
         </div>`
      : "";

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h3 style="margin:0;color:${col};font-size:16px;">${ESC(sec.name)}${sec.inferred ? " (Suy luận)" : ""}</h3>
        <span class="badge" style="color:${col};border-color:${col};">${ESC(this.game.facName(dyn.owner))}</span>
      </div>
      <div class="planet-meta-grid">
        <div><strong>Cõi:</strong> ${ESC(sec.realm)}</div>
        <div><strong>Loại:</strong> ${ESC(SECTOR_KIND_LABEL[sec.kind] || sec.kind)}</div>
        <div><strong>Phòng thủ:</strong> ${dyn.defense}/${dyn.maxDefense}</div>
        <div><strong>Ổn định:</strong> ${dyn.stability}%${dyn.frozenTurns > 0 ? " (🔒 Đóng băng)" : ""}</div>
        <div><strong>Thu nhập / Chu kỳ:</strong> +${sec.income?.credits || 0} Cr • +${sec.income?.influence || 0} Inf • +${sec.income?.research || 0} Res</div>
        <div><strong>Mặt trời:</strong> ${sec.star ? ESC(sec.star.name) : "Không có"}</div>
      </div>
      <p class="muted" style="margin-top:8px;">${ESC(sec.desc)}</p>
      ${placesHtml}
      <div style="margin-top:9px;">
        <strong style="font-size:11.5px;color:var(--primary);">Thiên thể trong khu vực (bấm để zoom 3D):</strong>
        ${bodiesHtml}
      </div>
      ${garrisonHtml}
    `;

    box.querySelectorAll("[data-bodyid]").forEach((el) => {
      el.addEventListener("click", () => this.selectBody(sec.id, el.dataset.bodyid));
    });
    box.querySelectorAll("[data-garrison-char]").forEach((el) => {
      el.addEventListener("click", () => {
        SFX.click();
        this.startEncounter(el.dataset.garrisonChar);
      });
    });
  }

  renderSuperweaponButtons() {
    const container = document.getElementById("superweapon-buttons");
    const entries = Object.entries(SUPERWEAPONS);
    const ownedSWs = entries.filter(([, sw]) => sw.owner === this.game.playerFaction);
    const listToShow = ownedSWs.length > 0 ? ownedSWs : entries;

    container.innerHTML = listToShow.map(([swId, sw]) => {
      const isOwned = sw.owner === this.game.playerFaction;
      const cd = this.game.superweaponCooldowns[swId] || 0;
      const disabled = !isOwned || cd > 0 ? "disabled" : "";
      const sub = !isOwned ? `(Thuộc ${FACTIONS[sw.owner]?.name || sw.owner})` : (cd > 0 ? `(Hồi ${cd} ck)` : `(${sw.cost} Cr)`);
      return `
        <button class="btn-danger" data-swid="${swId}" ${disabled} title="${ESC(sw.desc)}">
          ☄️ ${ESC(sw.name)} <small style="opacity:0.85;">${ESC(sub)}</small>
        </button>
      `;
    }).join("");

    container.querySelectorAll("[data-swid]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this.selectedSectorId) {
          this.showToast("Chọn mục tiêu", "Hãy chọn một hệ sao mục tiêu trước khi khai hỏa!");
          return;
        }
        const swId = btn.dataset.swid;
        const res = this.game.fireSuperweapon(swId, this.selectedSectorId);
        if (res.ok) {
          SFX.superweapon();
          this.engine.playSuperweaponVFX(swId, this.selectedSectorId);
          this.engine.updateSectorColors(this.game);
          this.refreshTopResources();
          this.renderSectorList();
          this.renderSectorDetails();
          this.renderSuperweaponButtons();
          this.showToast("☄️ SIÊU VŨ KHÍ KHAI HỎA!", res.msg);
          this.checkAndToastAchievements();
        } else {
          SFX.alert();
          this.showToast("Không thể khai hỏa", res.msg);
        }
      });
    });
  }

  renderFloatingLabels(labels) {
    const layer = document.getElementById("galaxy-labels-layer");
    const activeIds = new Set();

    for (const item of labels) {
      if (item.x < 10 || item.x > window.innerWidth - 10 || item.y < 58 || item.y > window.innerHeight - 20) {
        continue;
      }
      const key = `${item.kind}:${item.id}`;
      activeIds.add(key);

      let el = this.labelDomCache.get(key);
      if (!el) {
        el = document.createElement("button");
        el.className = "floating-label";
        el.innerHTML = `<span class="dot"></span><span class="lbl"></span>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.click();
          if (item.kind === "body") {
            this.selectBody(item.sectorId, item.id);
          } else {
            this.selectSector(item.sectorId, true);
          }
        });
        this.labelDomCache.set(key, el);
        layer.appendChild(el);
      }

      el.style.left = `${item.x.toFixed(1)}px`;
      el.style.top = `${item.y.toFixed(1)}px`;
      el.querySelector(".dot").style.background = item.color || "#38bdf8";
      el.querySelector(".lbl").textContent = item.text;
      const isSelected = (item.kind === "sector" && this.selectedSectorId === item.id) || (item.kind === "body" && this.selectedBodyId === item.id);
      el.classList.toggle("selected", isSelected);
      el.style.display = "inline-flex";
    }

    for (const [key, el] of this.labelDomCache.entries()) {
      if (!activeIds.has(key)) {
        el.style.display = "none";
      }
    }
  }

  // ==========================================================================
  // MODE 3: REAL-TIME 3D ARENA & VIRTUAL JOYSTICK
  // ==========================================================================
  initArenaUI() {
    const pSel = document.getElementById("arena-player-select");
    const eSel = document.getElementById("arena-enemy-select");
    const sSel = document.getElementById("arena-stage-select");

    const sortedChars = [...CHARACTERS].sort((a, b) => b.cr - a.cr);
    const charOpts = sortedChars.map(c => `<option value="${c.id}">${ESC(c.name)} (CR ${c.cr} • ${ESC(c.species)})</option>`).join("");
    pSel.innerHTML = charOpts;
    eSel.innerHTML = charOpts;
    pSel.value = "arisia";
    eSel.value = "overlord";

    sSel.innerHTML = SECTORS.map(s => `<option value="${s.id}">${ESC(s.name)} (${ESC(s.realm)})</option>`).join("");
    sSel.value = "western_march";

    // Mobile setup drawer toggle
    const drawer = document.getElementById("arena-setup-drawer");
    document.getElementById("btn-arena-toggle-setup").addEventListener("click", () => {
      SFX.click();
      drawer.classList.toggle("open");
    });

    document.getElementById("btn-start-match").addEventListener("click", () => {
      SFX.choice();
      this.pendingStoryBattle = null;
      this.pendingInvasionSectorId = null;
      drawer.classList.remove("open");
      this.startConfiguredArenaMatch();
    });

    const toggleAuto = () => {
      if (!this.engine.arenaState) return;
      SFX.click();
      this.engine.arenaState.autoPilot = !this.engine.arenaState.autoPilot;
      const on = this.engine.arenaState.autoPilot;
      document.getElementById("btn-toggle-autopilot").textContent = on ? "🤖 Tắt Tự Động Đánh [F]" : "🤖 Bật Tự Động Đánh [F]";
      document.getElementById("btn-arena-auto-mob").classList.toggle("active", on);
      this.pushArenaLog("system", on ? "🤖 Đã bật Tự động chiến đấu!" : "🕹️ Đã chuyển sang điều khiển thủ công!");
    };
    document.getElementById("btn-toggle-autopilot").addEventListener("click", toggleAuto);
    document.getElementById("btn-arena-auto-mob").addEventListener("click", toggleAuto);

    // Skill & Dodge triggers
    [0, 1, 2].forEach((slot) => {
      document.getElementById(`btn-skill-${slot}`).addEventListener("click", () => this.fireArenaSkill(slot));
    });

    document.getElementById("btn-dodge").addEventListener("click", () => {
      const res = this.engine.triggerDodge();
      if (res.ok) {
        SFX.dodge();
        this.pushArenaLog("player", res.msg);
      } else if (res.msg) {
        this.pushArenaLog("system", res.msg);
      }
    });

    // Keyboard Arena shortcuts
    window.addEventListener("keydown", (e) => {
      if (this.currentMode !== "arena") return;
      const k = (e.key || "").toLowerCase();
      if (k === "1" || k === "q") this.fireArenaSkill(0);
      else if (k === "2" || k === "e") this.fireArenaSkill(1);
      else if (k === "3" || k === "r") this.fireArenaSkill(2);
      else if (k === " ") {
        e.preventDefault();
        document.getElementById("btn-dodge").click();
      } else if (k === "f") {
        toggleAuto();
      }
    });

    this.setupVirtualJoystick();

    // Victory Modal handlers
    const vModal = document.getElementById("arena-victory-modal");
    document.getElementById("btn-victory-story").addEventListener("click", () => {
      SFX.choice();
      vModal.classList.add("hidden");
      if (!this.pendingStoryBattle) return;
      const ctx = this.pendingStoryBattle;
      const won = this._lastBattleWon;
      this.pendingStoryBattle = null;

      this.activeEncounterScript = ctx.encounterScript;
      if (!ctx.isEncounter) {
        this.game.vn.currentChapterId = ctx.scriptId;
      }
      this.game.vn.currentNodeId = won ? ctx.winNext : ctx.loseNext;
      this.lastAppliedNodeKey = null;
      this.switchMode("vn");
    });

    document.getElementById("btn-victory-conquer").addEventListener("click", () => {
      SFX.victory();
      vModal.classList.add("hidden");
      if (this.pendingInvasionSectorId) {
        const secId = this.pendingInvasionSectorId;
        this.pendingInvasionSectorId = null;
        this.game.conquerSector(secId, this.game.playerFaction);
        this.engine.updateSectorColors(this.game);
        this.refreshTopResources();
        this.selectedSectorId = secId;
        this.switchMode("galaxy");
        this.showToast("🚩 ĐÃ CHIẾM KHU VỰC!", `${this.game.sectorName(secId)} nay thuộc về ${this.game.facName(this.game.playerFaction)}!`);
        this.checkAndToastAchievements();
      }
    });

    document.getElementById("btn-victory-close").addEventListener("click", () => {
      SFX.click();
      vModal.classList.add("hidden");
    });
  }

  setupVirtualJoystick() {
    const zone = document.getElementById("arena-joystick");
    const knob = document.getElementById("arena-joystick-knob");
    let activePointer = null;
    const maxR = 36;

    const updateStick = (clientX, clientY) => {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.engine.setJoystickInput(dx / maxR, dy / maxR);
    };

    const resetStick = () => {
      activePointer = null;
      knob.style.transform = "translate(-50%, -50%)";
      this.engine.setJoystickInput(0, 0);
    };

    zone.addEventListener("pointerdown", (e) => {
      activePointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      updateStick(e.clientX, e.clientY);
    });
    zone.addEventListener("pointermove", (e) => {
      if (activePointer === e.pointerId) updateStick(e.clientX, e.clientY);
    });
    zone.addEventListener("pointerup", (e) => {
      if (activePointer === e.pointerId) resetStick();
    });
    zone.addEventListener("pointercancel", resetStick);
  }

  startConfiguredArenaMatch(opts = {}) {
    const pId = document.getElementById("arena-player-select").value;
    const eId = document.getElementById("arena-enemy-select").value;
    const sId = document.getElementById("arena-stage-select").value;

    this.engine.setupArenaStage(sId, pId, eId, opts);
    document.getElementById("arena-victory-modal").classList.add("hidden");
    document.getElementById("arena-combat-log").innerHTML = "";

    const pChar = CHAR_BY_ID[pId];
    const eChar = CHAR_BY_ID[eId];
    const pFac = FACTIONS[pChar?.fac]?.name || pChar?.species;
    const eFac = FACTIONS[eChar?.fac]?.name || eChar?.species;

    document.getElementById("hud-p-img").src = getPortraitUrl(pChar);
    document.getElementById("hud-p-name").textContent = pChar.name;
    document.getElementById("hud-p-meta").textContent = `CR ${pChar.cr} • ${pFac}`;

    document.getElementById("hud-e-img").src = getPortraitUrl(eChar);
    document.getElementById("hud-e-name").textContent = eChar.name;
    document.getElementById("hud-e-meta").textContent = `CR ${eChar.cr} • ${eFac}`;

    [0, 1, 2].forEach((slot) => {
      const skName = (pChar.skills && pChar.skills[slot]) || `Kỹ năng ${slot + 1}`;
      document.querySelector(`#btn-skill-${slot} .skill-label`).textContent = `[${slot + 1}] ${skName}`;
    });

    document.getElementById("btn-toggle-autopilot").textContent = "🤖 Bật Tự Động Đánh [F]";
    document.getElementById("btn-arena-auto-mob").classList.remove("active");

    this.updateArenaBars();
    this.pushArenaLog("system", `🔥 Trận đấu tại ${this.game.sectorName(sId)}: ${pChar.name} vs ${eChar.name}!`);
  }

  fireArenaSkill(slot) {
    const wasFullOd = (this.engine.arenaState?.player?.overdrive || 0) >= 100;
    const res = this.engine.triggerArenaSkill(slot);
    if (!res) return;
    if (res.ok) {
      if (slot === 2 && wasFullOd) SFX.overdrive();
      else slot === 2 ? SFX.heavyHit() : SFX.laser();
      this.pushArenaLog("player", res.msg);
      this.updateArenaBars();
    } else if (res.msg) {
      this.pushArenaLog("system", res.msg);
    }
  }

  handleCombatTick(tick) {
    if (tick.type === "enemy_attack") SFX.heavyHit();
    this.pushArenaLog(tick.type === "enemy_attack" ? "enemy" : "player", tick.msg);
    this.updateArenaBars();
  }

  handleCombatEnd(res) {
    const won = res.winner === "player";
    this._lastBattleWon = won;
    if (won) {
      SFX.victory();
      this.game.recordBattleWin();
      this.checkAndToastAchievements();
    } else {
      SFX.alert();
    }
    this.updateArenaBars();
    this.pushArenaLog("system", res.msg);

    const modal = document.getElementById("arena-victory-modal");
    document.getElementById("victory-title").textContent = won ? "🏆 CHIẾN THẮNG!" : "💀 THẤT BẠI!";
    document.getElementById("victory-title").style.color = won ? "var(--gold)" : "var(--danger)";
    document.getElementById("victory-desc").textContent = res.msg;

    const storyBtn = document.getElementById("btn-victory-story");
    const conquerBtn = document.getElementById("btn-victory-conquer");

    storyBtn.classList.toggle("hidden", !this.pendingStoryBattle);
    conquerBtn.classList.toggle("hidden", !(won && this.pendingInvasionSectorId));

    modal.classList.remove("hidden");
  }

  updateArenaBars() {
    const st = this.engine.arenaState;
    if (!st) return;
    const pPct = Math.max(0, Math.min(100, (st.player.hp / st.player.maxHp) * 100));
    const ePct = Math.max(0, Math.min(100, (st.enemy.hp / st.enemy.maxHp) * 100));

    document.getElementById("hud-p-bar").style.width = `${pPct}%`;
    document.getElementById("hud-p-hp-text").textContent = `${Math.round(st.player.hp).toLocaleString()} / ${st.player.maxHp.toLocaleString()} HP`;

    document.getElementById("hud-e-bar").style.width = `${ePct}%`;
    document.getElementById("hud-e-hp-text").textContent = `${Math.round(st.enemy.hp).toLocaleString()} / ${st.enemy.maxHp.toLocaleString()} HP`;
  }

  pushArenaLog(cls, text) {
    const log = document.getElementById("arena-combat-log");
    const line = document.createElement("div");
    line.className = `combat-log-line ${cls}`;
    line.textContent = text;
    log.appendChild(line);
    while (log.children.length > 18) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  spawnFloatingDamage(evt) {
    const layer = document.getElementById("arena-damage-layer");
    const el = document.createElement("div");
    el.className = `damage-float ${Math.abs(parseInt(evt.text, 10)) > 600 ? "crit" : ""}`;
    el.style.left = `${evt.x}px`;
    el.style.top = `${evt.y}px`;
    el.style.color = evt.color || "#38bdf8";
    el.textContent = evt.text;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  startUiLoop() {
    const tick = () => {
      if (this.currentMode === "arena" && this.engine.arenaState) {
        const p = this.engine.arenaState.player;
        [0, 1, 2].forEach((slot) => {
          const btn = document.getElementById(`btn-skill-${slot}`);
          const cd = p.cooldowns[slot] || 0;
          btn.classList.toggle("on-cd", cd > 0);
          btn.querySelector(".skill-cd").textContent = cd > 0 ? `${cd.toFixed(1)}s` : "Sẵn sàng";
        });
        const dodgeBtn = document.getElementById("btn-dodge");
        dodgeBtn.classList.toggle("on-cd", p.dodgeCd > 0);
        dodgeBtn.querySelector(".skill-cd").textContent = p.dodgeCd > 0 ? `${p.dodgeCd.toFixed(1)}s` : (p.shieldTime > 0 ? "🛡️ KHIÊN" : "Sẵn sàng");

        const comboEl = document.getElementById("arena-combo-badge");
        if (comboEl) comboEl.textContent = `COMBO x${p.combo || 0}`;
        const odPct = Math.max(0, Math.min(100, p.overdrive || 0));
        const odBar = document.getElementById("arena-od-bar");
        const odText = document.getElementById("arena-od-text");
        if (odBar) {
          odBar.style.width = `${odPct}%`;
          odBar.classList.toggle("ready", odPct >= 100);
        }
        if (odText) {
          odText.textContent = odPct >= 100 ? "OVERDRIVE READY! (1.5x [3])" : `OVERDRIVE ${Math.round(odPct)}%`;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ==========================================================================
  // MODE 4: 3D CHARACTER INSPECTOR (72 CHARACTERS)
  // ==========================================================================
  initInspectorUI() {
    const facSel = document.getElementById("char-faction-filter");
    const uniqueFacs = [...new Set(CHARACTERS.map(c => c.fac))];
    facSel.innerHTML = `<option value="ALL">Tất cả Phe (${CHARACTERS.length})</option>` +
      uniqueFacs.map(fid => `<option value="${fid}">${ESC(FACTIONS[fid]?.name || fid)}</option>`).join("");

    const searchInput = document.getElementById("char-search-input");
    const genderSel = document.getElementById("char-gender-filter");

    const rerender = () => this.renderRosterList();
    searchInput.addEventListener("input", rerender);
    genderSel.addEventListener("change", rerender);
    facSel.addEventListener("change", rerender);

    // Mobile sheet toggles
    document.querySelectorAll("[data-isheet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        const mode = btn.dataset.isheet;
        document.querySelectorAll("[data-isheet]").forEach(b => b.classList.toggle("active", b === btn));
        document.getElementById("inspector-left-sidebar").classList.toggle("mobile-sheet-active", mode === "left");
        document.getElementById("inspector-right-sidebar").classList.toggle("mobile-sheet-active", mode === "right");
      });
    });

    this.renderRosterList();
    this.renderInspectorCard();
  }

  renderRosterList() {
    const q = (document.getElementById("char-search-input").value || "").trim().toLowerCase();
    const gFilter = document.getElementById("char-gender-filter").value;
    const fFilter = document.getElementById("char-faction-filter").value;

    const filtered = CHARACTERS
      .filter((c) => {
        if (gFilter === "Female" && c.g !== "F") return false;
        if (gFilter === "Male" && c.g !== "M") return false;
        if (fFilter !== "ALL" && c.fac !== fFilter) return false;
        if (!q) return true;
        const hay = `${c.name} ${c.species} ${c.title} ${(c.skills || []).join(" ")} ${FACTIONS[c.fac]?.name || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.cr - a.cr);

    const list = document.getElementById("char-roster-list");
    list.innerHTML = filtered.map((c) => {
      const active = this.inspectedCharId === c.id ? "active" : "";
      const col = FACTIONS[c.fac]?.color || "#38bdf8";
      return `
        <div class="roster-item ${active}" data-charid="${c.id}">
          <img class="roster-thumb" src="${getPortraitUrl(c)}" alt="${ESC(c.name)}" />
          <div style="flex:1;min-width:0;">
            <div class="roster-head">
              <strong style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.name)}</strong>
              <span class="badge" style="color:${col};border-color:${col};">CR ${c.cr}</span>
            </div>
            <div class="muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${ESC(c.species)} • ${c.h}m • ${ESC(FACTIONS[c.fac]?.name || c.fac)}
            </div>
          </div>
        </div>
      `;
    }).join("") || `<div class="muted">Không tìm thấy nhân vật khớp bộ lọc.</div>`;

    list.querySelectorAll(".roster-item").forEach((el) => {
      el.addEventListener("click", () => {
        SFX.click();
        this.inspectedCharId = el.dataset.charid;
        this.engine.showcaseCharacter(this.inspectedCharId);
        this.renderRosterList();
        this.renderInspectorCard();
        if (window.innerWidth <= 960) {
          document.querySelector('[data-isheet="right"]')?.click();
        }
      });
    });
  }

  renderInspectorCard() {
    const c = CHAR_BY_ID[this.inspectedCharId];
    if (!c) return;
    const fac = FACTIONS[c.fac];
    const col = fac?.color || "#38bdf8";
    const loc = findLocation(c.loc);
    const affinity = this.game.getAffinity(c.id);

    const kinChips = (c.kin || [])
      .map(kid => CHAR_BY_ID[kid])
      .filter(Boolean)
      .map(k => `<span class="chip clickable" data-kin="${k.id}">👤 ${ESC(k.name)}</span>`)
      .join("");

    const card = document.getElementById("inspector-detail-card");
    card.innerHTML = `
      <div class="inspector-portrait-hero">
        <img src="${getPortraitUrl(c)}" alt="${ESC(c.name)}" />
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0;color:${col};font-size:16px;">${ESC(c.name)}</h3>
          <div class="muted" style="color:var(--gold);font-weight:700;">${ESC(c.title)}</div>
          <div class="muted">${ESC(c.species)} • ${c.g === "F" ? "Nữ" : "Nam"} • ${ESC(fac?.name || c.fac)}</div>
          <div style="margin-top:6px;font-size:11px;display:flex;justify-content:space-between;">
            <span>Độ tin cậy / Gắn kết:</span><strong>${affinity}/100</strong>
          </div>
          <div class="affinity-bar-wrap"><div class="affinity-bar-fill" style="width:${affinity}%;"></div></div>
        </div>
      </div>

      <div class="planet-meta-grid" style="margin-top:9px;">
        <div><strong>Combat Rating:</strong> <span style="color:var(--primary);font-weight:800;">${c.cr}</span></div>
        <div><strong>Chiều cao 3D:</strong> <span style="color:var(--gold);font-weight:800;">${c.h}m</span></div>
        <div><strong>IQ:</strong> ${c.iq}</div>
        <div><strong>Tuổi:</strong> ${ESC(c.age)}</div>
        <div style="grid-column:span 2;">
          <strong>Vị trí hiện tại:</strong>
          ${loc ? `<span class="chip clickable" id="btn-insp-loc" style="margin-left:4px;">📍 ${ESC(loc.label)}</span>` : ESC(c.loc)}
        </div>
      </div>

      <p class="muted" style="margin-top:9px;">${ESC(c.bio)}</p>

      <div style="margin-top:8px;">
        <strong style="font-size:11.5px;color:var(--primary);">Kỹ năng chiến đấu:</strong>
        <div class="chip-row">${(c.skills || []).map(sk => `<span class="chip">⚡ ${ESC(sk)}</span>`).join("")}</div>
      </div>

      ${kinChips ? `<div style="margin-top:8px;"><strong style="font-size:11.5px;">Quan hệ huyết thống / liên đới:</strong><div class="chip-row">${kinChips}</div></div>` : ""}

      <div class="action-grid-2" style="margin-top:11px;">
        <button class="btn-accent" id="btn-insp-talk">💬 Trò Chuyện (VN)</button>
        <button class="btn-primary" id="btn-insp-duel">⚔️ Ra Đấu Trường</button>
      </div>
    `;

    card.querySelector("#btn-insp-talk").addEventListener("click", () => {
      SFX.choice();
      this.startEncounter(c.id);
    });

    card.querySelector("#btn-insp-duel").addEventListener("click", () => {
      SFX.choice();
      this.pendingStoryBattle = null;
      this.pendingInvasionSectorId = null;
      this.switchMode("arena");
      document.getElementById("arena-player-select").value = c.id;
      this.startConfiguredArenaMatch();
    });

    card.querySelector("#btn-insp-loc")?.addEventListener("click", () => {
      if (!loc?.sector) return;
      SFX.click();
      this.selectedSectorId = loc.sector.id;
      this.selectedBodyId = loc.body?.id || null;
      this.switchMode("galaxy");
      if (loc.body) this.engine.zoomToBody(loc.sector.id, loc.body.id);
    });

    card.querySelectorAll("[data-kin]").forEach((el) => {
      el.addEventListener("click", () => {
        SFX.click();
        this.inspectedCharId = el.dataset.kin;
        this.engine.showcaseCharacter(this.inspectedCharId);
        this.renderRosterList();
        this.renderInspectorCard();
      });
    });
  }

  // ==========================================================================
  // MODE 5: DIPLOMACY, CHRONICLE, LORE CODEX & APP SAVE SLOTS
  // ==========================================================================
  initCodexUI() {
    document.querySelectorAll("[data-ctab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.codexTab = btn.dataset.ctab;
        document.querySelectorAll("[data-ctab]").forEach(b => b.classList.toggle("active", b === btn));
        this.renderCodexTab();
      });
    });
  }

  renderCodexTab() {
    const body = document.getElementById("codex-main-content");
    const t = this.codexTab;

    if (t === "diplomacy") {
      const pFac = FACTIONS[this.game.playerFaction];
      const pct = this.game.getFactionTerritoryPct(this.game.playerFaction);

      const territoryBars = PLAYABLE.map((fid) => {
        const f = FACTIONS[fid];
        const fPct = this.game.getFactionTerritoryPct(fid);
        return `
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <strong style="color:${f.color};">${ESC(f.name)}</strong>
              <span>${fPct}% Ngân hà</span>
            </div>
            <div class="hp-track" style="height:8px;margin-top:3px;"><div style="width:${fPct}%;height:100%;background:${f.color};"></div></div>
          </div>
        `;
      }).join("");

      const diploRows = PLAYABLE.filter(fid => fid !== this.game.playerFaction).map((fid) => {
        const f = FACTIONS[fid];
        const rel = this.game.getRelation(this.game.playerFaction, fid);
        const badgeCol = rel >= 25 ? "#34d399" : (rel <= -25 ? "#fb7185" : "#fbbf24");
        const statusTxt = rel >= 40 ? "Đồng minh thân cận" : (rel >= 10 ? "Hòa hoãn" : (rel <= -40 ? "Thù địch sâu sắc" : "Căng thẳng"));
        return `
          <div class="diplo-row">
            <div>
              <strong style="color:${f.color};font-size:13.5px;">${ESC(f.name)}</strong>
              <div class="muted">Lãnh đạo: ${ESC(f.leader)} • <strong style="color:${badgeCol};">${statusTxt} (${rel > 0 ? "+" : ""}${rel})</strong></div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn-accent btn-compact" data-impr="${fid}">🤝 Cải Thiện (+14)</button>
              <button class="btn-danger btn-compact" data-deno="${fid}">⚡ Lên Án</button>
            </div>
          </div>
        `;
      }).join("");

      body.innerHTML = `
        <div class="codex-grid">
          <div class="codex-card">
            <div class="panel-section-title">🕊️ Hiệp Ước Cursew Pact</div>
            <p class="muted">Trạng thái: <strong style="color:${this.game.pact.active ? "#34d399" : "#fb7185"};">${this.game.pact.active ? `ĐANG HIỆU LỰC (Còn ${this.game.pact.turnsRemaining} chu kỳ)` : `ĐÃ SỤP ĐỔ${this.game.pact.brokenBy ? " (Bởi " + this.game.facName(this.game.pact.brokenBy) + ")" : ""}`}</strong></p>
            <p class="muted">Biên giới thỏa thuận giữa Sylvarian & Western Nadir tránh một cuộc chiến hủy diệt ngay lập tức, nhưng khiến Đế chế Nadirius và các nhánh đối lập bất mãn.</p>
            <button class="btn-gold" id="btn-toggle-pact">${this.game.pact.active ? "🔥 Xé Bỏ Hiệp Ước Cursew" : "✍️ Tái Ký Hiệp Ước (120 Ảnh hưởng)"}</button>
          </div>

          <div class="codex-card">
            <div class="panel-section-title">🗺️ Cán Cân Lãnh Thổ Ngân Hà (${ESC(pFac.name)}: ${pct}%)</div>
            ${territoryBars}
          </div>
        </div>

        <div class="codex-card" style="margin-top:12px;">
          <div class="panel-section-title">🤝 Quan Hệ Ngoại Giao Phe ${ESC(pFac.name)}</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">${diploRows}</div>
        </div>
      `;

      body.querySelector("#btn-toggle-pact").addEventListener("click", () => {
        const res = this.game.toggleCursewPact();
        res.ok ? SFX.alert() : SFX.click();
        this.refreshTopResources();
        this.renderCodexTab();
        this.showToast("Hiệp Ước Cursew", res.msg);
      });

      body.querySelectorAll("[data-impr]").forEach((b) => {
        b.addEventListener("click", () => {
          const res = this.game.improveRelation(b.dataset.impr);
          res.ok ? SFX.choice() : SFX.alert();
          this.refreshTopResources();
          this.renderCodexTab();
          this.showToast("Ngoại Giao", res.msg);
        });
      });

      body.querySelectorAll("[data-deno]").forEach((b) => {
        b.addEventListener("click", () => {
          const res = this.game.denounceFaction(b.dataset.deno);
          SFX.alert();
          this.refreshTopResources();
          this.renderCodexTab();
          this.showToast("Tuyên Bố Chính Trị", res.msg);
        });
      });
      return;
    }

    if (t === "events") {
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">${
        this.game.eventLog.map(ev => `
          <div class="codex-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--gold);">${ESC(ev.title)}</strong>
              <span class="badge">${ESC(ev.turn)}</span>
            </div>
            <div class="muted">${ESC(ev.desc)}</div>
          </div>
        `).join("")
      }</div>`;
      return;
    }

    if (t === "species") {
      body.innerHTML = `<div class="codex-grid">${
        SPECIES.map(sp => `
          <div class="codex-card">
            <strong style="color:${sp.color || "var(--primary)"};font-size:14.5px;">🧬 ${ESC(sp.name)}</strong>
            <div class="muted"><strong>Thể chất:</strong> ${ESC(sp.physic)} • <strong>Công nghệ:</strong> ${ESC(sp.tech)} • <strong>Dân số:</strong> ${ESC(sp.pop)}</div>
            <div class="muted">${ESC(sp.traits)}</div>
          </div>
        `).join("")
      }</div>`;
      return;
    }

    if (t === "timeline") {
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${
        TIMELINE.map(tm => `
          <div class="codex-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--gold);">${ESC(tm.title)}</strong>
              <span class="badge">${ESC(tm.era)}</span>
            </div>
            <div class="muted">${ESC(tm.text)}</div>
          </div>
        `).join("")
      }</div>`;
      return;
    }

    if (t === "relations") {
      body.innerHTML = `<div class="codex-grid">${
        RELATIONS.map(r => `
          <div class="codex-card">
            <strong style="color:var(--accent);font-size:14px;">🔗 ${ESC(r.type)}</strong>
            ${r.items.map(it => `<div class="muted">• ${ESC(it)}</div>`).join("")}
          </div>
        `).join("")
      }</div>`;
      return;
    }

    if (t === "achievements") {
      const doneCount = this.game.unlockedAchievements?.length || 0;
      const stats = this.game.stats || {};
      const cardsHtml = ACHIEVEMENTS.map((ach) => {
        const unlocked = this.game.unlockedAchievements?.includes(ach.id);
        return `
          <div class="ach-card ${unlocked ? "unlocked" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <strong style="color:${unlocked ? "var(--gold)" : "#e2e8f0"};font-size:13.5px;">${unlocked ? "🏆" : "🔒"} ${ESC(ach.title)}</strong>
              <span class="badge">${unlocked ? "ĐÃ MỞ KHÓA" : "CHƯA ĐẠT"}</span>
            </div>
            <div class="muted">${ESC(ach.desc)}</div>
            <div style="font-size:11.5px;color:#7dd3fc;margin-top:2px;">Thưởng: +${ach.rewardCr.toLocaleString()} Cr • +${ach.rewardInf} Inf</div>
          </div>
        `;
      }).join("");

      body.innerHTML = `
        <div class="codex-card" style="margin-bottom:12px;">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
            <strong style="color:var(--gold);font-size:14px;">🏅 Chiến Công Gaiastra (${doneCount}/${ACHIEVEMENTS.length})</strong>
            <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#cbd5e1;">
              <span>⚔️ Trận thắng: <strong>${stats.battlesWon || 0}</strong></span>
              <span>☄️ Siêu vũ khí: <strong>${stats.superweaponsFired || 0}</strong></span>
              <span>🕵️ Tình báo: <strong>${stats.reconOps || 0}</strong></span>
              <span>📖 Chương hoàn thành: <strong>${this.game.vn.completedChapters?.length || 0}/8</strong></span>
            </div>
          </div>
        </div>
        <div class="codex-grid">${cardsHtml}</div>
      `;
      return;
    }

    if (t === "system") {
      const slots = ["auto", "slot1", "slot2", "slot3"];
      const slotsHtml = slots.map((slot) => {
        const meta = this.game.getSlotMeta(slot);
        const label = slot === "auto" ? "Tự động lưu (Auto-Save)" : `Ô Lưu Thủ Công ${slot.slice(-1)}`;
        return `
          <div class="save-slot-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--primary);">${label}</strong>
              <span class="badge">${meta ? meta.turn : "Trống"}</span>
            </div>
            <div class="muted">${meta ? `${ESC(meta.faction)} • Đã xong ${meta.chapters} chương • Lưu lúc ${ESC(meta.savedAt)}` : "Chưa có dữ liệu lưu."}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${slot !== "auto" ? `<button class="btn-primary btn-compact" data-save-slot="${slot}">💾 Lưu Vào Ô Này</button>` : ""}
              <button class="btn-gold btn-compact" data-load-slot="${slot}" ${meta ? "" : "disabled"}>📂 Tải Lại</button>
            </div>
          </div>
        `;
      }).join("");

      body.innerHTML = `
        <div class="codex-grid">
          <div class="codex-card">
            <div class="panel-section-title">📱 Cài Thành App Trên Điện Thoại & PC</div>
            <p class="muted"><strong>Android (Chrome / Edge):</strong> Bấm biểu tượng <em>📲 Cài App</em> trên góc phải hoặc mở Menu (⋮) → <strong>Thêm vào Màn hình chính / Install App</strong>.</p>
            <p class="muted"><strong>iPhone / iPad (Safari):</strong> Bấm nút <strong>Chia sẻ (Share ⬆️)</strong> ở thanh dưới cùng → chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</p>
            <p class="muted"><strong>Chế độ Offline:</strong> Toàn bộ Three.js 3D, cốt truyện & chân dung đã được Service Worker lưu đệm để chơi không cần mạng.</p>
          </div>

          <div class="codex-card">
            <div class="panel-section-title">📤 Xuất / Nhập Dữ Liệu & Khởi Tạo Lại</div>
            <p class="muted">${ESC(META.title)} — ${ESC(META.subtitle)}</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button class="btn-accent btn-compact" id="btn-export-save">⬇️ Xuất File Save (.json)</button>
              <label class="btn-glass btn-compact" style="cursor:pointer;">
                ⬆️ Nhập File Save
                <input type="file" id="inp-import-save" accept=".json" style="display:none;" />
              </label>
              <button class="btn-danger btn-compact" id="btn-reset-campaign">🔄 Reset Toàn Bộ Game</button>
            </div>
          </div>
        </div>

        <div class="codex-grid" style="margin-top:12px;">${slotsHtml}</div>
      `;

      body.querySelectorAll("[data-save-slot]").forEach((b) => {
        b.addEventListener("click", () => {
          SFX.choice();
          this.game.saveToSlot(b.dataset.saveSlot);
          this.renderCodexTab();
          this.showToast("💾 Đã Lưu Game", `Đã ghi đè ${b.dataset.saveSlot} thành công.`);
        });
      });

      body.querySelectorAll("[data-load-slot]").forEach((b) => {
        b.addEventListener("click", () => {
          if (this.game.loadFromSlot(b.dataset.loadSlot)) {
            SFX.choice();
            this.activeEncounterScript = null;
            this.lastAppliedNodeKey = null;
            this.engine.updateSectorColors(this.game);
            this.refreshTopResources();
            this.populateChapterSelect();
            this.renderCodexTab();
            this.showToast("📂 Tải Dữ Liệu Thành Công", `Đã khôi phục Chu kỳ ${this.game.cycleMajor}.${this.game.cycleMinor}!`);
          }
        });
      });

      body.querySelector("#btn-export-save").addEventListener("click", () => {
        SFX.click();
        const blob = new Blob([this.game.serialize()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cycle12-save-c${this.game.cycleMajor}.${this.game.cycleMinor}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });

      body.querySelector("#inp-import-save").addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          JSON.parse(text);
          localStorage.setItem("CYCLE12_SAVE_V3_auto", text);
          this.game.loadFromSlot("auto");
          this.activeEncounterScript = null;
          this.lastAppliedNodeKey = null;
          this.engine.updateSectorColors(this.game);
          this.refreshTopResources();
          this.renderCodexTab();
          SFX.victory();
          this.showToast("⬆️ Đã Nhập Save", "Dữ liệu cốt truyện & bản đồ đã được khôi phục!");
        } catch {
          SFX.alert();
          this.showToast("Lỗi file Save", "File JSON không đúng định dạng Cycle 12.");
        }
      });

      body.querySelector("#btn-reset-campaign").addEventListener("click", () => {
        if (!window.confirm("Bạn chắc chắn muốn reset toàn bộ tiến trình Chu kỳ & Cốt truyện về mốc Cycle 12.1?")) return;
        SFX.alert();
        this.game.reset();
        this.game.saveToSlot("auto");
        this.activeEncounterScript = null;
        this.lastAppliedNodeKey = null;
        this.engine.updateSectorColors(this.game);
        this.refreshTopResources();
        this.populateChapterSelect();
        this.renderCodexTab();
        this.showToast("🔄 Đã Reset", "Vũ trụ đã quay về mốc khởi đầu Cycle 12.1!");
      });
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.cycle12App = new Cycle12App();
});
