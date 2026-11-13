// ============================================================================
// CYCLE 12: AGE OF DOMINION — MAIN APPLICATION CONTROLLER (v5.0)
// Tactical Card Game + Free Protagonist POV (72+Hybrids) + Cosmic Cutscenes +
// 11-Chapter Branching VN + 3D Galaxy Conquest + Sci-Fi Genetics Breeding Lab
// ============================================================================

import { META, FACTIONS, PLAYABLE, SUPERWEAPONS, SPECIES, TIMELINE } from "./data/lore.js";
import { SECTORS, SECTOR_BY_ID, findLocation, SECTOR_KIND_LABEL, BODY_KIND_LABEL, PLACE_KIND_LABEL } from "./data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID, RELATIONS, RACE_STYLE } from "./data/characters.js";
import { CHAPTERS, CHAPTER_BY_ID, buildEncounterScene, resolveStoryChar, resolveStorySector } from "./data/story.js";
import {
  CARD_BY_ID,
  resolveCard,
  getCardPortrait,
  getFactionCardPool,
  buildFactionDeck,
  validateDeckForLeader
} from "./data/cards.js";
import { buildHistoryCutscenes } from "./data/cutscenes.js";
import { GameState, ACHIEVEMENTS } from "./game/state.js";
import { CardBattleEngine } from "./game/card_engine.js";
import { CATALYSTS, previewBreeding, executeBreeding, resolveGeneticSubject } from "./game/breeding.js";
import {
  detectAIStatus,
  getStoredAIKeys,
  setStoredAIKeys,
  askAICharacterReply,
  askAIStoryExpand
} from "./game/ai_director.js";
import { UniverseEngine3D } from "./render/engine.js";
import { getPortraitUrl, getHybridPortraitUrl, getCustomPortrait, setCustomPortrait, clearPortraitCache, moodLabel } from "./render/portraits.js";
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
    this.duelTab = "skirmish"; // 'skirmish' | 'gauntlet' | 'deck'
    this.codexTab = "roster";  // 'roster' | 'cutscenes' | 'diplomacy' | 'events' | 'achievements' | 'species' | 'relations' | 'system'

    this.selectedSectorId = "sylvalon";
    this.selectedBodyId = null;
    this.inspectedRosterId = this.game.protagonistId || "arisia";

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

    // Card Game runtime
    this.duelEngine = null;
    this.inspectedDuelCard = null;
    this.duelContext = { kind: "skirmish", enemyId: "overlord", floor: 0, carryHp: null };
    this.aiChatHistory = [];
    this.aiBusy = false;
    detectAIStatus().then((st) => this.refreshAIStatusBadge(st));

    // Cutscene runtime
    this.cutsceneSlides = [];
    this.cutsceneIdx = 0;

    // Floating 3D labels
    this.labelDomCache = new Map();
    this.deferredInstallPrompt = null;

    // Three.js Cosmic Engine (Galaxy + VN Backdrops + DNA Helix + Cutscenes)
    this.engine = new UniverseEngine3D("canvas3d-container", {
      onSectorSelect: (secId) => this.selectSector(secId, true),
      onBodySelect: (secId, bodyId) => this.selectBody(secId, bodyId),
      onProjectLabels: (labels) => this.renderFloatingLabels(labels)
    });

    this.registerPWA();
    this.initNavigation();
    this.initTopHUD();
    this.initProtagonistModal();
    this.initCutsceneOverlay();
    this.initVNUI();
    this.initDuelUI();
    this.initGalaxyUI();
    this.initBreedingUI();
    this.initCodexUI();

    this.engine.updateSectorColors(this.game);
    this.refreshTopResources();
    this.renderVNNode();
    this.switchMode("vn");

    if (hadAutoSave && this.game.starterPicked) {
      const hero = this.game.getProtagonist();
      this.showToast("Đã khôi phục tiến trình", `${hero.name} • Chu kỳ ${this.game.cycleMajor}.${this.game.cycleMinor}`);
    } else {
      // Fresh campaign: invite player to pick any of 72 characters + optionally watch Universe Cutscene
      this.openProtagonistPicker(true);
    }
  }

  resolvePortrait(id) {
    if (CHAR_BY_ID[id]) return getPortraitUrl(CHAR_BY_ID[id]);
    const hy = (this.game.hybrids || []).find((h) => h.id === id);
    if (hy) return getHybridPortraitUrl(hy);
    return getPortraitUrl(CHAR_BY_ID.arisia);
  }

  resolveActorName(id) {
    if (CHAR_BY_ID[id]) return CHAR_BY_ID[id].name;
    const hy = (this.game.hybrids || []).find((h) => h.id === id);
    return hy ? hy.name : id;
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
      const { outcome } = await this.deferredInstallPrompt.userChoice;
      if (outcome === "accepted") installBtn.classList.add("hidden");
      this.deferredInstallPrompt = null;
    });
  }

  // ==========================================================================
  // NAVIGATION & MODE SWITCHER
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

    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });

    ["vn", "duel", "galaxy", "breeding", "codex"].forEach((m) => {
      const panel = document.getElementById(`panel-${m}`);
      if (panel) panel.classList.toggle("hidden", m !== mode);
    });

    if (mode !== "galaxy") {
      this.renderFloatingLabels([]);
    }

    this.engine.switchMode(mode);
    SFX.setMusicScene(mode);
    if (SFX.bgmOn && !SFX.bgmTimer) SFX.startBGM();

    if (mode === "vn") {
      const { node } = this.getActiveVNContext();
      const secId = resolveStorySector(node?.sector || "sylvalon", this.game);
      this.engine.setVNBackdrop(secId);
      this.renderVNNode();
    } else if (mode === "duel") {
      if (!this.duelEngine) {
        this.startCardMatch({ kind: "skirmish", enemyId: document.getElementById("duel-enemy-select")?.value || "overlord" });
      } else {
        this.renderDuelUI();
      }
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
    } else if (mode === "breeding") {
      this.refreshBreedingDropdowns();
      this.renderBreedingPreview();
      this.renderBreedingHybrids();
    } else if (mode === "codex") {
      this.renderCodexTab();
    }
  }

  // ==========================================================================
  // TOP HUD, SYNTH BGM & ACHIEVEMENT TOASTS
  // ==========================================================================
  initTopHUD() {
    document.getElementById("btn-hud-protagonist")?.addEventListener("click", () => {
      SFX.click();
      this.openProtagonistPicker(false);
    });

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
      this.showToast(SFX.bgmOn ? "🎶 Đã bật nhạc nền Synth" : "🎵 Đã tắt nhạc nền", "Âm thanh tự biến đổi theo VN, Đấu Thẻ Bài, Galaxy & Cutscene.");
    });

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
        this.showToast(`⏩ Chu Kỳ ${res.turn}`, "Tất cả thế lực đã thu ngân sách & bình ổn lại các hệ sao.");
      }
      this.checkAndToastAchievements();
    });
  }

  refreshTopResources() {
    const hero = this.game.getProtagonist();
    const res = this.game.resources[this.game.playerFaction] || { credits: 0 };
    document.getElementById("stat-turn").textContent = `${this.game.cycleMajor}.${this.game.cycleMinor}`;
    document.getElementById("stat-credits").textContent = Number(res.credits || 0).toLocaleString("en-US");
    document.getElementById("stat-tension").textContent = `${Math.round(this.game.tension)}%`;
    const pNameEl = document.getElementById("hud-protagonist-name");
    if (pNameEl) pNameEl.textContent = `⭐ ${hero.name.split(" ")[0]}`;
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
  // PROTAGONIST PICKER MODAL (TỰ DO CHỌN 1 TRONG 72 NHÂN VẬT + HẬU DUỆ LAI)
  // ==========================================================================
  initProtagonistModal() {
    const facSel = document.getElementById("protag-faction-filter");
    facSel.innerHTML = `<option value="ALL">Tất cả Phe (${CHARACTERS.length + (this.game.hybrids?.length || 0)})</option>` +
      Object.entries(FACTIONS).map(([fid, f]) => `<option value="${fid}">${ESC(f.name)}</option>`).join("");

    document.getElementById("protag-search").addEventListener("input", () => this.renderProtagonistGrid());
    facSel.addEventListener("change", () => this.renderProtagonistGrid());
    document.getElementById("btn-close-protagonist").addEventListener("click", () => {
      SFX.click();
      document.getElementById("protagonist-modal").classList.add("hidden");
    });
  }

  openProtagonistPicker(isInitial = false) {
    const modal = document.getElementById("protagonist-modal");
    const chk = document.getElementById("chk-watch-intro-cutscene");
    if (chk) chk.checked = isInitial;
    const facSel = document.getElementById("protag-faction-filter");
    if (facSel) facSel.value = "ALL";
    this.renderProtagonistGrid();
    modal.classList.remove("hidden");
  }

  renderProtagonistGrid() {
    const q = (document.getElementById("protag-search")?.value || "").trim().toLowerCase();
    const facF = document.getElementById("protag-faction-filter")?.value || "ALL";
    const pool = [...(this.game.hybrids || []).map((h) => ({ ...h, isHybrid: true })), ...CHARACTERS];

    const filtered = pool.filter((c) => {
      if (facF !== "ALL" && c.fac !== facF) return false;
      if (q && !(`${c.name} ${c.species} ${c.title || ""} ${this.game.facName(c.fac)}`.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => (b.cr || 0) - (a.cr || 0));

    const grid = document.getElementById("protag-grid");
    grid.innerHTML = filtered.map((c) => {
      const active = c.id === this.game.protagonistId ? "active" : "";
      const facCol = FACTIONS[c.fac]?.color || "#38bdf8";
      const img = c.isHybrid ? getHybridPortraitUrl(c) : getPortraitUrl(c);
      return `
        <button class="protag-card ${active}" data-pick-protag="${ESC(c.id)}">
          <img src="${img}" alt="${ESC(c.name)}" loading="lazy" />
          <div style="min-width:0;">
            <div style="font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.name)}</div>
            <div style="font-size:11px;color:${facCol};font-weight:700;">${ESC(this.game.facName(c.fac))}</div>
            <div class="muted" style="font-size:10.5px;">CR ${c.cr} • ${ESC(c.species)}</div>
          </div>
        </button>
      `;
    }).join("");

    grid.querySelectorAll("[data-pick-protag]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.pickProtag;
        const watchCut = document.getElementById("chk-watch-intro-cutscene")?.checked;
        SFX.choice();
        this.game.selectProtagonist(id, true);
        this.activeEncounterScript = null;
        this.lastAppliedNodeKey = null;
        this.duelEngine = null; // rebuild starter deck match
        this.inspectedRosterId = id;
        this.refreshTopResources();
        this.engine.updateSectorColors(this.game);
        document.getElementById("protagonist-modal").classList.add("hidden");
        this.switchMode("vn");
        this.showToast(`⭐ Góc nhìn: ${this.resolveActorName(id)}`, `Khởi đầu Chương Khởi Nguyên cùng Bộ Bài Chủ Tướng mới!`);
        if (watchCut) {
          this.playUniverseCutscene();
        }
      });
    });
  }

  // ==========================================================================
  // ANIMATED 3D UNIVERSE HISTORY CUTSCENE PLAYER
  // ==========================================================================
  initCutsceneOverlay() {
    document.getElementById("btn-play-cutscene")?.addEventListener("click", () => {
      SFX.click();
      this.playUniverseCutscene();
    });
    document.getElementById("btn-cutscene-prev").addEventListener("click", () => {
      SFX.click();
      if (this.cutsceneIdx > 0) {
        this.cutsceneIdx--;
        this.renderCutsceneSlide();
      }
    });
    document.getElementById("btn-cutscene-next").addEventListener("click", () => {
      SFX.choice();
      if (this.cutsceneIdx < this.cutsceneSlides.length - 1) {
        this.cutsceneIdx++;
        this.renderCutsceneSlide();
      } else {
        this.closeCutscene(true);
      }
    });
    document.getElementById("btn-cutscene-skip").addEventListener("click", () => {
      SFX.click();
      this.closeCutscene(false);
    });
  }

  playUniverseCutscene() {
    this.cutsceneSlides = buildHistoryCutscenes(this.game);
    this.cutsceneIdx = 0;
    document.getElementById("cutscene-overlay").classList.remove("hidden");
    this.engine.switchMode("cutscene");
    SFX.setMusicScene("cutscene");
    if (SFX.bgmOn && !SFX.bgmTimer) SFX.startBGM();
    this.renderCutsceneSlide();
  }

  renderCutsceneSlide() {
    const slide = this.cutsceneSlides[this.cutsceneIdx];
    if (!slide) return;
    SFX.cutscene();
    this.engine.setCutsceneStage(slide.scene3d, slide.sector, slide.accent);

    document.getElementById("cutscene-era-badge").textContent = slide.era;
    document.getElementById("cutscene-title").textContent = slide.title;
    document.getElementById("cutscene-narration").textContent = slide.narration;

    document.getElementById("cutscene-dots").innerHTML = this.cutsceneSlides
      .map((_, i) => `<span class="cutscene-dot ${i === this.cutsceneIdx ? "active" : ""}"></span>`)
      .join("");

    document.getElementById("btn-cutscene-prev").disabled = this.cutsceneIdx === 0;
    document.getElementById("btn-cutscene-next").textContent =
      this.cutsceneIdx === this.cutsceneSlides.length - 1 ? "🚀 Bắt Đầu Chiến Dịch!" : "Tiếp Theo ▶";
  }

  closeCutscene(completed) {
    document.getElementById("cutscene-overlay").classList.add("hidden");
    this.game.recordCutsceneWatched();
    this.checkAndToastAchievements();
    this.switchMode("vn");
    if (completed) {
      this.showToast("🎬 Kết thúc Sử Thi Gaiastra", "Chúc bạn dẫn dắt vận mệnh Chu Kỳ 12 thành công!");
    }
  }

  // ==========================================================================
  // MODE 1: INTERACTIVE VISUAL NOVEL ENGINE (11 CHAPTERS + POV)
  // ==========================================================================
  initVNUI() {
    this.populateChapterSelect();

    document.getElementById("btn-open-protagonist")?.addEventListener("click", () => {
      SFX.click();
      this.openProtagonistPicker(false);
    });

    document.getElementById("vn-chapter-select").addEventListener("change", (e) => {
      const val = e.target.value;
      SFX.click();
      if (val === "__encounter__") return;
      this.activeEncounterScript = null;
      this.game.vn.currentChapterId = val;
      this.game.vn.currentNodeId = "start";
      this.lastAppliedNodeKey = null;
      this.renderVNNode();
    });

    const autoBtn = document.getElementById("btn-vn-auto");
    autoBtn.addEventListener("click", () => {
      SFX.click();
      this.vnAutoPlay = !this.vnAutoPlay;
      autoBtn.classList.toggle("active", this.vnAutoPlay);
      autoBtn.textContent = this.vnAutoPlay ? "⏸ Đang tự đọc" : "▶ Tự đọc";
      if (this.vnAutoPlay && !this.isTyping) this.scheduleVNAutoAdvance();
      else clearTimeout(this.vnAutoTimer);
    });

    document.getElementById("btn-vn-restart").addEventListener("click", () => {
      SFX.click();
      this.game.vn.currentNodeId = "start";
      this.lastAppliedNodeKey = null;
      this.renderVNNode();
    });

    const hModal = document.getElementById("vn-history-modal");
    document.getElementById("btn-vn-history").addEventListener("click", () => {
      SFX.click();
      const list = document.getElementById("vn-history-list");
      const items = this.game.vn.history.slice().reverse();
      list.innerHTML = items.length === 0
        ? `<div class="muted">Chưa có dòng hội thoại nào được lưu.</div>`
        : items.map(h => `
          <div class="vn-history-item">
            <div style="font-size:11px;color:var(--primary);font-weight:700;">${ESC(h.speaker)} <span class="muted">• ${ESC(h.chapter)}</span></div>
            <div style="margin-top:4px;font-size:13px;">${ESC(h.text)}</div>
          </div>
        `).join("");
      hModal.classList.remove("hidden");
    });

    document.getElementById("btn-close-vn-history").addEventListener("click", () => {
      SFX.click();
      hModal.classList.add("hidden");
    });

    document.getElementById("vn-dialogue-box").addEventListener("click", (e) => {
      if (e.target.closest("button, input, select, #vn-ai-dock")) return;
      this.advanceVN();
    });

    document.getElementById("btn-vn-ai-expand")?.addEventListener("click", () => {
      SFX.choice();
      this.triggerAIStoryExpand();
    });

    const aiInput = document.getElementById("vn-ai-input");
    document.getElementById("btn-vn-ai-send")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.sendAIDialogueMessage();
    });
    aiInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.sendAIDialogueMessage();
      }
    });
  }

  refreshAIStatusBadge(st = null) {
    const el = document.getElementById("vn-ai-status-badge");
    if (!el) return;
    if (!st) {
      el.textContent = "🤖 AI Story";
      return;
    }
    const provs = [];
    if (st.proxyAvailable?.groq || st.byokAvailable?.groq) provs.push("Groq");
    if (st.proxyAvailable?.deepseek || st.byokAvailable?.deepseek) provs.push("DeepSeek");
    if (st.proxyAvailable?.openrouter || st.byokAvailable?.openrouter) provs.push("OpenRouter");
    el.textContent = provs.length ? `🤖 AI Ready (${provs[0]})` : "🤖 AI (BYOK)";
    el.style.color = provs.length ? "#4ade80" : "#94a3b8";
  }

  populateChapterSelect() {
    const sel = document.getElementById("vn-chapter-select");
    const doneSet = new Set(this.game.vn.completedChapters || []);
    const opts = CHAPTERS.map((ch) => {
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
    this.aiChatHistory = [];
    this.aiReturnNodeId = "start";
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

    const aiDock = document.getElementById("vn-ai-dock");
    if (aiDock) {
      const showDock = Boolean(isEncounter || node.allowAIInput || nodeId.startsWith("ai_"));
      aiDock.classList.toggle("hidden", !showDock);
    }

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

    const secId = resolveStorySector(node.sector, this.game);
    const sec = SECTOR_BY_ID[secId];
    document.getElementById("vn-location-pill").textContent = `📍 ${sec ? sec.name : "Vũ Trụ Gaiastra"}${sec?.realm ? " • " + sec.realm : ""}`;

    const leftId = node.leftChar ? resolveStoryChar(node.leftChar, this.game) : null;
    const rightId = node.rightChar ? resolveStoryChar(node.rightChar, this.game) : null;
    const speakerId = node.speaker === "narrator" ? "narrator" : resolveStoryChar(node.speaker, this.game);

    if (this.currentMode === "vn") {
      const spObj = CHAR_BY_ID[speakerId];
      const moodGlow = speakerId !== "narrator" && spObj
        ? (RACE_STYLE[spObj.race]?.aura || "#38bdf8")
        : "#38bdf8";
      this.engine.setVNBackdrop(secId || "sylvalon", moodGlow);
    }

    this.updateVNSprite("left", leftId, node.leftMood, speakerId);
    this.updateVNSprite("right", rightId, node.rightMood, speakerId);

    const badge = document.getElementById("vn-speaker-badge");
    const titleEl = document.getElementById("vn-speaker-title");
    let speakerLabel = "NGƯỜI DẪN CHUYỆN";
    if (speakerId === "narrator") {
      badge.textContent = speakerLabel;
      badge.classList.add("narrator");
      titleEl.textContent = `${script.num}: ${script.title}`;
    } else {
      const c = CHAR_BY_ID[speakerId] || this.game.hybrids?.find((h) => h.id === speakerId);
      speakerLabel = c ? c.name : speakerId;
      badge.textContent = speakerLabel;
      badge.classList.remove("narrator");
      const fac = c ? FACTIONS[c.fac] : null;
      titleEl.textContent = c ? `${c.title || "Hậu Duệ"} • ${fac?.name || ""}` : "";
    }

    const rawText = typeof node.text === "function" ? node.text(this.game) : String(node.text || "");
    this.fullVnText = rawText;

    const hist = this.game.vn.history;
    const last = hist[hist.length - 1];
    if (!last || last.text !== rawText || last.speaker !== speakerLabel) {
      hist.push({ speaker: speakerLabel, text: rawText, chapter: script.num || script.title });
      if (hist.length > 60) hist.shift();
    }

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
      if (idx % 10 === 0) SFX.blip(speakerId === "narrator" ? 380 : 520);
      this.typeTimer = setTimeout(stepType, 16);
    };
    stepType();
  }

  updateVNSprite(side, charId, mood, activeSpeaker) {
    const slot = document.getElementById(`vn-${side}-slot`);
    const img = document.getElementById(`vn-${side}-img`);
    const nameEl = document.getElementById(`vn-${side}-name`);
    const moodEl = document.getElementById(`vn-${side}-mood`);

    if (!charId) {
      slot.classList.add("hidden");
      return;
    }
    const c = CHAR_BY_ID[charId] || this.game.hybrids?.find((h) => h.id === charId);
    if (!c) {
      slot.classList.add("hidden");
      return;
    }
    slot.classList.remove("hidden");
    img.src = this.resolvePortrait(charId);
    nameEl.textContent = c.name;
    moodEl.textContent = moodLabel(mood);

    const isSpeaking = activeSpeaker === charId;
    const someoneElseSpeaking = activeSpeaker && activeSpeaker !== "narrator" && activeSpeaker !== charId;
    slot.classList.toggle("speaking", isSpeaking);
    slot.classList.toggle("dim", Boolean(someoneElseSpeaking));
  }

  finishTypingAndShowControls(node, isEncounter, script) {
    clearTimeout(this.typeTimer);
    this.isTyping = false;
    document.getElementById("vn-text").textContent = this.fullVnText;

    const choicesEl = document.getElementById("vn-choices");
    const hintEl = document.getElementById("vn-tap-hint");
    choicesEl.innerHTML = "";

    const validChoices = (node.choices || []).filter((ch) => !ch.cond || ch.cond(this.game));
    if (validChoices.length > 0) {
      hintEl.textContent = "Chọn một hướng đi bên trên";
      validChoices.forEach((ch) => {
        const btn = document.createElement("button");
        btn.className = `vn-choice-btn ${ch.battle ? "battle" : ""}`;
        btn.innerHTML = `
          <div>${ESC(ch.label)}</div>
          ${ch.hint ? `<span class="choice-hint">${ESC(ch.hint)}</span>` : ""}
        `;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.choice();
          this.selectVNChoice(ch, script, isEncounter);
        });
        choicesEl.appendChild(btn);
      });
      return;
    }

    if (node.end) {
      hintEl.textContent = node.end.title || "Kết thúc chương";
      const curIdx = CHAPTERS.findIndex((c) => c.id === script.id);
      const fallbackNext = !isEncounter && curIdx >= 0 && curIdx < CHAPTERS.length - 1 ? CHAPTERS[curIdx + 1].id : null;
      const nextChapId = node.end.nextChapter || fallbackNext;

      if (isEncounter) {
        if (script.id.startsWith("enc_")) {
          const cid = script.id.slice(4);
          const breedBtn = document.createElement("button");
          breedBtn.className = "vn-choice-btn";
          breedBtn.innerHTML = `<div>🧬 Đưa ${ESC(this.resolveActorName(cid))} vào Phòng Lab Lai Tạo Gen</div><span class="choice-hint">Tạo Hậu Duệ Hybrid mới cho Bộ Bài của bạn</span>`;
          breedBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            SFX.choice();
            this.openBreedingWith(cid);
          });
          choicesEl.appendChild(breedBtn);
        }

        const backBtn = document.createElement("button");
        backBtn.className = "vn-choice-btn battle";
        backBtn.innerHTML = `<div>↩️ Trở Về Bản Đồ & Hồ Sơ</div><span class="choice-hint">${ESC(node.end.summary || "")}</span>`;
        backBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.click();
          this.activeEncounterScript = null;
          this.lastAppliedNodeKey = null;
          this.switchMode("codex");
        });
        choicesEl.appendChild(backBtn);
      } else if (nextChapId && CHAPTER_BY_ID[nextChapId]) {
        const nextChap = CHAPTER_BY_ID[nextChapId];
        const nextBtn = document.createElement("button");
        nextBtn.className = "vn-choice-btn";
        nextBtn.innerHTML = `<div>📖 Sang ${ESC(nextChap.num)}: ${ESC(nextChap.title)} ➔</div><span class="choice-hint">${ESC(node.end.summary || "")}</span>`;
        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.choice();
          this.game.vn.currentChapterId = nextChapId;
          this.game.vn.currentNodeId = "start";
          this.lastAppliedNodeKey = null;
          this.renderVNNode();
        });
        choicesEl.appendChild(nextBtn);
      } else {
        const mapBtn = document.createElement("button");
        mapBtn.className = "vn-choice-btn";
        mapBtn.innerHTML = `<div>🌌 Chinh Phục Ngân Hà / 🃏 Leo Tháp Hư Không</div><span class="choice-hint">${ESC(node.end.summary || "")}</span>`;
        mapBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.click();
          this.switchMode("galaxy");
        });
        choicesEl.appendChild(mapBtn);
      }
      return;
    }

    hintEl.textContent = "Chạm / Click để tiếp tục ▸";
    if (this.vnAutoPlay) this.scheduleVNAutoAdvance();
  }

  async triggerAIStoryExpand() {
    if (this.aiBusy) return;
    const { script, isEncounter, nodeId, node } = this.getActiveVNContext();
    if (!script || !node) return;

    const btn = document.getElementById("btn-vn-ai-expand");
    const badge = document.getElementById("vn-ai-status-badge");
    const prevBtnText = btn ? btn.textContent : "✨ Mở Rộng AI";
    this.aiBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ AI Đang Viết...";
    }
    if (badge) {
      badge.textContent = "⏳ AI Đang Sáng Tác...";
      badge.style.color = "#facc15";
    }

    try {
      const baseReturnId = nodeId.startsWith("ai_") ? (this.aiReturnNodeId || "start") : nodeId;
      this.aiReturnNodeId = baseReturnId;

      if (isEncounter && script.id.startsWith("enc_")) {
        const npcId = script.id.slice(4);
        const res = await askAICharacterReply({
          gameState: this.game,
          npcId,
          userMessage: "",
          history: this.aiChatHistory || []
        });
        this.presentAICharacterNode(script, npcId, node, baseReturnId, res);
      } else {
        const res = await askAIStoryExpand({
          gameState: this.game,
          chapter: script,
          currentNodeText: this.fullVnText || (typeof node.text === "function" ? node.text(this.game) : String(node.text || ""))
        });

        const resumeNodeId = node.next && script.nodes[node.next] ? node.next : baseReturnId;
        const playerId = resolveStoryChar("PLAYER", this.game);
        const resolvedSpeaker = res.speakerId === "narrator"
          ? "narrator"
          : (CHAR_BY_ID[res.speakerId] || (this.game.hybrids || []).find((h) => h.id === res.speakerId)
            ? res.speakerId
            : (node.speaker || "narrator"));
        const leftChar = node.leftChar || "PLAYER";
        const rightChar = resolvedSpeaker !== "narrator" && resolvedSpeaker !== playerId
          ? resolvedSpeaker
          : node.rightChar;

        const aiExpId = `ai_exp_${Date.now().toString(36)}`;
        const expChoices = (res.choices || []).map((ch, idx) => {
          const outId = `${aiExpId}_out_${idx}`;
          script.nodes[outId] = {
            sector: node.sector || script.sector || "sylvalon",
            leftChar,
            rightChar,
            leftMood: "happy",
            rightMood: res.speakerMood || "tense",
            speaker: resolvedSpeaker,
            allowAIInput: true,
            text: `${ch.outcome || "Cục diện ngân hà xoay chuyển theo quyết định chiến lược của bạn."}`,
            effects: (g) => {
              if (ch.creditsDelta) g.addRes(g.playerFaction, "credits", Number(ch.creditsDelta));
              if (ch.tensionDelta) g.tension = Math.max(5, Math.min(100, (g.tension || 45) + Number(ch.tensionDelta)));
              if (ch.affinityDelta && rightChar) g.addAffinity(resolveStoryChar(rightChar, g), Number(ch.affinityDelta));
            },
            next: resumeNodeId
          };
          const bonusBits = [];
          if (ch.creditsDelta) bonusBits.push(`+${ch.creditsDelta} CR$`);
          if (ch.affinityDelta) bonusBits.push(`+${ch.affinityDelta} Tin cậy`);
          return {
            label: `✨ ${ch.label || `Phương án ${idx + 1}`}`,
            hint: bonusBits.length ? `${bonusBits.join(" • ")} • Nhánh AI Mở Rộng` : "Nhánh cốt truyện AI Mở Rộng",
            next: outId
          };
        });

        expChoices.push({
          label: "↩️ Quay lại mạch truyện chính",
          hint: "Tiếp tục diễn biến gốc của chương",
          next: resumeNodeId
        });

        script.nodes[aiExpId] = {
          sector: node.sector || script.sector || "sylvalon",
          leftChar,
          rightChar,
          leftMood: "tense",
          rightMood: res.speakerMood || "tense",
          speaker: resolvedSpeaker,
          allowAIInput: true,
          text: `${res.sceneText}\n\n[✨ AI Story Director • ${res.provider?.toUpperCase() || "AI"}${res.model ? ` / ${res.model}` : ""}]`,
          choices: expChoices
        };

        this.game.vn.currentNodeId = aiExpId;
        this.renderVNNode();
        this.finishTypingAndShowControls(script.nodes[aiExpId], isEncounter, script);
      }

      detectAIStatus().then((st) => this.refreshAIStatusBadge(st));
    } catch (err) {
      SFX.alert();
      this.showToast("⚠️ AI Story Tạm Gián Đoạn", err.message || "Không thể kết nối AI. Hãy kiểm tra API Key trong Mục Lục → Hệ Thống.");
      detectAIStatus(true).then((st) => this.refreshAIStatusBadge(st));
    } finally {
      this.aiBusy = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevBtnText;
      }
    }
  }

  presentAICharacterNode(script, npcId, sourceNode, returnNodeId, res) {
    if (res.creditsDelta) this.game.addRes(this.game.playerFaction, "credits", res.creditsDelta);
    if (res.tensionDelta) this.game.tension = Math.max(5, Math.min(100, (this.game.tension || 45) + res.tensionDelta));
    if (res.affinityDelta) this.game.addAffinity(npcId, res.affinityDelta);
    this.refreshTopResources();

    const playerId = resolveStoryChar("PLAYER", this.game);
    const rightChar = npcId !== playerId ? npcId : sourceNode?.rightChar;
    const replyId = `ai_chat_${Date.now().toString(36)}`;

    const choices = (res.followUpPrompts || []).slice(0, 2).map((promptText) => ({
      label: `💬 "${promptText}"`,
      hint: "Gửi câu hỏi/phản hồi này tới AI nhập vai",
      onSelect: () => this.sendAIDialogueMessage(promptText)
    }));
    choices.push({
      label: "↩️ Quay lại các lựa chọn gặp gỡ",
      hint: "Đổi sang hành động chuẩn / Tặng quà / Thách đấu / Kết thúc",
      next: returnNodeId
    });

    const statNotes = [];
    if (res.affinityDelta) statNotes.push(`${res.affinityDelta > 0 ? "+" : ""}${res.affinityDelta} Độ tin cậy`);
    if (res.creditsDelta) statNotes.push(`+${res.creditsDelta} CR$`);

    script.nodes[replyId] = {
      sector: sourceNode?.sector || script.sector || "sylvalon",
      leftChar: sourceNode?.leftChar || "PLAYER",
      rightChar,
      leftMood: "neutral",
      rightMood: res.mood || "tense",
      speaker: npcId,
      allowAIInput: true,
      text: `${res.narration ? `[${res.narration}]\n\n` : ""}${res.reply}\n\n[🤖 ${res.provider?.toUpperCase() || "AI"}${statNotes.length ? ` • ${statNotes.join(" • ")}` : ""}]`,
      choices
    };

    this.game.vn.currentNodeId = replyId;
    this.renderVNNode();
    this.finishTypingAndShowControls(script.nodes[replyId], Boolean(this.activeEncounterScript), script);
  }

  async sendAIDialogueMessage(presetMsg = null) {
    if (this.aiBusy) return;
    const input = document.getElementById("vn-ai-input");
    const sendBtn = document.getElementById("btn-vn-ai-send");
    const msg = typeof presetMsg === "string" ? presetMsg.trim() : (input ? input.value.trim() : "");
    if (!msg) return;

    const { script, isEncounter, nodeId, node } = this.getActiveVNContext();
    if (!script || !node) return;

    const playerId = resolveStoryChar("PLAYER", this.game);
    let npcId = isEncounter && script.id.startsWith("enc_") ? script.id.slice(4) : null;
    if (!npcId) {
      const rightResolved = node.rightChar ? resolveStoryChar(node.rightChar, this.game) : null;
      const leftResolved = node.leftChar ? resolveStoryChar(node.leftChar, this.game) : null;
      const spResolved = node.speaker && node.speaker !== "narrator" ? resolveStoryChar(node.speaker, this.game) : null;
      npcId = [rightResolved, spResolved, leftResolved].find((id) => id && id !== playerId) || playerId;
    }

    const badge = document.getElementById("vn-ai-status-badge");
    const prevSend = sendBtn ? sendBtn.textContent : "💬 Gửi AI";
    this.aiBusy = true;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "⏳...";
    }
    if (badge) {
      badge.textContent = "⏳ AI đang nhập vai...";
      badge.style.color = "#facc15";
    }

    try {
      this.aiChatHistory = this.aiChatHistory || [];
      const res = await askAICharacterReply({
        gameState: this.game,
        npcId,
        userMessage: msg,
        history: this.aiChatHistory
      });
      this.aiChatHistory.push({ role: "user", content: msg });
      this.aiChatHistory.push({ role: "assistant", content: res.reply });
      if (this.aiChatHistory.length > 12) this.aiChatHistory = this.aiChatHistory.slice(-12);

      if (input && typeof presetMsg !== "string") input.value = "";
      const baseReturnId = nodeId.startsWith("ai_") ? (this.aiReturnNodeId || "start") : nodeId;
      this.aiReturnNodeId = baseReturnId;

      this.presentAICharacterNode(script, npcId, node, baseReturnId, res);
      detectAIStatus().then((st) => this.refreshAIStatusBadge(st));
    } catch (err) {
      SFX.alert();
      this.showToast("⚠️ Lỗi AI Đối Thoại", err.message || "Kiểm tra API Key trong Mục Lục → Hệ Thống.");
      detectAIStatus(true).then((st) => this.refreshAIStatusBadge(st));
    } finally {
      this.aiBusy = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = prevSend;
      }
    }
  }

  scheduleVNAutoAdvance() {
    clearTimeout(this.vnAutoTimer);
    this.vnAutoTimer = setTimeout(() => {
      if (this.currentMode === "vn" && this.vnAutoPlay && !this.isTyping) {
        this.advanceVN();
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
    if ((node.choices && node.choices.length > 0) || node.end) return;

    if (node.next && script.nodes[node.next]) {
      SFX.click();
      this.game.vn.currentNodeId = node.next;
      this.renderVNNode();
    }
  }

  selectVNChoice(choice, script, isEncounter) {
    if (typeof choice.onSelect === "function") {
      choice.onSelect();
      return;
    }
    if (typeof choice.effects === "function") {
      choice.effects(this.game);
      this.refreshTopResources();
      this.engine.updateSectorColors(this.game);
    }

    if (choice.battle) {
      const pId = resolveStoryChar(choice.battle.playerId, this.game);
      const eId = resolveStoryChar(choice.battle.enemyId, this.game);
      const sId = resolveStorySector(choice.battle.stageId, this.game);

      this.pendingStoryBattle = {
        isEncounter,
        scriptId: script.id,
        encounterScript: isEncounter ? this.activeEncounterScript : null,
        winNext: choice.battle.winNext,
        loseNext: choice.battle.loseNext
      };
      this.pendingInvasionSectorId = null;

      this.switchMode("duel");
      this.setDuelTab("skirmish");
      this.startCardMatch({
        kind: "story",
        playerCharId: pId,
        enemyId: eId,
        stageId: sId,
        modeLabel: "Đấu Thẻ Cốt Truyện"
      });
      return;
    }

    if (choice.breedTargetId) {
      this.openBreedingWith(choice.breedTargetId);
      return;
    }

    if (choice.next && script.nodes[choice.next]) {
      this.game.vn.currentNodeId = choice.next;
      this.game.saveToSlot("auto");
      this.renderVNNode();
    }
  }

  // ==========================================================================
  // MODE 2: TACTICAL 3-ROW FACTION & CR CARD DUEL (HÀNG 1 / HÀNG 2 / HÀNG 3)
  // ==========================================================================
  initDuelUI() {
    const eSel = document.getElementById("duel-enemy-select");
    const sorted = [...CHARACTERS].sort((a, b) => b.cr - a.cr);
    eSel.innerHTML = sorted.map(c => `<option value="${c.id}">${ESC(c.name)} (${ESC(FACTIONS[c.fac]?.name || c.fac)} • CR ${c.cr})</option>`).join("");
    eSel.value = "overlord";

    document.querySelectorAll("[data-dtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.setDuelTab(btn.dataset.dtab);
      });
    });

    document.getElementById("btn-start-duel").addEventListener("click", () => {
      SFX.choice();
      this.pendingStoryBattle = null;
      this.pendingInvasionSectorId = null;
      this.startCardMatch({
        kind: "skirmish",
        enemyId: eSel.value,
        modeLabel: "Đấu Thẻ 3 Hàng"
      });
    });

    document.getElementById("btn-start-gauntlet").addEventListener("click", () => {
      SFX.choice();
      this.pendingStoryBattle = null;
      this.pendingInvasionSectorId = null;
      this.startGauntletFloor(1);
    });

    document.getElementById("btn-resolve-clash").addEventListener("click", () => {
      if (!this.duelEngine || this.duelEngine.over) return;
      const res = this.duelEngine.resolveClashTurn();
      if (!res.ok) {
        SFX.alert();
        this.showToast("Chưa thể giao chiến", res.reason || "Đặt thẻ ra Hàng 1 trước khi đấu!");
        return;
      }
      if (res.newTokens && res.newTokens.length) {
        SFX.breed();
        this.showToast(
          "🧬 Lai Tạo Cuối Lượt!",
          `${res.newTokens.map((t) => `${t.name} (CR ${t.cr})`).join(", ")} vừa xuất hiện ngay sau lượt!`
        );
      } else {
        SFX.cardHit();
      }
      this.renderDuelUI();
      if (this.duelEngine.over) this.showDuelOutcome();
    });

    document.getElementById("btn-auto-deck").addEventListener("click", () => {
      SFX.choice();
      this.game.customDeck = buildFactionDeck(this.game.protagonistId, this.game.hybrids);
      this.game.saveToSlot("auto");
      this.renderDeckBuilder();
      const protag = this.game.getProtagonist();
      this.showToast("✨ Đã xếp Bộ Bài Phe", `16 lá thuộc phe ${this.game.facName(protag.fac)} theo Thủ lĩnh ${protag.name}.`);
    });

    document.getElementById("deck-search-input").addEventListener("input", () => this.renderDeckBuilder());

    // Victory / Post-Duel modal handlers
    const vModal = document.getElementById("duel-victory-modal");
    document.getElementById("btn-victory-story").addEventListener("click", () => {
      SFX.choice();
      vModal.classList.add("hidden");
      if (!this.pendingStoryBattle) return;
      const ctx = this.pendingStoryBattle;
      const won = this.duelEngine?.winner === "player";
      this.pendingStoryBattle = null;
      this.activeEncounterScript = ctx.encounterScript;
      if (!ctx.isEncounter) this.game.vn.currentChapterId = ctx.scriptId;
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

    document.getElementById("btn-victory-next-floor").addEventListener("click", () => {
      SFX.choice();
      vModal.classList.add("hidden");
      const nextF = (this.duelContext.floor || 1) + 1;
      this.startGauntletFloor(nextF);
    });

    document.getElementById("btn-victory-close").addEventListener("click", () => {
      SFX.click();
      vModal.classList.add("hidden");
      if (this.duelContext.kind === "gauntlet") {
        this.startGauntletFloor(1);
      } else {
        this.startCardMatch({ kind: "skirmish", enemyId: document.getElementById("duel-enemy-select").value });
      }
    });
  }

  setDuelTab(tab) {
    this.duelTab = tab;
    document.querySelectorAll("[data-dtab]").forEach((b) => b.classList.toggle("active", b.dataset.dtab === tab));
    document.getElementById("duel-battle-view").classList.toggle("hidden", tab === "deck");
    document.getElementById("duel-deck-view").classList.toggle("hidden", tab !== "deck");
    document.getElementById("duel-skirmish-controls").classList.toggle("hidden", tab !== "skirmish");
    document.getElementById("duel-gauntlet-controls").classList.toggle("hidden", tab !== "gauntlet");

    if (tab === "deck") {
      this.renderDeckBuilder();
    } else if (tab === "gauntlet" && this.duelContext.kind !== "gauntlet") {
      document.getElementById("gauntlet-floor-badge").textContent = `🗼 Tầng 1 • Kỷ lục: ${this.game.stats?.gauntletMax || 0}`;
    }
  }

  startCardMatch({ kind = "skirmish", playerCharId = null, enemyId = "overlord", buffMult = 1, modeLabel = "Đấu Thẻ 3 Hàng", gauntletFloor = 0, difficulty = 1 } = {}) {
    const pId = playerCharId || this.game.protagonistId || "arisia";
    const legalDeck = validateDeckForLeader(this.game.customDeck || [], pId, this.game.hybrids || []);
    const activeDeck = legalDeck.length >= 6 ? legalDeck : buildFactionDeck(pId, this.game.hybrids || []);

    const effDifficulty = buffMult > 1 ? Math.min(difficulty, 0.85) : difficulty;
    this.duelContext = { kind, enemyId, floor: gauntletFloor, buffMult };
    this.duelEngine = new CardBattleEngine({
      playerLeaderId: pId,
      playerDeckIds: activeDeck,
      enemyLeaderId: enemyId,
      hybrids: this.game.hybrids || [],
      difficulty: effDifficulty,
      sectorId: this.pendingInvasionSectorId || null,
      gameStateRef: this.game
    });
    this.duelEngine.modeLabel = modeLabel;
    document.getElementById("duel-victory-modal").classList.add("hidden");
    this.renderDuelUI();
  }

  startGauntletFloor(floor = 1) {
    const sorted = [...CHARACTERS].sort((a, b) => a.cr - b.cr);
    const bossIdx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * Math.min(1, 0.25 + floor * 0.14)));
    const boss = sorted[bossIdx] || CHAR_BY_ID.overlord;
    this.setDuelTab("gauntlet");
    document.getElementById("gauntlet-floor-badge").textContent = `🗼 Đang ở Tầng ${floor} • Kỷ lục: ${this.game.stats?.gauntletMax || 0}`;
    this.startCardMatch({
      kind: "gauntlet",
      enemyId: boss.id,
      modeLabel: `🗼 Tháp Hư Không Tầng ${floor}`,
      gauntletFloor: floor,
      difficulty: 0.9 + floor * 0.2
    });
  }

  inspectDuelCard(card, evalCR = null) {
    const bar = document.getElementById("duel-card-inspector");
    if (!bar) return;
    if (!card) {
      bar.innerHTML = `<span class="muted">🔍 Chạm hoặc di chuột vào bất kỳ thẻ bài nào để xem rõ CR, Loài, Phe, ♂/♀, Nội tại Hàng 1 (Chiến đấu) &amp; Hàng 2 (Sinh sản).</span>`;
      return;
    }
    this.inspectedDuelCard = card;
    const isM = card.gender === "Male";
    const facLabel = FACTIONS[card.fac]?.name || card.fac;
    const crStr = evalCR ? `Tổng CR ${evalCR.total} (Gốc ${card.cr})` : `CR ${card.cr}`;
    const r2 = card.row2Effect || {};
    const penWarn = r2.crPenaltyPct ? ` • <span style="color:#fda4af;">Debuff -${r2.crPenaltyPct}% CR Token</span>` : "";
    const sireLine = card.breedingActive && card.sireCard
      ? ` • <span style="color:#f472b6;">Đang lai cùng ♂ ${ESC(card.sireCard.name)} (${this.duelEngine?.getEffectiveBreedChance(card) || r2.breedChance || 50}%/lượt, đã sinh ${card.spawnCount || 0})</span>`
      : "";
    bar.innerHTML = `
      <img src="${getCardPortrait(card)}" style="width:36px;height:40px;border-radius:7px;object-fit:cover;object-position:top center;flex-shrink:0;" alt="" />
      <div style="flex:1;min-width:0;line-height:1.35;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <strong style="color:#fff;">${ESC(card.name)}</strong>
          <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂ Nam" : "♀ Nữ"}</span>
          <span style="color:#fbbf24;font-weight:800;">⚔️ ${crStr}</span>
          <span class="muted">${ESC(card.species)} • ${ESC(facLabel)}</span>
          ${card.isToken ? `<span class="badge" style="color:#f472b6;border-color:rgba(244,114,182,0.5);">🪙 TOKEN LAI</span>` : ""}
        </div>
        <div style="font-size:10.5px;color:#7dd3fc;">⚔️ Hàng 1: ${ESC(card.row1Effect?.desc || "Đánh trực tiếp theo tổng CR")}</div>
        <div style="font-size:10.5px;color:#fbcfe8;">🧬 Hàng 2: ${ESC(r2.desc || "Hỗ trợ +60 CR")}${penWarn}${sireLine}</div>
      </div>
    `;
  }

  renderDuelUI() {
    const eng = this.duelEngine;
    if (!eng) return;

    const pLeader = eng.player.leader;
    const eLeader = eng.enemy.leader;
    const pFacName = FACTIONS[pLeader.fac]?.name || pLeader.fac;
    const eFacName = FACTIONS[eLeader.fac]?.name || eLeader.fac;

    document.getElementById("deck-count-badge").textContent = validateDeckForLeader(this.game.customDeck || [], this.game.protagonistId, this.game.hybrids).length;

    // Row 3 Outer Leader Slots
    const eRow3Eval = eng.evalCardCombatCR(eLeader, eng.getRow1Cards("player")[0] || null, "enemy", { attackingRow3: true });
    const pRow3Eval = eng.evalCardCombatCR(pLeader, eng.getRow1Cards("enemy")[0] || null, "player", { attackingRow3: true });
    const eFrontCount = eng.getRow1Cards("enemy").length;
    const pFrontCount = eng.getRow1Cards("player").length;

    const eWingBar = document.querySelector(".commander-bar.enemy.row3-slot");
    const pWingBar = document.querySelector(".commander-bar.player.row3-slot");
    eWingBar?.classList.toggle("exposed", eFrontCount === 0);
    pWingBar?.classList.toggle("exposed", pFrontCount === 0);

    document.getElementById("duel-e-img").src = getCardPortrait(eLeader);
    document.getElementById("duel-e-name").innerHTML = `${ESC(eLeader.name)} <span class="gender-pill ${eLeader.gender === "Male" ? "male" : "female"}">${eLeader.gender === "Male" ? "♂" : "♀"}</span>`;
    document.getElementById("duel-e-meta").textContent = `${eLeader.species} • Phe ${eFacName} • H1: ${eLeader.row1Effect?.tag || ""}`;
    document.getElementById("duel-e-row3-cr").textContent = `⚔️ CR Hàng 3: ${eRow3Eval.total} (Gốc ${eLeader.cr})`;
    document.getElementById("duel-e-row3-state").textContent = eFrontCount > 0 ? `🛡️ Hàng 1 Bảo Hộ (${eFrontCount} lá)` : "⚡ LỘ DIỆN — Tổng CR H1 đánh thẳng Hàng 3!";
    document.getElementById("duel-e-captives").textContent = `🔒 Bắt: ${eng.enemy.row2.length}/3`;

    document.getElementById("duel-p-img").src = getCardPortrait(pLeader);
    document.getElementById("duel-p-name").innerHTML = `${ESC(pLeader.name)} <span class="gender-pill ${pLeader.gender === "Male" ? "male" : "female"}">${pLeader.gender === "Male" ? "♂" : "♀"}</span>`;
    document.getElementById("duel-p-meta").textContent = `${pLeader.species} • Phe ${pFacName} • H1: ${pLeader.row1Effect?.tag || ""}`;
    document.getElementById("duel-p-row3-cr").textContent = `⚔️ CR Hàng 3: ${pRow3Eval.total} (Gốc ${pLeader.cr})`;
    document.getElementById("duel-p-row3-state").textContent = pFrontCount > 0 ? `🛡️ Hàng 1 Bảo Hộ (${pFrontCount} lá)` : "⚠️ HÀNG 1 TRỐNG — Hàng 3 bị uy hiếp!";
    document.getElementById("duel-p-captives").textContent = `🔒 Bắt: ${eng.player.row2.length}/3`;
    document.getElementById("duel-p-deck-count").textContent = `📚 Bộ bài: ${eng.player.deck.length} (+2/lượt)`;

    document.getElementById("duel-turn-badge").textContent = `${eng.modeLabel || "Snap × YGO"} • Lượt ${eng.turn}`;
    const lastLog = eng.log[eng.log.length - 1];
    document.getElementById("duel-log-latest").textContent = lastLog || "";

    // Row 2 Captives & Automatic Male×Female Breeding Zones
    const renderRow2Chips = (sideKey, list, emptyMsg, isEnemy) => {
      if (!list.length) return `<span class="muted" style="font-size:11px;">${emptyMsg}</span>`;
      return list.map((c, idx) => {
        const isBreeding = Boolean(c.breedingActive);
        const effPct = isBreeding ? eng.getEffectiveBreedChance(c) : 0;
        const r2 = c.row2Effect || {};
        const penBadge = r2.crPenaltyPct ? ` • <span style="color:#fda4af;">-${r2.crPenaltyPct}% CR</span>` : "";
        const subText = isBreeding
          ? `🔥 Lai ${effPct}%/lượt (♂ ${ESC(c.sireCard?.name || "Nam")}) • 🪙x${c.spawnCount || 0}${penBadge}`
          : `🔒 Tù binh • H2: +${r2.crAura || 60} CR (${ESC(r2.tag || "")})`;
        return `
          <div class="row2-captive-chip ${isBreeding ? "breeding-chamber" : ""}"
               data-inspect-side="${sideKey}" data-inspect-zone="row2" data-inspect-idx="${idx}"
               title="${ESC(r2.desc || "")}">
            <img src="${getCardPortrait(c)}" alt="${ESC(c.name)}" />
            <div>
              <strong>${ESC(c.name)}</strong>
              <span class="gender-pill ${c.gender === "Male" ? "male" : "female"}">${c.gender === "Male" ? "♂" : "♀"}</span>
              <span class="muted">(${ESC(c.species)})</span>
              <div style="font-size:10px;color:${isBreeding ? "#f9a8d4" : (isEnemy ? "#fda4af" : "#bae6fd")};">${subText}</div>
            </div>
          </div>
        `;
      }).join("");
    };

    document.getElementById("duel-e-row2-aura").textContent = `Hỗ trợ Địch: +${eng.getRow2SupportAura("enemy")} CR`;
    const eRow2El = document.getElementById("duel-e-row2");
    eRow2El.innerHTML = renderRow2Chips("enemy", eng.enemy.row2, "Chưa bắt được thẻ nào (Địch bắt 3 lá = Bạn thua!)", true);

    document.getElementById("duel-p-row2-aura").textContent = `Hỗ trợ Hàng 1: +${eng.getRow2SupportAura("player")} CR`;
    const pRow2El = document.getElementById("duel-p-row2");
    pRow2El.innerHTML = renderRow2Chips("player", eng.player.row2, "Trống — Thẻ Nam thắng thẻ Nữ sẽ đưa vào đây lai tự động mỗi cuối lượt!", false);

    // Marvel Snap 3 Cosmic Lane Locations + Live Power Comparison
    const lanesEl = document.getElementById("duel-lanes-bar");
    if (lanesEl) {
      lanesEl.innerHTML = (eng.lanes || []).map((loc, i) => {
        const pUnit = eng.player.row1[i];
        const eUnit = eng.enemy.row1[i];
        const pCR = pUnit ? eng.evalCardCombatCR(pUnit, eUnit, "player", { laneIdx: i }).total : 0;
        const eCR = eUnit ? eng.evalCardCombatCR(eUnit, pUnit, "enemy", { laneIdx: i }).total : 0;
        const statusCls = pCR > eCR ? "win" : (eCR > pCR ? "lose" : "");
        return `
          <div class="lane-loc-card ${statusCls}" title="${ESC(loc.desc)}">
            <div class="lane-loc-head">
              <span>${ESC(loc.name)}</span>
              <span>Làn ${i + 1}</span>
            </div>
            <div class="lane-loc-desc">${ESC(loc.desc)}</div>
            <div class="lane-cr-meter">
              <span style="color:#7dd3fc;">Ta ${pCR}</span>
              <span style="color:#fbbf24;">VS</span>
              <span style="color:#fda4af;">Địch ${eCR}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    // Enemy Row 1 (3 Vertical Lanes)
    document.getElementById("duel-e-row1").innerHTML = eng.enemy.row1.map((u, i) => {
      if (!u) return `<div class="board-slot">Địch Làn ${i + 1} (Trống)</div>`;
      const pOpp = eng.player.row1[i];
      const evalCR = eng.evalCardCombatCR(u, pOpp, "enemy", { laneIdx: i });
      const isM = u.gender === "Male";
      return `
        <div class="board-slot">
          <div class="tcg-unit-card enemy-unit ${u.isToken ? "is-token" : ""}"
               data-inspect-side="enemy" data-inspect-zone="row1" data-inspect-idx="${i}"
               title="${ESC(u.row1Effect?.desc || "")}">
            <span class="card-cr-pill">CR ${evalCR.total}</span>
            ${u.isToken ? `<span class="token-pill">🪙 TOKEN</span>` : ""}
            <img src="${getCardPortrait(u)}" alt="${ESC(u.name)}" />
            <div style="min-width:0; flex:1;">
              <div style="display:flex;align-items:center;gap:4px;min-width:0;">
                <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
                <span style="font-weight:800;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(u.name)}</span>
              </div>
              <div style="font-size:9.5px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(u.species)} • ${ESC(FACTIONS[u.fac]?.name || u.fac)}</div>
              <div style="font-size:10px;color:#fda4af;font-weight:800;">Gốc ${u.cr} → ${evalCR.total}</div>
              <div class="muted" style="font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">⚔️ ${ESC(u.row1Effect?.tag || "")}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Player Row 1 (3 Vertical Lanes)
    const pRow1El = document.getElementById("duel-p-row1");
    const hasSelectedHand = eng.selectedHandIdx !== null && eng.player.hand[eng.selectedHandIdx];
    pRow1El.innerHTML = eng.player.row1.map((u, i) => {
      if (!u) {
        return `
          <button class="board-slot ${hasSelectedHand ? "droppable" : ""}" data-deploy-lane="${i}">
            ${hasSelectedHand ? `📥 Đặt vào Làn ${i + 1}` : `Hàng 1 — Làn ${i + 1}`}
          </button>
        `;
      }
      const eOpp = eng.enemy.row1[i];
      const evalCR = eng.evalCardCombatCR(u, eOpp, "player", { laneIdx: i });
      const canRecall = u.deployedTurn === eng.turn && !eng.over;
      const isM = u.gender === "Male";
      return `
        <div class="board-slot">
          <button class="tcg-unit-card ${canRecall ? "ready" : ""} ${u.isToken ? "is-token" : ""}"
                  data-recall-lane="${i}"
                  data-inspect-side="player" data-inspect-zone="row1" data-inspect-idx="${i}"
                  title="${canRecall ? "Bấm để thu hồi về tay trước khi Giao Chiến" : ESC(u.row1Effect?.desc || "")}">
            <span class="card-cr-pill">CR ${evalCR.total}</span>
            ${u.isToken ? `<span class="token-pill">🪙 TOKEN</span>` : ""}
            <img src="${getCardPortrait(u)}" alt="${ESC(u.name)}" />
            <div style="min-width:0; flex:1;">
              <div style="display:flex;align-items:center;gap:4px;min-width:0;">
                <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
                <span style="font-weight:800;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(u.name)}</span>
              </div>
              <div style="font-size:9.5px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(u.species)} • ${ESC(FACTIONS[u.fac]?.name || u.fac)}</div>
              <div style="font-size:10px;color:#86efac;font-weight:800;">Gốc ${u.cr} → ${evalCR.total}</div>
              <div class="muted" style="font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${canRecall ? "↩️ Thu hồi • " : ""}⚔️ ${ESC(u.row1Effect?.tag || "")}</div>
            </div>
          </button>
        </div>
      `;
    }).join("");

    pRow1El.querySelectorAll("[data-deploy-lane]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lane = Number(btn.dataset.deployLane);
        if (eng.selectedHandIdx === null) {
          this.showToast("Chọn thẻ trên tay", "Hãy bấm chọn 1 thẻ phe bạn ở dưới tay trước khi chọn Làn Hàng 1!");
          return;
        }
        const res = eng.deployCardToRow1(eng.selectedHandIdx, lane);
        if (res.ok) {
          SFX.cardPlay();
          this.renderDuelUI();
        } else {
          SFX.alert();
          this.showToast("Không thể đặt bài", res.reason);
        }
      });
    });

    pRow1El.querySelectorAll("[data-recall-lane]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const res = eng.recallFromRow1(Number(btn.dataset.recallLane));
        if (res.ok) {
          SFX.click();
          this.renderDuelUI();
        } else if (res.reason) {
          this.showToast("Đang trấn giữ", res.reason);
        }
      });
    });

    // Player Hand (TCG Upright Cards with Gender, Species, Faction, H1 & H2 Passives)
    const handEl = document.getElementById("duel-p-hand");
    const openLane = eng.player.row1.findIndex((s) => s === null);
    handEl.innerHTML = eng.player.hand.map((c, idx) => {
      const isSelected = eng.selectedHandIdx === idx;
      const canDeploy = !eng.over && openLane >= 0;
      const facLabel = FACTIONS[c.fac]?.name || c.fac;
      const isM = c.gender === "Male";
      const r2 = c.row2Effect || {};
      const r2Color = r2.crPenaltyPct ? "#fda4af" : (r2.tier === "tamarite" ? "#fde68a" : "#fbcfe8");
      return `
        <button class="hand-card ${canDeploy ? "playable" : "unaffordable"} ${isSelected ? "selected" : ""} ${c.isHybrid || c.isToken ? "rarity-hybrid" : ""}"
                data-hand-idx="${idx}"
                data-inspect-side="player" data-inspect-zone="hand" data-inspect-idx="${idx}"
                title="H1: ${ESC(c.row1Effect?.desc || "")} | H2: ${ESC(r2.desc || "")}">
          <span class="card-cr-pill">CR ${c.cr}</span>
          ${c.isToken ? `<span class="token-pill">🪙 TOKEN</span>` : ""}
          <img class="hand-card-thumb" src="${getCardPortrait(c)}" alt="${ESC(c.name)}" />
          <div style="display:flex;align-items:center;gap:4px;margin-top:3px;min-width:0;">
            <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
            <span style="font-weight:800;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.name)}</span>
          </div>
          <div style="font-size:9.5px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.species)} • ${ESC(facLabel)}</div>
          <div style="font-size:9px;color:#7dd3fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">⚔️ H1: ${ESC(c.row1Effect?.tag || "")}</div>
          <div style="font-size:9px;color:${r2Color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🧬 H2: ${ESC(r2.tag || `+${r2.crAura || 60} CR`)}</div>
        </button>
      `;
    }).join("");

    handEl.querySelectorAll("[data-hand-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.handIdx);
        const card = eng.player.hand[idx];
        if (card) this.inspectDuelCard(card);
        const firstEmpty = eng.player.row1.findIndex((s) => s === null);
        if (firstEmpty < 0) {
          SFX.alert();
          this.showToast("Hàng 1 đã đủ 3 lá", "Hãy bấm Giao Chiến Chiều Dọc hoặc thu hồi 1 lá vừa đặt để đổi làn!");
          return;
        }
        // Second click on already-selected card auto-deploys into first open Row 1 lane;
        // First click highlights open lanes so player can place into an exact vertical lane!
        if (eng.selectedHandIdx === idx) {
          const res = eng.deployCardToRow1(idx, firstEmpty);
          if (res.ok) {
            SFX.cardPlay();
            this.renderDuelUI();
          } else {
            SFX.alert();
            this.showToast("Không thể ra bài", res.reason);
          }
        } else {
          SFX.click();
          eng.selectedHandIdx = idx;
          this.renderDuelUI();
        }
      });
    });

    // Attach hover/click card inspection across Board & Row 2
    document.querySelectorAll("#duel-battle-view [data-inspect-zone]").forEach((el) => {
      const resolveSubject = () => {
        const side = eng[el.dataset.inspectSide];
        const zone = el.dataset.inspectZone;
        const idx = Number(el.dataset.inspectIdx);
        const card = side?.[zone]?.[idx];
        if (!card) return;
        const evalCR = zone === "row1"
          ? eng.evalCardCombatCR(card, eng[el.dataset.inspectSide === "player" ? "enemy" : "player"].row1[idx], el.dataset.inspectSide, { laneIdx: idx })
          : null;
        this.inspectDuelCard(card, evalCR);
      };
      el.addEventListener("pointerenter", resolveSubject);
      if (el.dataset.inspectZone !== "hand") el.addEventListener("click", resolveSubject);
    });

    if (hasSelectedHand) this.inspectDuelCard(hasSelectedHand);
    else if (!this.inspectedDuelCard) this.inspectDuelCard(pLeader, pRow3Eval);
  }

  showDuelOutcome() {
    const eng = this.duelEngine;
    const won = eng.winner === "player";
    won ? SFX.victory() : SFX.alert();

    if (won) {
      this.game.recordBattleWin();
      this.game.addRes(this.game.playerFaction, "credits", 600);
      this.game.addRes(this.game.playerFaction, "influence", 25);
      if (this.duelContext.kind === "gauntlet") {
        this.game.recordGauntletFloor(this.duelContext.floor || 1);
      }
      this.refreshTopResources();
      this.checkAndToastAchievements();
    }

    const reasonMap = {
      capture_3: won ? "Bắt đủ 3 lá bài địch vào Hàng 2!" : "Để đối phương bắt đủ 3 lá vào Hàng 2!",
      leader_breach: won ? "Đánh bại Thủ lĩnh Hàng 3 khi Hàng 1 địch trống!" : "Thủ lĩnh Hàng 3 của bạn bị Tổng CR Hàng 1 địch khuất phục!",
      tiebreak: "Phân định thắng bại cuối trận!"
    };

    const modal = document.getElementById("duel-victory-modal");
    document.getElementById("victory-title").textContent = won ? "🏆 CHIẾN THẮNG VÁN BÀI!" : "💀 THẤT BẠI!";
    document.getElementById("victory-title").style.color = won ? "var(--gold)" : "var(--danger)";
    document.getElementById("victory-desc").textContent = won
      ? `${eng.player.leader.name} thắng ${eng.enemy.leader.name} (${reasonMap[eng.winReason] || ""}) (+600 Credits, +25 Ảnh hưởng)!`
      : `${eng.enemy.leader.name} thắng trận (${reasonMap[eng.winReason] || ""}). Hãy chỉnh Bộ Bài Phe hoặc dùng Hàng 2 Lai Tạo!`;

    document.getElementById("btn-victory-story").classList.toggle("hidden", !this.pendingStoryBattle);
    document.getElementById("btn-victory-conquer").classList.toggle("hidden", !(won && this.pendingInvasionSectorId));
    document.getElementById("btn-victory-next-floor").classList.toggle("hidden", !(won && this.duelContext.kind === "gauntlet"));

    // Offer Faction-Pure Card Draft reward on Gauntlet win
    const draftBox = document.getElementById("gauntlet-draft-box");
    const pFac = eng.player.leader.fac;
    if (won && this.duelContext.kind === "gauntlet") {
      const picks = getFactionCardPool(pFac, this.game.hybrids).filter((c) => c.id !== eng.player.leader.id).slice(0, 2);
      draftBox.classList.remove("hidden");
      draftBox.innerHTML = `<div class="muted" style="margin-bottom:6px;">🎁 Thưởng Tháp (Cùng phe ${ESC(FACTIONS[pFac]?.name || pFac)}):</div>` +
        picks.map(c => `<button class="btn-glass btn-compact" data-draft-card="${c.id}" style="margin:3px;">+ ${ESC(c.name)} (CR ${c.cr})</button>`).join("");
      draftBox.querySelectorAll("[data-draft-card]").forEach(b => {
        b.addEventListener("click", () => {
          const cid = b.dataset.draftCard;
          if (!this.game.customDeck.includes(cid)) {
            if (this.game.customDeck.length < 16) this.game.customDeck.push(cid);
            else this.game.customDeck[this.game.customDeck.length - 1] = cid;
          }
          this.game.addRes(this.game.playerFaction, "credits", 500);
          this.refreshTopResources();
          this.showToast("🎁 Đã thêm lá thưởng!", `Lá bài phe đã được thêm vào Bộ Bài (+500 Cr).`);
          draftBox.innerHTML = `<span class="badge" style="color:#4ade80;">✓ Đã nhận thưởng!</span>`;
        });
      });
    } else {
      draftBox.classList.add("hidden");
      draftBox.innerHTML = "";
    }

    modal.classList.remove("hidden");
  }

  renderDeckBuilder() {
    const protag = this.game.getProtagonist();
    const fac = protag.fac || this.game.playerFaction;
    const facName = this.game.facName(fac);
    const hybrids = this.game.hybrids || [];

    // Strictly sanitize stored deck against current Leader & Faction
    this.game.customDeck = validateDeckForLeader(this.game.customDeck || [], protag.id, hybrids);
    const deck = this.game.customDeck;
    document.getElementById("deck-count-badge").textContent = deck.length;

    const ruleBanner = document.getElementById("deck-faction-rule");
    if (ruleBanner) {
      ruleBanner.innerHTML = `🔒 <strong>Luật Phe Phái &amp; 3 Hàng:</strong> Thủ lĩnh <strong>${ESC(protag.name)}</strong> (CR ${protag.cr}) trấn thủ <strong>Hàng 3</strong>. Bộ bài 16 lá (rút 2 lá/lượt) chỉ được dùng các thẻ thuộc phe <strong style="color:var(--gold);">${ESC(facName)}</strong>!`;
    }

    const activeEl = document.getElementById("deck-active-list");
    activeEl.innerHTML = deck.map((cid, idx) => {
      const c = resolveCard(cid, hybrids);
      if (!c) return "";
      const gMark = c.gender === "Male" ? "♂" : "♀";
      return `<button class="deck-chip ${c.isHybrid ? "hybrid" : ""}" data-remove-idx="${idx}">${gMark} [CR ${c.cr}] ${ESC(c.name)} ✕</button>`;
    }).join("");

    activeEl.querySelectorAll("[data-remove-idx]").forEach((b) => {
      b.addEventListener("click", () => {
        SFX.click();
        this.game.customDeck.splice(Number(b.dataset.removeIdx), 1);
        this.game.saveToSlot("auto");
        this.renderDeckBuilder();
      });
    });

    const q = (document.getElementById("deck-search-input")?.value || "").trim().toLowerCase();
    const factionPool = getFactionCardPool(fac, hybrids).filter((c) => {
      if (c.id === protag.id) return false; // Leader is permanently seated on Row 3!
      if (!q) return true;
      return `${c.name} ${c.species || ""} ${c.row1Effect?.desc || ""} ${c.row2Effect?.desc || ""}`.toLowerCase().includes(q);
    });

    const poolEl = document.getElementById("deck-pool-grid");
    poolEl.innerHTML = factionPool.map((c) => {
      const isM = c.gender === "Male";
      const r2 = c.row2Effect || {};
      return `
        <button class="hand-card playable ${c.isHybrid ? "rarity-hybrid" : ""}" style="width:auto;min-width:0;" data-add-card="${ESC(c.id)}"
                title="H1: ${ESC(c.row1Effect?.desc || "")} | H2: ${ESC(r2.desc || "")}">
          <span class="card-cr-pill">CR ${c.cr}</span>
          <img class="hand-card-thumb" src="${getCardPortrait(c)}" alt="${ESC(c.name)}" loading="lazy" />
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;min-width:0;">
            <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
            <span style="font-weight:800;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.name)}</span>
          </div>
          <div class="muted" style="font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.species)} • ${ESC(facName)}</div>
          <div style="font-size:9.5px;color:#7dd3fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">⚔️ H1: ${ESC(c.row1Effect?.tag || "")}</div>
          <div style="font-size:9.5px;color:${r2.crPenaltyPct ? "#fda4af" : "#fbcfe8"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🧬 H2: ${ESC(r2.tag || `+${r2.crAura || 60} CR`)}</div>
        </button>
      `;
    }).join("");

    poolEl.querySelectorAll("[data-add-card]").forEach((b) => {
      b.addEventListener("click", () => {
        if (this.game.customDeck.length >= 16) {
          SFX.alert();
          this.showToast("Bộ bài đã đủ 16 lá", "Bấm vào lá phía trên để gỡ bớt trước khi thêm mới!");
          return;
        }
        const cid = b.dataset.addCard;
        const card = resolveCard(cid, hybrids);
        const count = this.game.customDeck.filter((id) => id === cid).length;
        if (card?.unique && count >= 1) {
          SFX.alert();
          this.showToast("Nhân vật Độc Nhất", `${card.name} là thẻ độc nhất, mỗi bộ bài chỉ có 1 lá!`);
          return;
        }
        if (!card?.unique && count >= 3) {
          SFX.alert();
          this.showToast("Tối đa 3 bản sao", `Mỗi đơn vị Quân Dự Bị chỉ mang tối đa 3 lá!`);
          return;
        }
        SFX.cardPlay();
        this.game.customDeck.push(cid);
        this.game.saveToSlot("auto");
        this.renderDeckBuilder();
      });
    });
  }

  // ==========================================================================
  // MODE 3: 3D GALAXY CONQUEST & SECTOR HIERARCHY
  // ==========================================================================
  initGalaxyUI() {
    const facSel = document.getElementById("active-faction-select");
    facSel.innerHTML = Object.keys(FACTIONS).map(id => {
      const f = FACTIONS[id];
      return `<option value="${id}">${ESC(f.name)} (${ESC(f.realm)})</option>`;
    }).join("");
    facSel.value = this.game.playerFaction;

    facSel.addEventListener("change", () => {
      SFX.click();
      this.game.playerFaction = facSel.value;
      if (!this.game.resources[this.game.playerFaction]) {
        this.game.resources[this.game.playerFaction] = { credits: 50000, influence: 400, research: 350, tributes: 0 };
      }
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

    document.querySelectorAll("[data-gsheet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        const mode = btn.dataset.gsheet;
        document.querySelectorAll("[data-gsheet]").forEach(b => b.classList.toggle("active", b === btn));
        document.getElementById("galaxy-left-sidebar").classList.toggle("mobile-sheet-active", mode === "left");
        document.getElementById("galaxy-right-sidebar").classList.toggle("mobile-sheet-active", mode === "right");
      });
    });

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

      this.switchMode("duel");
      this.setDuelTab("skirmish");
      this.startCardMatch({
        kind: "invasion",
        playerCharId: playerChamp,
        enemyId: enemyChamp,
        buffMult,
        modeLabel: `🚩 Xâm Chiếm ${sData.name}`
      });
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
      const matchChap = CHAPTERS.find(ch => resolveStorySector(ch.sector, this.game) === secId);
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
    const f = FACTIONS[this.game.playerFaction] || FACTIONS.sylvarian;
    const res = this.game.resources[this.game.playerFaction] || { credits: 0, influence: 0, research: 0 };
    const terr = this.game.getFactionTerritoryPct(this.game.playerFaction);
    document.getElementById("faction-info-box").innerHTML = `
      <div style="background:rgba(15,23,42,0.75);border:1px solid ${f.color};border-radius:10px;padding:9px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:${f.color};">${ESC(f.name)}</strong>
          <span class="badge">${terr}% Lãnh thổ</span>
        </div>
        <div class="muted" style="margin:4px 0;">Thủ đô: ${ESC(f.capital)}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11.5px;color:#e2e8f0;">
          <span>🪙 ${Number(res.credits || 0).toLocaleString()}</span>
          <span>👑 ${res.influence || 0} Inf</span>
          <span>🔬 ${res.research || 0} Res</span>
        </div>
      </div>
    `;
  }

  renderSectorList() {
    const list = document.getElementById("galaxy-sector-list");
    list.innerHTML = SECTORS.map((sec) => {
      const owner = this.game.ownerOf(sec.id);
      const col = FACTIONS[owner]?.color || "#64748b";
      const dyn = this.game.sectors[sec.id];
      const active = this.selectedSectorId === sec.id ? "active" : "";
      const kindIcon = sec.kind === "mega" ? "🔶" : sec.kind === "cluster" ? "🌌" : sec.kind === "star_system" ? "🪐" : "🌀";
      return `
        <div class="roster-item ${active}" data-secid="${sec.id}">
          <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;"></span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${kindIcon} ${ESC(sec.name)}</div>
            <div class="muted" style="font-size:11px;">${ESC(this.game.facName(owner))} • Thủ ${dyn.defense} • Ổn định ${dyn.stability}%</div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-secid]").forEach((el) => {
      el.addEventListener("click", () => {
        SFX.click();
        this.selectSector(el.dataset.secid, true);
      });
    });
  }

  selectSector(secId, zoom = true) {
    this.selectedSectorId = secId;
    this.selectedBodyId = null;
    if (zoom) this.engine.zoomToSector(secId);
    this.renderSectorList();
    this.renderSectorDetails();
  }

  selectBody(secId, bodyId) {
    this.selectedSectorId = secId;
    this.selectedBodyId = bodyId;
    this.engine.zoomToBody(secId, bodyId);
    this.renderSectorDetails();
  }

  renderSectorDetails() {
    const box = document.getElementById("planet-detail-box");
    const sec = SECTOR_BY_ID[this.selectedSectorId];
    if (!sec) {
      box.innerHTML = `<div class="muted">Chọn một hệ sao bên trái hoặc bấm trực tiếp vào quả cầu 3D để xem chi tiết thiên thể & đồn trú.</div>`;
      return;
    }

    const dyn = this.game.sectors[sec.id];
    const col = FACTIONS[dyn.owner]?.color || "#64748b";

    const bodiesHtml = (sec.bodies || []).map((b) => {
      const moonsStr = (b.moons && b.moons.length) ? ` (+${b.moons.length} vệ tinh)` : "";
      const placesStr = (b.places && b.places.length) ? ` — 🏛️ ${b.places.map(p => p.name).join(", ")}` : "";
      const selectedCls = this.selectedBodyId === b.id ? "style=\"border-color:var(--gold);background:rgba(250,204,21,0.12);\"" : "";
      return `
        <div class="body-subcard" data-bodyid="${b.id}" ${selectedCls}>
          <div style="display:flex;justify-content:space-between;">
            <strong style="color:${b.color || "#38bdf8"};">${ESC(b.name)}${moonsStr}</strong>
            <span class="badge">${ESC(BODY_KIND_LABEL[b.kind] || b.kind)}</span>
          </div>
          <div class="muted" style="margin-top:2px;">${ESC(b.desc || "")}${ESC(placesStr)}</div>
        </div>
      `;
    }).join("");

    const placesHtml = (sec.places && sec.places.length > 0)
      ? `<div style="margin-top:6px;">${sec.places.map(p => `<span class="badge" style="margin-right:4px;">🏛️ ${ESC(p.name)} (${ESC(PLACE_KIND_LABEL[p.kind] || p.kind)})</span>`).join("")}</div>`
      : "";

    const garrisonChars = (dyn.garrison || []).map(id => CHAR_BY_ID[id]).filter(Boolean);
    const garrisonHtml = garrisonChars.length > 0
      ? `<div style="margin-top:8px;"><strong style="font-size:11.5px;color:var(--gold);">Nhân vật đóng quân (bấm để đối thoại):</strong><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">` +
        garrisonChars.slice(0, 12).map(c => `<button class="btn-glass btn-compact" data-garrison-char="${c.id}">💬 ${ESC(c.name)}</button>`).join("") +
        `</div></div>`
      : "";

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
        <strong style="color:${col};font-size:15px;">${ESC(sec.name)}</strong>
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
          this.showToast("Chưa thể khai hỏa", res.msg);
        }
      });
    });
  }

  renderFloatingLabels(labels) {
    const layer = document.getElementById("galaxy-labels-layer");
    const activeIds = new Set(labels.map(l => `${l.kind}:${l.id}`));

    for (const [key, dom] of this.labelDomCache.entries()) {
      if (!activeIds.has(key)) {
        dom.remove();
        this.labelDomCache.delete(key);
      }
    }

    labels.forEach((lbl) => {
      const key = `${lbl.kind}:${lbl.id}`;
      let dom = this.labelDomCache.get(key);
      if (!dom) {
        dom = document.createElement("button");
        dom.className = `planet-label ${lbl.kind}`;
        dom.addEventListener("click", (e) => {
          e.stopPropagation();
          SFX.click();
          if (lbl.kind === "sector") this.selectSector(lbl.sectorId, true);
          else this.selectBody(lbl.sectorId, lbl.id);
        });
        layer.appendChild(dom);
        this.labelDomCache.set(key, dom);
      }
      dom.style.left = `${lbl.x}px`;
      dom.style.top = `${lbl.y}px`;
      dom.style.borderColor = lbl.color;
      dom.textContent = lbl.text;
    });
  }

  // ==========================================================================
  // MODE 4: GENETICS & BREEDING LAB (LAI TẠO GEN + THẺ HYBRID)
  // ==========================================================================
  initBreedingUI() {
    document.querySelectorAll("[data-bsheet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        const mode = btn.dataset.bsheet;
        document.querySelectorAll("[data-bsheet]").forEach(b => b.classList.toggle("active", b === btn));
        document.getElementById("breeding-left-sidebar").classList.toggle("mobile-sheet-active", mode === "left");
        document.getElementById("breeding-right-sidebar").classList.toggle("mobile-sheet-active", mode === "right");
      });
    });

    const catSel = document.getElementById("breed-catalyst-select");
    catSel.innerHTML = CATALYSTS.map((c) => `<option value="${c.id}">${ESC(c.name)} (${c.cost} Cr)</option>`).join("");

    document.getElementById("breed-a-select").addEventListener("change", () => this.renderBreedingPreview());
    document.getElementById("breed-b-select").addEventListener("change", () => this.renderBreedingPreview());
    catSel.addEventListener("change", () => this.renderBreedingPreview());

    document.getElementById("btn-execute-breed").addEventListener("click", () => {
      const aId = document.getElementById("breed-a-select").value;
      const bId = document.getElementById("breed-b-select").value;
      const catId = catSel.value;
      const res = executeBreeding(this.game, aId, bId, catId);
      if (res.ok) {
        SFX.breed();
        this.engine.pulseBreedingHelix();
        this.refreshTopResources();
        this.refreshBreedingDropdowns();
        this.renderBreedingPreview();
        this.renderBreedingHybrids();
        this.showToast("🧬 Hợp Nhất Gen Thành Công!", res.msg);
        this.checkAndToastAchievements();
      } else {
        SFX.alert();
        this.showToast("⚠️ Từ Chối Hợp Nhất", res.msg);
      }
    });

    this.refreshBreedingDropdowns();
    this.renderBreedingPreview();
    this.renderBreedingHybrids();
  }

  openBreedingWith(charId) {
    this.switchMode("breeding");
    const subj = resolveGeneticSubject(charId, this.game.hybrids);
    const aSel = document.getElementById("breed-a-select");
    const bSel = document.getElementById("breed-b-select");
    if (subj.gender === "Male" && bSel) bSel.value = charId;
    else if (aSel) aSel.value = charId;
    this.renderBreedingPreview();
  }

  refreshBreedingDropdowns() {
    const aSel = document.getElementById("breed-a-select");
    const bSel = document.getElementById("breed-b-select");
    const prevA = aSel.value || "meralina";
    const prevB = bSel.value || "ragnaroir";

    const hybOpts = (this.game.hybrids || []).map((h) => ({ id: h.id, label: `🧬 ${h.name} (CR ${h.cr})`, gender: "Hybrid" }));
    const femOpts = CHARACTERS.filter(c => c.gender === "Female").map(c => ({ id: c.id, label: `♀ ${c.name} (${c.species} • CR ${c.cr})` }));
    const maleOpts = CHARACTERS.filter(c => c.gender === "Male").map(c => ({ id: c.id, label: `♂ ${c.name} (${c.species} • CR ${c.cr})` }));

    aSel.innerHTML = [...hybOpts, ...femOpts, ...maleOpts].map(o => `<option value="${ESC(o.id)}">${ESC(o.label)}</option>`).join("");
    bSel.innerHTML = [...maleOpts, ...hybOpts, ...femOpts].map(o => `<option value="${ESC(o.id)}">${ESC(o.label)}</option>`).join("");

    aSel.value = (hybOpts.some(o => o.id === prevA) || CHAR_BY_ID[prevA]) ? prevA : "meralina";
    bSel.value = (hybOpts.some(o => o.id === prevB) || CHAR_BY_ID[prevB]) ? prevB : "ragnaroir";
  }

  renderBreedingPreview() {
    const aId = document.getElementById("breed-a-select")?.value || "meralina";
    const bId = document.getElementById("breed-b-select")?.value || "ragnaroir";
    const catId = document.getElementById("breed-catalyst-select")?.value || "None";
    const prev = previewBreeding(aId, bId, catId, this.game.hybrids);

    const box = document.getElementById("breed-preview-box");
    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <img src="${this.resolvePortrait(prev.parentA.id)}" style="width:44px;height:52px;border-radius:8px;object-fit:cover;object-position:top center;" alt="" />
          <div style="min-width:0;">
            <strong style="color:#f472b6;">${ESC(prev.parentA.name)}</strong>
            <div class="muted" style="font-size:10.5px;">CR ${prev.parentA.cr} • ${ESC(prev.parentA.species)}</div>
          </div>
        </div>
        <strong style="color:var(--gold);font-size:18px;">×</strong>
        <div style="display:flex;align-items:center;gap:8px;min-width:0;text-align:right;">
          <div style="min-width:0;">
            <strong style="color:#38bdf8;">${ESC(prev.parentB.name)}</strong>
            <div class="muted" style="font-size:10.5px;">CR ${prev.parentB.cr} • ${ESC(prev.parentB.species)}</div>
          </div>
          <img src="${this.resolvePortrait(prev.parentB.id)}" style="width:44px;height:52px;border-radius:8px;object-fit:cover;object-position:top center;" alt="" />
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.08);">
        <span>Dự kiến CR: <strong style="color:#fde047;">${prev.estCrMin}–${prev.estCrMax}</strong></span>
        <span>Đột biến trội: <strong style="color:#c084fc;">${prev.mutChance}%</strong></span>
        <span>Phí: <strong>${prev.cost.toLocaleString()} Cr</strong></span>
      </div>
      ${prev.notes.length ? `<div style="display:flex;flex-direction:column;gap:4px;">${prev.notes.map(n => `<div class="muted" style="color:${prev.blocked ? "#fb7185" : "#cbd5e1"};">${ESC(n)}</div>`).join("")}</div>` : `<div class="muted">✅ Sẵn sàng đồng bộ chuỗi DNA tại Buồng Gen 3D!</div>`}
    `;
  }

  renderBreedingHybrids() {
    const list = document.getElementById("breed-hybrids-list");
    const hybs = this.game.hybrids || [];
    if (hybs.length === 0) {
      list.innerHTML = `<div class="muted">Chưa có hậu duệ nào được tạo. Hãy chọn 2 cá thể bên trái và nhấn Kích Hoạt Hợp Nhất Gen!</div>`;
      return;
    }

    list.innerHTML = hybs.map((h) => {
      const inDeck = (this.game.customDeck || []).includes(h.id);
      const isProtag = this.game.protagonistId === h.id;
      return `
        <div class="codex-card" style="border-color:rgba(244,114,182,0.45);">
          <div style="display:flex;gap:10px;align-items:center;">
            <img src="${getHybridPortraitUrl(h)}" style="width:52px;height:62px;border-radius:10px;object-fit:cover;" alt="${ESC(h.name)}" />
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <strong style="color:#fbcfe8;">${ESC(h.name)}</strong>
                <span class="badge" style="color:#fde047;">CR ${h.cr}</span>
              </div>
              <div class="muted" style="font-size:11px;">${ESC(h.parentsLabel)} • Chu kỳ ${ESC(h.createdCycle)}</div>
              <div style="font-size:11px;color:#7dd3fc;">✨ ${ESC(h.signatureSkill)} ${h.mutated ? "• 🔥 ĐỘT BIẾN TRỘI" : ""}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            <button class="btn-glass btn-compact" data-hyb-deck="${ESC(h.id)}">${inDeck ? "✓ Đang trong Bộ Bài" : "🃏 Cho Vào Bộ Bài"}</button>
            <button class="btn-gold btn-compact" data-hyb-protag="${ESC(h.id)}">${isProtag ? "⭐ Đang Làm Chủ Tướng" : "⭐ Chọn Làm Chủ Tướng"}</button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-hyb-deck]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hid = btn.dataset.hybDeck;
        if (!this.game.customDeck.includes(hid)) {
          if (this.game.customDeck.length >= 16) this.game.customDeck[this.game.customDeck.length - 1] = hid;
          else this.game.customDeck.push(hid);
          this.game.saveToSlot("auto");
          SFX.cardPlay();
          this.renderBreedingHybrids();
          this.showToast("🃏 Đã đưa Hậu Duệ vào Bộ Bài!", "Hậu duệ lai sẵn sàng ra sân trong chế độ Đấu Thẻ Bài.");
        }
      });
    });

    list.querySelectorAll("[data-hyb-protag]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hid = btn.dataset.hybProtag;
        SFX.choice();
        this.game.selectProtagonist(hid, false);
        this.refreshTopResources();
        this.renderBreedingHybrids();
        this.showToast("⭐ Chủ Tướng Mới!", "Hậu duệ lai đã trở thành Nhân Vật Chính dẫn dắt câu chuyện!");
      });
    });
  }

  // ==========================================================================
  // MODE 5: UNIFIED 72-CHARACTER CARD ROSTER, CUTSCENES, DIPLOMACY & CODEX
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

    if (t === "roster") {
      const all = [...(this.game.hybrids || []).map(h => ({ ...h, isHybrid: true })), ...CHARACTERS].sort((a, b) => b.cr - a.cr);
      const selected = resolveGeneticSubject(this.inspectedRosterId, this.game.hybrids);
      const card = resolveCard(selected.id, this.game.hybrids);
      const fac = FACTIONS[selected.fac] || FACTIONS.independent;
      const loc = selected.loc ? findLocation(selected.loc) : null;
      const aff = this.game.getAffinity(selected.id);
      const imgUrl = this.resolvePortrait(selected.id);

      body.innerHTML = `
        <div class="roster-split-layout">
          <div>
            <input type="text" id="roster-filter-q" placeholder="Tìm nhanh trong 72+ nhân vật..." style="margin-bottom:8px;" />
            <div id="roster-items-box" class="roster-list" style="max-height:520px;">
              ${all.map(c => {
                const fc = FACTIONS[c.fac]?.color || "#38bdf8";
                const act = c.id === selected.id ? "active" : "";
                const portrait = this.resolvePortrait(c.id);
                return `
                  <div class="roster-item ${act}" data-pick-roster="${ESC(c.id)}">
                    <img class="roster-thumb" src="${portrait}" alt="${ESC(c.name)}" loading="lazy" />
                    <div style="flex:1;min-width:0;">
                      <div style="font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.name)}</div>
                      <div style="font-size:10.5px;color:${fc};">CR ${c.cr} • ${ESC(c.species)}</div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <div class="codex-card" style="padding:18px; gap:12px;">
            <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
              <img src="${imgUrl}" style="width:106px;height:132px;border-radius:14px;object-fit:cover;object-position:top center;border:2px solid ${fac.color};" alt="${ESC(selected.name)}" />
              <div style="flex:1;min-width:200px;">
                <h2 style="margin:0;color:#fff;font-size:20px;">${ESC(selected.name)}</h2>
                <div style="color:${fac.color};font-weight:700;font-size:13px;margin:2px 0;">${ESC(selected.title || "Chiến Binh Gaiastra")} • ${ESC(fac.name)}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                  <span class="badge">CR ${selected.cr}</span>
                  <span class="badge">${ESC(selected.species)}</span>
                  <span class="badge">${card?.gender === "Male" || selected.g === "M" ? "♂ Nam" : "♀ Nữ"}</span>
                  <span class="badge" style="color:#f472b6;">Độ tin cậy: ${aff}/100</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                  <button class="btn-glass btn-compact" id="btn-roster-upload-portrait">🖼️ Gắn Ảnh Grok / Tự Chọn</button>
                  ${getCustomPortrait(selected.id) ? `<button class="btn-glass btn-compact" id="btn-roster-reset-portrait">↩️ Về Ảnh Mặc Định</button>` : ""}
                  <input type="file" id="roster-portrait-file" accept="image/*" class="hidden" />
                </div>
              </div>
            </div>

            <div class="planet-meta-grid">
              <div><strong>Căn cứ:</strong> ${ESC(loc ? loc.label : (selected.loc || "Gaiastra"))}</div>
              <div><strong>Chiều cao:</strong> ${selected.h || 1.8}m</div>
              <div><strong>Hàng 1 (Chiến Đấu):</strong> ${ESC(card?.row1Effect?.desc || "Đấu theo Tổng CR & Phe")}</div>
              <div><strong>Hàng 2 (Sinh Sản):</strong> ${ESC(card?.row2Effect?.desc || "Hỗ trợ Hàng 1 & Lai Tạo")}</div>
              <div style="grid-column:1 / -1;"><strong>Chiêu thức đặc trưng:</strong> ${ESC((selected.skills || []).join(", "))}</div>
            </div>

            <p class="muted" style="line-height:1.6;">${ESC(selected.bio || "Hậu duệ dòng gen mới kiến tạo trong Chu Kỳ 12.")}</p>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn-gold" id="btn-roster-make-protag">⭐ Chọn Làm Nhân Vật Chính (Chơi Góc Nhìn NV Này)</button>
              <button class="btn-primary" id="btn-roster-talk">💬 Đối Thoại Tương Tác</button>
              <button class="btn-accent" id="btn-roster-breed">🧬 Đưa Vào Lai Tạo Gen</button>
              <button class="btn-glass" id="btn-roster-duel">🃏 Đấu Thử Thẻ Bài</button>
            </div>
          </div>
        </div>
      `;

      body.querySelectorAll("[data-pick-roster]").forEach(el => {
        el.addEventListener("click", () => {
          SFX.click();
          this.inspectedRosterId = el.dataset.pickRoster;
          this.renderCodexTab();
        });
      });

      const qInput = document.getElementById("roster-filter-q");
      qInput?.addEventListener("input", () => {
        const needle = qInput.value.trim().toLowerCase();
        body.querySelectorAll("[data-pick-roster]").forEach(item => {
          item.style.display = item.textContent.toLowerCase().includes(needle) ? "flex" : "none";
        });
      });

      const fileInput = document.getElementById("roster-portrait-file");
      document.getElementById("btn-roster-upload-portrait")?.addEventListener("click", () => {
        SFX.click();
        fileInput?.click();
      });
      fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxW = 380;
            const maxH = 440;
            const scale = Math.min(maxW / img.width, maxH / img.height, 1);
            canvas.width = Math.max(120, Math.round(img.width * scale));
            canvas.height = Math.max(140, Math.round(img.height * scale));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            const ok = setCustomPortrait(selected.id, canvas.toDataURL("image/jpeg", 0.86));
            clearPortraitCache(selected.id);
            if (ok) {
              SFX.victory();
              this.refreshTopResources();
              if (this.duelEngine) this.renderDuelUI();
              this.renderCodexTab();
              this.showToast("🖼️ Đã gắn ảnh chân dung mới!", `Ảnh Grok/tự chọn cho ${selected.name} đã được lưu trên thiết bị.`);
            } else {
              SFX.alert();
              this.showToast("Bộ nhớ trình duyệt đầy", "Không thể lưu thêm ảnh vào localStorage.");
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });

      document.getElementById("btn-roster-reset-portrait")?.addEventListener("click", () => {
        SFX.click();
        setCustomPortrait(selected.id, null);
        clearPortraitCache(selected.id);
        this.refreshTopResources();
        if (this.duelEngine) this.renderDuelUI();
        this.renderCodexTab();
        this.showToast("↩️ Đã khôi phục ảnh", `${selected.name} dùng lại ảnh mặc định.`);
      });

      document.getElementById("btn-roster-make-protag")?.addEventListener("click", () => {
        SFX.choice();
        this.game.selectProtagonist(selected.id, true);
        this.duelEngine = null;
        this.refreshTopResources();
        this.switchMode("vn");
        this.showToast(`⭐ Chủ Tướng Mới: ${selected.name}`, "Cốt truyện đã chuyển sang Khởi Nguyên theo góc nhìn của nhân vật này!");
      });
      document.getElementById("btn-roster-talk")?.addEventListener("click", () => {
        SFX.click();
        this.startEncounter(selected.id);
      });
      document.getElementById("btn-roster-breed")?.addEventListener("click", () => {
        SFX.click();
        this.openBreedingWith(selected.id);
      });
      document.getElementById("btn-roster-duel")?.addEventListener("click", () => {
        SFX.alert();
        this.pendingStoryBattle = null;
        this.pendingInvasionSectorId = null;
        this.switchMode("duel");
        this.setDuelTab("skirmish");
        this.startCardMatch({ kind: "skirmish", enemyId: selected.id, modeLabel: `🃏 Đấu Thử vs ${selected.name}` });
      });
      return;
    }

    if (t === "cutscenes") {
      body.innerHTML = `
        <div class="codex-card" style="margin-bottom:12px;border-color:rgba(250,204,21,0.45);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <strong style="color:var(--gold);font-size:15px;">🎬 Cutscene Hoạt Cảnh: Lịch Sử Vũ Trụ Gaiastra</strong>
              <div class="muted">Xem lại toàn cảnh từ Hỗn Mang Nguyên Thủy, Vòng Lặp Reset của Eris Union tới thời điểm Nhân Vật Chính của bạn thức tỉnh!</div>
            </div>
            <button class="btn-gold" id="btn-codex-launch-cutscene">▶ Phát Cutscene 3D Ngay</button>
          </div>
        </div>
        <div class="codex-grid">
          ${TIMELINE.map(item => `
            <div class="codex-card">
              <strong style="color:var(--gold);font-size:13.5px;">⏳ ${ESC(item.era)}</strong>
              <div style="font-weight:700;color:#e2e8f0;">${ESC(item.title)}</div>
              <div class="muted">${ESC(item.text)}</div>
            </div>
          `).join("")}
        </div>
      `;
      document.getElementById("btn-codex-launch-cutscene")?.addEventListener("click", () => {
        SFX.choice();
        this.playUniverseCutscene();
      });
      return;
    }

    if (t === "diplomacy") {
      const pactBadge = this.game.pact.active
        ? `<span class="badge" style="color:#4ade80;border-color:#4ade80;">✓ Đang hiệu lực (${this.game.pact.turnsRemaining} chu kỳ)</span>`
        : `<span class="badge" style="color:#fb7185;border-color:#fb7185;">✕ Đã đổ vỡ</span>`;

      const rows = PLAYABLE.filter(id => id !== this.game.playerFaction).map((id) => {
        const f = FACTIONS[id];
        const rel = this.game.getRelation(this.game.playerFaction, id);
        const relCol = rel >= 20 ? "#4ade80" : rel <= -30 ? "#fb7185" : "#fde68a";
        return `
          <div class="diplo-row">
            <div>
              <strong style="color:${f.color};font-size:14px;">${ESC(f.name)}</strong>
              <div class="muted">Thủ đô: ${ESC(f.capital)} • Lãnh thổ: ${this.game.getFactionTerritoryPct(id)}%</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="badge" style="color:${relCol};">Quan hệ: ${rel > 0 ? "+" : ""}${rel}</span>
              <button class="btn-primary btn-compact" data-diplo-good="${id}">🕊️ Thân thiện (300 Cr)</button>
              <button class="btn-danger btn-compact" data-diplo-bad="${id}">⚔️ Lên án (25 Inf)</button>
            </div>
          </div>
        `;
      }).join("");

      body.innerHTML = `
        <div class="codex-card" style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <strong style="color:var(--gold);font-size:15px;">📜 Hiệp Ước Đình Chiến Cursew Pact (Sylvarian ↔ Western Nadir)</strong>
              <div class="muted">Ngăn chiến tranh toàn diện giữa 2 siêu cường. Phá vỡ sẽ khiến mọi mặt trận nóng rực.</div>
            </div>
            ${pactBadge}
          </div>
          <div>
            <button class="${this.game.pact.active ? "btn-danger" : "btn-gold"}" id="btn-toggle-pact">
              ${this.game.pact.active ? "🔥 Xé Bỏ Hiệp Ước Cursew" : "🕊️ Tái Lập Hiệp Ước Cursew (120 Inf)"}
            </button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${rows}</div>
      `;

      body.querySelector("#btn-toggle-pact").addEventListener("click", () => {
        const res = this.game.toggleCursewPact();
        res.ok ? SFX.choice() : SFX.alert();
        this.refreshTopResources();
        this.renderCodexTab();
        this.showToast(res.ok ? "Hiệp Ước Đã Thay Đổi" : "Không thể thực hiện", res.msg);
      });
      body.querySelectorAll("[data-diplo-good]").forEach(b => b.addEventListener("click", () => {
        const res = this.game.improveRelation(b.dataset.diploGood);
        res.ok ? SFX.choice() : SFX.alert();
        this.refreshTopResources();
        this.renderCodexTab();
        this.showToast(res.ok ? "Ngoại Giao Thành Công" : "Thiếu Tài Nguyên", res.msg);
      }));
      body.querySelectorAll("[data-diplo-bad]").forEach(b => b.addEventListener("click", () => {
        const res = this.game.denounceFaction(b.dataset.diploBad);
        res.ok ? SFX.alert() : SFX.click();
        this.refreshTopResources();
        this.renderCodexTab();
        this.showToast("Cảnh Báo Ngoại Giao", res.msg);
      }));
      return;
    }

    if (t === "events") {
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">` +
        this.game.eventLog.map(ev => `
          <div class="codex-card">
            <div style="display:flex;justify-content:space-between;">
              <strong style="color:var(--primary);">${ESC(ev.title)}</strong>
              <span class="badge">${ESC(ev.turn)}</span>
            </div>
            <div class="muted">${ESC(ev.desc)}</div>
          </div>
        `).join("") + `</div>`;
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
              <strong style="color:${unlocked ? "var(--gold)" : "#e2e8f0"};font-size:13.5px;">${unlocked ? "🏆" : "🔒"} ${ESC(ach.title || ach.name)}</strong>
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
              <span>🃏 Trận bài thắng: <strong>${stats.battlesWon || 0}</strong></span>
              <span>🗼 Tháp Hư Không cao nhất: <strong>Tầng ${stats.gauntletMax || 0}</strong></span>
              <span>🧬 Hậu duệ lai gen: <strong>${this.game.hybrids?.length || 0}</strong></span>
              <span>📖 Chương xong: <strong>${this.game.vn.completedChapters?.length || 0}/${CHAPTERS.length}</strong></span>
            </div>
          </div>
        </div>
        <div class="codex-grid">${cardsHtml}</div>
      `;
      return;
    }

    if (t === "species") {
      body.innerHTML = `<div class="codex-grid">${
        SPECIES.map(sp => `
          <div class="codex-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:${sp.color};font-size:14px;">${ESC(sp.name)}</strong>
              <span class="badge">Dân số: ${ESC(sp.pop)}</span>
            </div>
            <div class="muted"><strong>Thể chất:</strong> ${ESC(sp.physic)} • <strong>Công nghệ:</strong> ${ESC(sp.tech)}</div>
            <div style="font-size:12px;color:#cbd5e1;">${ESC(sp.traits)}</div>
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

      const aiKeys = getStoredAIKeys();
      body.innerHTML = `
        <div class="codex-grid">
          <div class="codex-card" style="border-color:rgba(56,189,248,0.4);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div class="panel-section-title" style="margin:0;">🤖 AI Story &amp; Đối Thoại (BYOK / Local Proxy)</div>
              <span class="badge" id="sys-ai-proxy-badge">⏳ Đang kiểm tra...</span>
            </div>
            <p class="muted" style="margin:6px 0;">Khi chạy localhost (<code>server.js</code>), game tự dùng proxy bảo mật từ <code>.env.local</code>. Khi chơi web tĩnh (<code>cycle12.sedsp.lol</code>), nhập key riêng — lưu 100% cục bộ trong trình duyệt, không đẩy lên Git.</p>
            <div style="display:flex;flex-direction:column;gap:7px;">
              <label style="font-size:11px;color:#cbd5e1;">Ưu tiên Provider:
                <select id="ai-pref-provider" style="margin-top:3px;width:100%;">
                  <option value="auto" ${aiKeys.preferredProvider === "auto" ? "selected" : ""}>Tự động (Groq → DeepSeek → OpenRouter)</option>
                  <option value="groq" ${aiKeys.preferredProvider === "groq" ? "selected" : ""}>Groq (Siêu nhanh)</option>
                  <option value="deepseek" ${aiKeys.preferredProvider === "deepseek" ? "selected" : ""}>DeepSeek Chat</option>
                  <option value="openrouter" ${aiKeys.preferredProvider === "openrouter" ? "selected" : ""}>OpenRouter</option>
                </select>
              </label>
              <input type="password" id="inp-ai-groq" placeholder="Groq API Key (gsk_...)" value="${ESC(aiKeys.groq)}" autocomplete="off" />
              <input type="password" id="inp-ai-deepseek" placeholder="DeepSeek API Key (sk-...)" value="${ESC(aiKeys.deepseek)}" autocomplete="off" />
              <input type="password" id="inp-ai-openrouter" placeholder="OpenRouter API Key (sk-or-v1-...)" value="${ESC(aiKeys.openrouter)}" autocomplete="off" />
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
              <button class="btn-accent btn-compact" id="btn-save-ai-keys">💾 Lưu Key AI</button>
              <button class="btn-gold btn-compact" id="btn-test-ai">⚡ Test AI Ngay</button>
              <button class="btn-ghost btn-compact" id="btn-clear-ai-keys">🗑️ Xóa Key Trình Duyệt</button>
            </div>
          </div>

          <div class="codex-card">
            <div class="panel-section-title">📱 Cài Thành App Trên Điện Thoại & PC</div>
            <p class="muted"><strong>Android (Chrome / Edge):</strong> Bấm nút <em>📲 Cài App</em> ở góc phải hoặc chọn Menu (⋮) → <strong>Thêm vào Màn hình chính</strong>.</p>
            <p class="muted"><strong>iPhone / iPad (Safari):</strong> Bấm nút <strong>Chia sẻ (Share ⬆️)</strong> → chọn <strong>Thêm vào MH chính</strong>.</p>
          </div>
          <div class="codex-card">
            <div class="panel-section-title">📤 Xuất / Nhập Save & Chọn Lại Chiến Dịch</div>
            <p class="muted">${ESC(META.title)} — ${ESC(META.subtitle)}</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button class="btn-accent btn-compact" id="btn-export-save">⬇️ Xuất Save (.json)</button>
              <label class="btn-glass btn-compact" style="cursor:pointer;">
                ⬆️ Nhập Save <input type="file" id="inp-import-save" accept=".json" style="display:none;" />
              </label>
              <button class="btn-danger btn-compact" id="btn-reset-campaign">🔄 Reset Toàn Bộ Game</button>
            </div>
          </div>
        </div>
        <div class="codex-grid" style="margin-top:12px;">${slotsHtml}</div>
      `;

      const updateSysAIBadge = (st) => {
        this.refreshAIStatusBadge(st);
        const badgeEl = body.querySelector("#sys-ai-proxy-badge");
        if (!badgeEl) return;
        const activeList = ["groq", "deepseek", "openrouter"].filter(
          (k) => st.proxyAvailable?.[k] || st.byokAvailable?.[k]
        );
        if (st.localProxy) {
          badgeEl.textContent = activeList.length
            ? `🟢 Local Proxy + BYOK (${activeList.join(", ")})`
            : "🟡 Local Proxy (Chưa có Key)";
          badgeEl.style.color = activeList.length ? "#4ade80" : "#facc15";
        } else {
          badgeEl.textContent = activeList.length
            ? `🟢 BYOK Sẵn Sàng (${activeList.join(", ")})`
            : "⚪ Chưa nhập BYOK Key";
          badgeEl.style.color = activeList.length ? "#4ade80" : "#94a3b8";
        }
      };

      detectAIStatus(true).then(updateSysAIBadge);

      body.querySelector("#btn-save-ai-keys")?.addEventListener("click", () => {
        setStoredAIKeys({
          preferredProvider: body.querySelector("#ai-pref-provider")?.value || "auto",
          groq: body.querySelector("#inp-ai-groq")?.value || "",
          deepseek: body.querySelector("#inp-ai-deepseek")?.value || "",
          openrouter: body.querySelector("#inp-ai-openrouter")?.value || ""
        });
        SFX.choice();
        detectAIStatus(true).then((st) => {
          updateSysAIBadge(st);
          this.showToast("💾 Đã Lưu Cấu Hình AI", "API key được lưu cục bộ trong trình duyệt.");
        });
      });

      body.querySelector("#btn-clear-ai-keys")?.addEventListener("click", () => {
        setStoredAIKeys({ preferredProvider: "auto", groq: "", deepseek: "", openrouter: "" });
        body.querySelector("#inp-ai-groq").value = "";
        body.querySelector("#inp-ai-deepseek").value = "";
        body.querySelector("#inp-ai-openrouter").value = "";
        SFX.click();
        detectAIStatus(true).then(updateSysAIBadge);
        this.showToast("🗑️ Đã Xóa Key BYOK", "Đã xóa API key khỏi localStorage trình duyệt.");
      });

      body.querySelector("#btn-test-ai")?.addEventListener("click", async () => {
        const testBtn = body.querySelector("#btn-test-ai");
        if (testBtn) {
          testBtn.disabled = true;
          testBtn.textContent = "⏳ Đang gọi AI...";
        }
        try {
          setStoredAIKeys({
            preferredProvider: body.querySelector("#ai-pref-provider")?.value || "auto",
            groq: body.querySelector("#inp-ai-groq")?.value || "",
            deepseek: body.querySelector("#inp-ai-deepseek")?.value || "",
            openrouter: body.querySelector("#inp-ai-openrouter")?.value || ""
          });
          const res = await askAICharacterReply({
            gameState: this.game,
            npcId: "mina",
            userMessage: "Chào nhanh 1 câu để kiểm tra kết nối vũ trụ Gaiastra.",
            provider: body.querySelector("#ai-pref-provider")?.value || "auto"
          });
          SFX.victory();
          this.showToast(`⚡ Kết Nối ${res.provider?.toUpperCase()} Thành Công!`, `${res.model}: ${res.reply.slice(0, 120)}`);
          detectAIStatus(true).then(updateSysAIBadge);
        } catch (err) {
          SFX.alert();
          this.showToast("⚠️ Test AI Thất Bại", err.message);
        } finally {
          if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = "⚡ Test AI Ngay";
          }
        }
      });

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
            this.duelEngine = null;
            this.engine.updateSectorColors(this.game);
            this.refreshTopResources();
            this.populateChapterSelect();
            this.renderCodexTab();
            this.showToast("📂 Tải Thành Công", `Đã khôi phục Chu kỳ ${this.game.cycleMajor}.${this.game.cycleMinor}!`);
          }
        });
      });

      body.querySelector("#btn-export-save").addEventListener("click", () => {
        const blob = new Blob([this.game.serialize()], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cycle12_save_${this.game.cycleMajor}_${this.game.cycleMinor}.json`;
        a.click();
        SFX.choice();
      });

      body.querySelector("#inp-import-save").addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            localStorage.setItem("CYCLE12_SAVE_V3_auto", String(reader.result));
            if (this.game.loadFromSlot("auto")) {
              this.duelEngine = null;
              this.engine.updateSectorColors(this.game);
              this.refreshTopResources();
              this.populateChapterSelect();
              this.renderCodexTab();
              SFX.victory();
              this.showToast("📂 Nhập File Save Thành Công", "Dữ liệu đã được đồng bộ!");
            }
          } catch {
            SFX.alert();
            this.showToast("Lỗi file Save", "Tệp JSON không hợp lệ.");
          }
        };
        reader.readAsText(file);
      });

      body.querySelector("#btn-reset-campaign").addEventListener("click", () => {
        if (!confirm("Bạn có chắc chắn muốn khởi tạo lại chiến dịch mới từ Chu kỳ 12.1?")) return;
        this.game.reset();
        this.game.saveToSlot("auto");
        this.activeEncounterScript = null;
        this.lastAppliedNodeKey = null;
        this.duelEngine = null;
        this.selectedSectorId = "sylvalon";
        this.engine.updateSectorColors(this.game);
        this.refreshTopResources();
        this.populateChapterSelect();
        this.openProtagonistPicker(true);
      });
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.cycle12App = new Cycle12App();
});
