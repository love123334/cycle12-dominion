// ============================================================================
// CYCLE 12: AGE OF DOMINION — MAIN APPLICATION CONTROLLER (v10.0)
// Tactical 3-Row Card Game (Row 2→Row 1 Breeding, Card Zoom Reader, Multi-Deck & Shop) +
// Free Protagonist POV (72+ Characters) + 13-Chapter VN + 3D Galaxy Conquest
// ============================================================================

import { META, FACTIONS, PLAYABLE, SUPERWEAPONS, SPECIES, TIMELINE } from "./data/lore.js";
import { SECTORS, SECTOR_BY_ID, findLocation, SECTOR_KIND_LABEL, BODY_KIND_LABEL, PLACE_KIND_LABEL } from "./data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID, RELATIONS, RACE_STYLE } from "./data/characters.js";
import { CHAPTERS, CHAPTER_BY_ID, buildEncounterScene, resolveStoryChar, resolveStorySector } from "./data/story.js";
import {
  CARDS,
  CARD_BY_ID,
  resolveCard,
  getCardPortrait,
  getFactionCardPool,
  buildFactionDeck,
  validateDeckForLeader,
  getCardPriceInfo,
  CARD_PACKS,
  H1_KEYWORDS,
  H2_KEYWORDS,
  GENE_SURGE_SKILL,
  LEADER_SKILLS,
  getCardEnergyCost,
  getLeaderSkillForCard
} from "./data/cards.js";
import { buildHistoryCutscenes } from "./data/cutscenes.js";
import { GameState, ACHIEVEMENTS, TCG_QUESTS } from "./game/state.js";
import { CardBattleEngine, TACTICAL_DIRECTIVES } from "./game/card_engine.js";
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
    this.duelTab = "skirmish"; // 'skirmish' | 'gauntlet' | 'deck' | 'shop'
    this.deckFilter = "all"; // 'all' | 'male' | 'female' | 'cond' | 'owned' | 'unowned'
    this.deckZoomMode = false;
    this.shopFilter = "all"; // 'all' | 'unowned' | 'owned' | 'legend'
    this.shopFaction = "all";
    this.zoomedCard = null;
    this.isResolvingClash = false;
    this.draggedHandIdx = null;
    this.codexTab = "roster";  // 'roster' | 'cutscenes' | 'diplomacy' | 'events' | 'achievements' | 'species' | 'relations' | 'system'

    this.selectedSectorId = "sylvalon";
    this.selectedBodyId = null;
    this.inspectedRosterId = this.game.protagonistId || "arisia";
    this.rosterFilterFac = "ALL";
    this.rosterFilterGender = "all";
    this.rosterFilterOwned = "all";
    this.rosterSort = "cr";
    this.rosterSearch = "";
    this.dossierCharId = null;
    this.dossierTab = "overview";
    this.lastMatchParams = null;
    this.galaxySheetMode = "left";

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
    this.initCardZoomModal();
    this.initCharDossierModal();
    this.initDuelLogModal();
    this.initGalaxyUI();
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

  resolveCharacterSubject(id) {
    return (this.game.hybrids || []).find((h) => h.id === id) || CHAR_BY_ID[id] || CHAR_BY_ID.arisia;
  }

  switchMode(mode) {
    this.currentMode = mode;

    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });

    ["vn", "duel", "galaxy", "codex"].forEach((m) => {
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
    if (sfxBtn) {
      sfxBtn.textContent = SFX.muted ? "🔇" : "🔊";
      sfxBtn.addEventListener("click", () => {
        const muted = SFX.toggleMute();
        this.syncDuelSfxButtons(!muted);
        if (!muted) SFX.click();
      });
    }

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
        <div class="protag-card ${active}" data-pick-protag="${ESC(c.id)}">
          <img src="${img}" alt="${ESC(c.name)}" loading="lazy" />
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ESC(c.name)}</div>
            <div style="font-size:11px;color:${facCol};font-weight:700;">${ESC(this.game.facName(c.fac))}</div>
            <div class="muted" style="font-size:10.5px;">CR ${c.cr} • ${ESC(c.species)}</div>
          </div>
          <button type="button" class="protag-inspect-btn" data-inspect-protag="${ESC(c.id)}" title="Xem Hồ Sơ &amp; Thẻ Bài">🔍 Hồ Sơ</button>
        </div>
      `;
    }).join("");

    grid.querySelectorAll("[data-inspect-protag]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        SFX.click();
        this.openCharDossierModal(btn.dataset.inspectProtag, "overview");
      });
    });

    grid.querySelectorAll("[data-pick-protag]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (e.target.closest("[data-inspect-protag]")) return;
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

    const mapModal = document.getElementById("vn-chapter-map-modal");
    document.getElementById("btn-vn-chapter-map")?.addEventListener("click", () => {
      SFX.click();
      this.openVNChapterMapModal();
    });
    document.getElementById("vn-story-chronicle-pill")?.addEventListener("click", () => {
      SFX.click();
      this.openVNChapterMapModal();
    });
    document.getElementById("btn-close-vn-chapter-map")?.addEventListener("click", () => {
      SFX.click();
      mapModal?.classList.add("hidden");
    });
    mapModal?.addEventListener("click", (e) => {
      if (e.target === mapModal) {
        SFX.click();
        mapModal.classList.add("hidden");
      }
    });

    document.getElementById("vn-dialogue-box").addEventListener("click", (e) => {
      if (e.target.closest("button, input, select, #vn-ai-dock")) return;
      this.advanceVN();
    });

    ["left", "right"].forEach((side) => {
      const slot = document.getElementById(`vn-${side}-slot`);
      slot?.addEventListener("click", (e) => {
        e.stopPropagation();
        const cid = slot.dataset.charId;
        if (cid && (CHAR_BY_ID[cid] || this.game.hybrids?.some((h) => h.id === cid))) {
          SFX.click();
          this.openCharDossierModal(cid, "overview");
        }
      });
    });

    document.getElementById("vn-speaker-badge")?.addEventListener("click", (e) => {
      const cid = e.currentTarget.dataset.charId;
      if (cid && (CHAR_BY_ID[cid] || this.game.hybrids?.some((h) => h.id === cid))) {
        e.stopPropagation();
        SFX.click();
        this.openCharDossierModal(cid, "overview");
      }
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

  openVNChapterMapModal() {
    const modal = document.getElementById("vn-chapter-map-modal");
    const body = document.getElementById("vn-chapter-map-body");
    if (!modal || !body) return;

    const doneSet = new Set(this.game.vn.completedChapters || []);
    const curChapId = this.game.vn.currentChapterId;
    const topBonds = [...CHARACTERS]
      .map((c) => ({ c, aff: this.game.getAffinity(c.id), star: this.game.getCardStarLevel(c.id) }))
      .sort((a, b) => b.aff - a.aff || b.c.cr - a.c.cr)
      .slice(0, 12);

    body.innerHTML = `
      <div class="chapter-map-summary-bar">
        <span class="badge" style="color:var(--gold);">📖 Hoàn tất: ${doneSet.size}/${CHAPTERS.length} Chương</span>
        <span class="badge">${this.game.pact?.active ? "🤝 Cursew Pact: Hiệu lực" : "🔥 Cursew Pact: Đã vỡ"}</span>
        <span class="badge" style="color:#f472b6;">💞 Tri kỷ (≥50): ${Object.values(this.game.vn?.affinity || {}).filter((v) => v >= 50).length}</span>
        <span class="badge" style="color:#c084fc;">🌟 Thẻ Tinh Anh ★: ${Object.keys(this.game.cardStars || {}).filter((k) => this.game.cardStars[k] > 0).length}</span>
      </div>

      <div style="font-weight:800; color:var(--primary); font-size:13px;">📚 19 Chương Sử Thi Chính Tuyến &amp; Hậu Chiến (Bấm để vào ngay)</div>
      <div class="chapter-atlas-grid">
        ${CHAPTERS.map((ch, idx) => {
          const isDone = doneSet.has(ch.id);
          const isCur = !this.activeEncounterScript && curChapId === ch.id;
          const leadId = resolveStoryChar(ch.leadChar || "__PROTAGONIST__", this.game);
          const leadObj = CHAR_BY_ID[leadId] || this.game.getProtagonist();
          return `
            <div class="chapter-atlas-card ${isCur ? "active" : ""} ${isDone ? "done" : ""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span class="badge" style="color:${isDone ? "#4ade80" : "var(--gold)"};">${isDone ? "✓ " : ""}${ESC(ch.num)}</span>
                <span class="muted" style="font-size:10.5px;">#${idx + 1}/19 • POV: ${ESC(leadObj?.name || leadId)}</span>
              </div>
              <strong style="font-size:13px; color:#fff;">${ESC(ch.title)}</strong>
              <div class="muted" style="font-size:11px;">${ESC(ch.subtitle || "")}</div>
              <p style="font-size:11.5px; color:#cbd5e1; margin:4px 0; line-height:1.45;">${ESC(ch.summary || "")}</p>
              <button type="button" class="btn-primary btn-compact" data-jump-chapter="${ESC(ch.id)}" style="margin-top:auto;">
                ${isCur ? "▶ Đang Đọc Chương Này" : (isDone ? "↺ Đọc Lại Chương" : "▶ Bắt Đầu Chương")}
              </button>
            </div>
          `;
        }).join("")}
      </div>

      <div style="font-weight:800; color:#f472b6; font-size:13px; margin-top:6px;">💞 Tuyến Tâm Sự Nhân Vật &amp; Thề Ước Tinh Anh (Mở khóa Thẻ &amp; +1★)</div>
      <div class="bond-atlas-grid">
        ${topBonds.map(({ c, aff, star }) => `
          <div class="bond-atlas-chip">
            <img src="${this.resolvePortrait(c.id)}" alt="${ESC(c.name)}" />
            <div style="flex:1; min-width:0;">
              <div style="font-weight:800; font-size:12px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${ESC(c.name)} ${star > 0 ? `<span style="color:#fbbf24;">${"★".repeat(star)}</span>` : ""}
              </div>
              <div class="muted" style="font-size:10.5px;">💞 Tin cậy: ${aff}/100 • CR ${c.cr}</div>
            </div>
            <button type="button" class="btn-accent btn-compact" data-jump-bond="${ESC(c.id)}">💬 Tâm Sự</button>
          </div>
        `).join("")}
      </div>
    `;

    body.querySelectorAll("[data-jump-chapter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chId = btn.dataset.jumpChapter;
        if (!CHAPTER_BY_ID[chId]) return;
        SFX.choice();
        this.activeEncounterScript = null;
        this.game.vn.currentChapterId = chId;
        this.game.vn.currentNodeId = "start";
        this.lastAppliedNodeKey = null;
        modal.classList.add("hidden");
        this.switchMode("vn");
        this.renderVNNode();
      });
    });

    body.querySelectorAll("[data-jump-bond]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cid = btn.dataset.jumpBond;
        SFX.choice();
        modal.classList.add("hidden");
        this.startEncounter(cid);
      });
    });

    modal.classList.remove("hidden");
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
      const aiInput = document.getElementById("vn-ai-input");
      if (aiInput) {
        aiInput.placeholder = isEncounter
          ? "Nói chuyện trực tiếp với nhân vật (AI nhớ lore & lịch sử)..."
          : "Gợi ý/lái tiếp diễn biến AI (VD: 'Chất vấn Arisia về Gotterfall' hoặc 'Tăng viện Prussireich')...";
      }
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

    const chronPill = document.getElementById("vn-story-chronicle-pill");
    if (chronPill) {
      const doneCount = (this.game.vn.completedChapters || []).length;
      const pactTxt = this.game.pact?.active ? "Hiệp ước Cursew: Hiệu lực" : "Cursew Pact: Đã vỡ";
      const bondCount = Object.values(this.game.vn?.affinity || {}).filter((v) => v >= 50).length;
      const flags = this.game.vn?.flags || {};
      const flagTags = [];
      if (flags.ch1_used_gotterfall) flagTags.push("⚡Gotterfall");
      if (flags.prussireich_spared) flagTags.push("🛡️Prussireich");
      if (flags.ch13_archive_public || flags.ch13_fought_cipheron) flagTags.push("📜11 Chu Kỳ");
      if (flags.ch14_veidos_loyal) flagTags.push("⚔️Gandora");
      if (flags.ch16_raided_collectors) flagTags.push("🌃Evernight");
      const flagSuffix = flagTags.length ? ` • ${flagTags.join(" ")}` : "";
      chronPill.textContent = `📜 Chương: ${doneCount}/${CHAPTERS.length} • ${pactTxt} • 💞 Tri kỷ: ${bondCount}${flagSuffix}`;
    }

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
      badge.dataset.charId = "";
      badge.title = "";
      badge.textContent = speakerLabel;
      badge.classList.add("narrator");
      titleEl.textContent = `${script.num}: ${script.title}`;
    } else {
      const c = CHAR_BY_ID[speakerId] || this.game.hybrids?.find((h) => h.id === speakerId);
      speakerLabel = c ? c.name : speakerId;
      badge.dataset.charId = c ? c.id : "";
      badge.title = c ? `Ấn để mở Mini-Tab Hồ Sơ: ${c.name}` : "";
      badge.textContent = c ? `${speakerLabel} 🔍` : speakerLabel;
      badge.classList.remove("narrator");
      const fac = c ? FACTIONS[c.fac] : null;
      titleEl.textContent = c ? `${c.title || "Hậu Duệ"} • ${fac?.name || ""}` : "";
    }

    const rawText = typeof node.text === "function" ? node.text(this.game) : String(node.text || "");
    this.fullVnText = rawText;

    this.game.recordStoryBeat({
      kind: nodeId.startsWith("ai_") ? "ai_story" : "node",
      chapterId: script.id,
      chapter: script.num || script.title,
      speaker: speakerLabel,
      text: rawText
    });

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
      slot.dataset.charId = "";
      slot.classList.add("hidden");
      return;
    }
    const c = CHAR_BY_ID[charId] || this.game.hybrids?.find((h) => h.id === charId);
    if (!c) {
      slot.dataset.charId = "";
      slot.classList.add("hidden");
      return;
    }
    slot.dataset.charId = charId;
    slot.title = `Ấn để mở Mini-Tab Hồ Sơ: ${c.name}`;
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
          const duelBtn = document.createElement("button");
          duelBtn.className = "vn-choice-btn";
          duelBtn.innerHTML = `<div>🃏 Thách Đấu &amp; Lai Hàng 2 với ${ESC(this.resolveActorName(cid))}</div><span class="choice-hint">Đấu Thẻ Bài 3 Hàng (Nam thắng Nữ → vào Hàng 2 sinh Token lên Hàng 1)</span>`;
          duelBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            SFX.choice();
            this.pendingStoryBattle = null;
            this.pendingInvasionSectorId = null;
            this.switchMode("duel");
            this.setDuelTab("skirmish");
            this.startCardMatch({ kind: "skirmish", enemyId: cid, modeLabel: `🃏 Giao Đấu vs ${this.resolveActorName(cid)}` });
          });
          choicesEl.appendChild(duelBtn);
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

  async triggerAIStoryExpand(direction = "") {
    if (this.aiBusy) return;
    const { script, isEncounter, nodeId, node } = this.getActiveVNContext();
    if (!script || !node) return;

    const cleanDirection = typeof direction === "string" ? direction.trim() : "";
    const btn = document.getElementById("btn-vn-ai-expand");
    const badge = document.getElementById("vn-ai-status-badge");
    const prevBtnText = btn ? btn.textContent : "✨ Mở Rộng AI";
    this.aiBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ AI Đang Viết...";
    }
    if (badge) {
      badge.textContent = "⏳ AI Đang Đọc Lore...";
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
          userMessage: cleanDirection,
          history: this.aiChatHistory || [],
          chapter: script
        });
        if (res.memoryNote) this.game.recordAIMemory(res.memoryNote, this.resolveActorName(npcId));
        this.presentAICharacterNode(script, npcId, node, baseReturnId, res);
      } else {
        const currentText = this.fullVnText || (typeof node.text === "function" ? node.text(this.game) : String(node.text || ""));
        const res = await askAIStoryExpand({
          gameState: this.game,
          chapter: script,
          currentNodeText: currentText,
          currentNode: node,
          direction: cleanDirection
        });
        if (res.memoryNote) this.game.recordAIMemory(res.memoryNote, script.num || script.title);

        const resumeNodeId = node.next && script.nodes[node.next] ? node.next : baseReturnId;
        const playerId = resolveStoryChar("__PROTAGONIST__", this.game);
        const resolvedSpeaker = res.speakerId === "narrator"
          ? "narrator"
          : (CHAR_BY_ID[res.speakerId] || (this.game.hybrids || []).find((h) => h.id === res.speakerId)
            ? res.speakerId
            : (node.speaker || "narrator"));
        const leftChar = node.leftChar || "__PROTAGONIST__";
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
              if (ch.memoryNote || ch.outcome) {
                g.recordAIMemory(ch.memoryNote || `${ch.label}: ${ch.outcome}`, script.num || "AI Choice");
              }
            },
            choices: [
              {
                label: "✨ Tiếp tục viết tiếp nhánh AI này",
                hint: "Dùng AI nối tiếp ngay sau hệ quả vừa rồi",
                onSelect: () => this.triggerAIStoryExpand("")
              },
              {
                label: "↩️ Quay lại mạch truyện chính",
                hint: "Trở về diễn biến gốc của chương",
                next: resumeNodeId
              }
            ]
          };
          const bonusBits = [];
          if (ch.creditsDelta) bonusBits.push(`+${ch.creditsDelta} CR$`);
          if (ch.affinityDelta) bonusBits.push(`+${ch.affinityDelta} Tin cậy`);
          return {
            label: `✨ ${ch.label || `Phương án ${idx + 1}`}`,
            hint: bonusBits.length ? `${bonusBits.join(" • ")} • Nhánh AI Bám Lore` : "Nhánh cốt truyện AI Bám Lore",
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
          text: `${res.sceneText}\n\n[✨ AI Story Director (Lore + Trí nhớ) • ${res.provider?.toUpperCase() || "AI"}${res.model ? ` / ${res.model}` : ""}]`,
          choices: expChoices
        };

        this.game.vn.currentNodeId = aiExpId;
        this.game.saveToSlot("auto");
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
    if (res.memoryNote) this.game.recordAIMemory(res.memoryNote, this.resolveActorName(npcId));
    this.refreshTopResources();

    const playerId = resolveStoryChar("__PROTAGONIST__", this.game);
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
      leftChar: sourceNode?.leftChar || "__PROTAGONIST__",
      rightChar,
      leftMood: "neutral",
      rightMood: res.mood || "tense",
      speaker: npcId,
      allowAIInput: true,
      text: `${res.narration ? `[${res.narration}]\n\n` : ""}${res.reply}\n\n[🤖 ${res.provider?.toUpperCase() || "AI"}${statNotes.length ? ` • ${statNotes.join(" • ")}` : ""}]`,
      choices
    };

    this.game.vn.currentNodeId = replyId;
    this.game.saveToSlot("auto");
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

    // Inside main story chapters (non-encounter), user free-form input steers AI story continuation directly!
    if (!isEncounter) {
      if (input && typeof presetMsg !== "string") input.value = "";
      this.game.recordStoryBeat({
        kind: "choice",
        chapterId: script.id,
        chapter: script.num || script.title,
        speaker: this.game.getProtagonist()?.name || "Bạn",
        choiceLabel: `Chỉ đạo AI: ${msg}`,
        text: msg
      });
      await this.triggerAIStoryExpand(msg);
      return;
    }

    const playerId = resolveStoryChar("__PROTAGONIST__", this.game);
    let npcId = script.id.startsWith("enc_") ? script.id.slice(4) : null;
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
        history: this.aiChatHistory,
        chapter: script
      });
      this.game.recordStoryBeat({
        kind: "choice",
        chapterId: script.id,
        chapter: script.title,
        speaker: this.game.getProtagonist()?.name || "Bạn",
        choiceLabel: msg,
        text: msg
      });
      this.aiChatHistory.push({ role: "user", content: msg });
      this.aiChatHistory.push({ role: "assistant", content: res.reply });
      if (this.aiChatHistory.length > 14) this.aiChatHistory = this.aiChatHistory.slice(-14);

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
    if (choice.label) {
      this.game.recordStoryBeat({
        kind: "choice",
        chapterId: script?.id || "",
        chapter: script?.num || script?.title || "",
        speaker: this.game.getProtagonist()?.name || "Bạn",
        choiceLabel: choice.label,
        text: choice.label
      });
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
      if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
      this.playAnimatedClashTurn();
    });

    document.getElementById("btn-undo-duel")?.addEventListener("click", () => {
      if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
      const res = this.duelEngine.undoLastAction();
      if (!res.ok) {
        SFX.alert();
        this.showToast("↩️ Không thể hoàn tác", res.reason || "Chưa có thao tác trong lượt này.");
        return;
      }
      SFX.click();
      this.duelEngine.selectedHandIdx = null;
      this.renderDuelUI();
      this.showToast("↩️ Đã hoàn tác thao tác", `Hoàn lại ⚡ Năng lượng (${this.duelEngine.player.energy}/${this.duelEngine.player.maxEnergy}⚡) & trạng thái bàn đấu.`);
    });

    document.getElementById("btn-mulligan-duel")?.addEventListener("click", () => {
      if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
      const res = this.duelEngine.mulliganHand();
      if (!res.ok) {
        SFX.alert();
        this.showToast("🔄 Đổi Bài Mở Màn", res.reason || "Chỉ dùng ở Lượt 1 trước khi đặt thẻ!");
        return;
      }
      SFX.cardPlay();
      this.renderDuelUI();
      this.showToast("🔄 Đổi Bài Mở Màn (Mulligan)!", "Đã xáo lại tay bài khởi đầu và rút 4 lá mới!");
    });

    document.getElementById("btn-tactical-directive")?.addEventListener("click", () => {
      if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
      const eng = this.duelEngine;
      // Smartly select the highest-impact affordable Tactical Directive:
      // 1) If enemy has captured >= 1 of our cards in Row 2 and we have 2⚡ -> tactical_rescue
      // 2) Else if we have 2⚡ and an active breeder or multiple Row 1 units -> mutagen_burst
      // 3) Else -> shield_matrix (1⚡)
      let dirId = "shield_matrix";
      if (eng.player.energy >= 2) {
        if (eng.enemy.row2.length > 0) {
          dirId = "tactical_rescue";
        } else if (eng.player.row2.some((c) => c.breedingActive) || eng.getRow1Cards("player").length >= 2) {
          dirId = "mutagen_burst";
        }
      }
      const res = eng.activateTacticalDirective(dirId, "player");
      if (!res.ok) {
        SFX.alert();
        this.showToast("⚡ Chỉ Thị Chiến Thuật", res.reason || "Không thể phát động Chỉ Thị.");
        return;
      }
      SFX.choice();
      this.renderDuelUI();
      this.showToast(`${res.directive.icon} Chỉ Thị: ${res.directive.name}!`, (res.notes || []).join(" • "));
    });

    document.getElementById("btn-gene-surge")?.addEventListener("click", () => {
      this.triggerPlayerGeneSurge();
    });

    document.getElementById("btn-leader-skill")?.addEventListener("click", () => {
      this.triggerPlayerLeaderSkill();
    });

    document.getElementById("btn-duel-sfx-toggle")?.addEventListener("click", () => {
      const muted = SFX.toggleMute();
      this.syncDuelSfxButtons(!muted);
      if (!muted) SFX.click();
    });
    this.syncDuelSfxButtons(!SFX.muted);

    document.getElementById("btn-auto-deck")?.addEventListener("click", () => {
      SFX.choice();
      const deck = this.game.autoBuildActiveDeck();
      this.renderDeckBuilder();
      const active = this.game.getActiveDeck();
      const lead = CHAR_BY_ID[active.leaderId] || this.game.getProtagonist();
      this.showToast("✨ Đã xếp Bộ Bài Sở Hữu", `${deck.length} lá phe ${this.game.facName(lead.fac)} theo Thủ lĩnh ${lead.name}.`);
    });

    // Multi-Deck Management Controls
    document.getElementById("deck-select")?.addEventListener("change", (e) => {
      SFX.click();
      const d = this.game.selectActiveDeck(e.target.value);
      this.renderDeckBuilder();
      if (d) this.showToast("🗂️ Đã chuyển Bộ Bài", `${d.name} (${d.cards.length}/16 lá)`);
    });

    document.getElementById("deck-leader-select")?.addEventListener("change", (e) => {
      SFX.choice();
      const res = this.game.setActiveDeckLeader(e.target.value);
      this.renderDeckBuilder();
      if (res.ok) {
        this.showToast("👑 Đổi Thủ Lĩnh Bộ Bài", `${res.leader.name} • Phe ${this.game.facName(res.leader.fac)}`);
      } else if (res.msg) {
        SFX.alert();
        this.showToast("Chưa thể chọn Thủ Lĩnh", res.msg);
      }
    });

    document.getElementById("btn-deck-new")?.addEventListener("click", () => {
      SFX.choice();
      const active = this.game.getActiveDeck();
      const d = this.game.createDeck(null, active?.leaderId || this.game.protagonistId, true);
      this.renderDeckBuilder();
      this.showToast("➕ Đã tạo Bộ Bài Mới", `${d.name} (${d.cards.length}/16 lá). Hãy chọn Thủ Lĩnh hoặc tùy chỉnh!`);
    });

    document.getElementById("btn-deck-rename")?.addEventListener("click", () => {
      SFX.click();
      const bar = document.querySelector(".deck-manager-bar");
      if (!bar) return;
      const existing = document.getElementById("deck-rename-inline");
      if (existing) {
        existing.remove();
        return;
      }
      const active = this.game.getActiveDeck();
      const row = document.createElement("div");
      row.id = "deck-rename-inline";
      row.className = "deck-rename-inline";
      row.innerHTML = `
        <input type="text" id="deck-rename-input" value="${ESC(active?.name || "")}" maxlength="42" placeholder="Nhập tên bộ bài..." />
        <button type="button" class="btn-primary btn-compact" id="btn-deck-rename-save">✓ Lưu</button>
        <button type="button" class="btn-glass btn-compact" id="btn-deck-rename-cancel">✕</button>
      `;
      bar.appendChild(row);
      const inp = document.getElementById("deck-rename-input");
      inp?.focus();
      inp?.select();
      const commitRename = () => {
        const res = this.game.renameActiveDeck(inp?.value || "");
        row.remove();
        this.renderDeckBuilder();
        if (res.ok) this.showToast("✏️ Đã đổi tên Bộ Bài", res.deck.name);
        else if (res.msg) this.showToast("Không hợp lệ", res.msg);
      };
      document.getElementById("btn-deck-rename-save")?.addEventListener("click", commitRename);
      document.getElementById("btn-deck-rename-cancel")?.addEventListener("click", () => row.remove());
      inp?.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") commitRename();
        if (ev.key === "Escape") row.remove();
      });
    });

    document.getElementById("btn-deck-delete")?.addEventListener("click", () => {
      const res = this.game.deleteActiveDeck();
      if (res.ok) {
        SFX.click();
        this.renderDeckBuilder();
        this.showToast("🗑️ Đã xóa Bộ Bài", `Đang chuyển sang ${res.deck.name}.`);
      } else {
        SFX.alert();
        this.showToast("Không thể xóa", res.msg || "Phải giữ ít nhất 1 Bộ Bài.");
      }
    });

    document.getElementById("btn-deck-zoom-mode")?.addEventListener("click", () => {
      SFX.click();
      this.deckZoomMode = !this.deckZoomMode;
      this.renderDeckBuilder();
    });

    document.querySelectorAll("#deck-filter-pills [data-dfilter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.deckFilter = btn.dataset.dfilter || "all";
        document.querySelectorAll("#deck-filter-pills [data-dfilter]").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderDeckBuilder();
      });
    });

    document.getElementById("deck-search-input")?.addEventListener("input", () => this.renderDeckBuilder());

    // Multi-Source Shop Filters & Controls
    document.querySelectorAll("#shop-filter-bar [data-sfilter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.shopFilter = btn.dataset.sfilter || "all";
        document.querySelectorAll("#shop-filter-bar [data-sfilter]").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderShopView();
      });
    });

    const shopFacSel = document.getElementById("shop-faction-filter");
    if (shopFacSel) {
      shopFacSel.innerHTML = `<option value="all">🌌 Tất Cả Phe (${Object.keys(FACTIONS).length})</option>` +
        Object.keys(FACTIONS).map((fid) => `<option value="${fid}">${ESC(FACTIONS[fid].name)}</option>`).join("");
      shopFacSel.addEventListener("change", () => {
        SFX.click();
        this.shopFaction = shopFacSel.value || "all";
        this.renderShopView();
      });
    }
    document.getElementById("shop-search-input")?.addEventListener("input", () => this.renderShopView());

    // Row 3 Wing Leader Zoom Click Handlers
    document.querySelector(".commander-bar.enemy.row3-slot")?.addEventListener("click", () => {
      const eng = this.duelEngine;
      if (!eng) return;
      SFX.click();
      const evalCR = eng.evalCardCombatCR(eng.enemy.leader, eng.getRow1Cards("player")[0] || null, "enemy", { attackingRow3: true });
      this.inspectDuelCard(eng.enemy.leader, evalCR);
      this.openCardZoomModal(eng.enemy.leader, { source: "duel", side: "enemy", zone: "row3", evalCR });
    });
    document.querySelector(".commander-bar.player.row3-slot")?.addEventListener("click", () => {
      const eng = this.duelEngine;
      if (!eng) return;
      SFX.click();
      const evalCR = eng.evalCardCombatCR(eng.player.leader, eng.getRow1Cards("enemy")[0] || null, "player", { attackingRow3: true });
      this.inspectDuelCard(eng.player.leader, evalCR);
      this.openCardZoomModal(eng.player.leader, { source: "duel", side: "player", zone: "row3", evalCR });
    });

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
        this.startGauntletFloor(this.duelEngine?.winner === "player" ? (this.duelContext.floor || 1) + 1 : 1);
      } else if (this.lastMatchParams) {
        this.startCardMatch({ ...this.lastMatchParams });
      } else {
        this.startCardMatch({ kind: "skirmish", enemyId: document.getElementById("duel-enemy-select")?.value || "overlord" });
      }
    });

    document.getElementById("btn-victory-dismiss")?.addEventListener("click", () => {
      SFX.click();
      vModal.classList.add("hidden");
    });

    document.getElementById("btn-open-duel-log")?.addEventListener("click", () => {
      SFX.click();
      this.openDuelLogModal();
    });

    document.getElementById("duel-log-latest")?.addEventListener("click", () => {
      SFX.click();
      this.openDuelLogModal();
    });
  }

  setDuelTab(tab) {
    this.duelTab = tab;
    document.querySelectorAll("[data-dtab]").forEach((b) => b.classList.toggle("active", b.dataset.dtab === tab));
    document.getElementById("duel-battle-view")?.classList.toggle("hidden", tab === "deck" || tab === "shop" || tab === "draft");
    document.getElementById("duel-deck-view")?.classList.toggle("hidden", tab !== "deck");
    document.getElementById("duel-shop-view")?.classList.toggle("hidden", tab !== "shop");
    document.getElementById("duel-draft-view")?.classList.toggle("hidden", tab !== "draft");
    document.getElementById("duel-skirmish-controls")?.classList.toggle("hidden", tab !== "skirmish");
    document.getElementById("duel-gauntlet-controls")?.classList.toggle("hidden", tab !== "gauntlet");

    if (tab === "deck") {
      this.renderDeckBuilder();
    } else if (tab === "shop") {
      this.renderShopView();
    } else if (tab === "draft") {
      this.renderDraftView();
    } else if (tab === "gauntlet" && this.duelContext.kind !== "gauntlet") {
      document.getElementById("gauntlet-floor-badge").textContent = `🗼 Tầng 1 • Kỷ lục: ${this.game.stats?.gauntletMax || 0}`;
    } else if (tab === "skirmish") {
      const activeDeck = this.game.getActiveDeck();
      if (this.duelEngine && this.duelContext.kind === "skirmish" && this.duelEngine.turn === 1 && !this.duelEngine.player.row1.some(Boolean) && activeDeck && this.duelEngine.player.leader.id !== activeDeck.leaderId) {
        this.startCardMatch({ kind: "skirmish", enemyId: document.getElementById("duel-enemy-select")?.value || "overlord" });
      } else if (this.duelEngine) {
        this.renderDuelUI();
      }
    }
  }

  syncDuelSfxButtons(enabled) {
    const hudBtn = document.getElementById("btn-toggle-sfx");
    if (hudBtn) hudBtn.textContent = enabled ? "🔊" : "🔇";
    const duelBtn = document.getElementById("btn-duel-sfx-toggle");
    if (duelBtn) {
      duelBtn.textContent = enabled ? "🔊 Âm Thanh" : "🔇 Đã Tắt Tiếng";
      duelBtn.classList.toggle("active", enabled);
    }
  }

  triggerPlayerGeneSurge() {
    if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
    const res = this.duelEngine.activateGeneSurge("player");
    if (!res.ok) {
      SFX.alert();
      this.showToast("🔥 Gene Surge", res.reason || "Không thể kích hoạt Gene Surge.");
      return;
    }
    SFX.victory();
    const battleView = document.getElementById("duel-battle-view");
    if (battleView) {
      battleView.classList.remove("arena-surge-pulse");
      void battleView.offsetWidth;
      battleView.classList.add("arena-surge-pulse");
    }
    this.renderDuelUI();
    this.showToast("🔥 GENE SURGE BÙNG NỔ!", `Tiêu 4⚡ • Toàn bộ Hàng 1 & Hàng 3 được +${res.skill?.scaledBonus || 180} CR (+3 Cấp) trong lượt này!`);
  }

  triggerPlayerLeaderSkill() {
    if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
    const res = this.duelEngine.activateLeaderSkill("player");
    if (!res.ok) {
      SFX.alert();
      this.showToast("👑 Kỹ Năng Thủ Lĩnh", res.reason || "Không thể kích hoạt kỹ năng Thủ lĩnh.");
      return;
    }
    SFX.choice();
    const battleView = document.getElementById("duel-battle-view");
    if (battleView) {
      battleView.classList.remove("arena-surge-pulse");
      void battleView.offsetWidth;
      battleView.classList.add("arena-surge-pulse");
    }
    this.renderDuelUI();
    this.showToast(`👑 ${res.skill?.name || "Tuyệt Kỹ Tướng"}!`, (res.notes && res.notes.length ? res.notes.join(" • ") : res.skill?.desc) || "Đã kích hoạt kỹ năng đặc biệt của Thủ lĩnh!");
  }

  spawnLaneFloatPop(laneIdx, text, tone = "gold") {
    const laneChip = document.querySelector(`#duel-lanes-bar .lane-loc-chip[data-lane-chip="${laneIdx}"]`)
      || document.querySelectorAll("#duel-lanes-bar .lane-loc-chip")[laneIdx];
    if (!laneChip) return;
    const pop = document.createElement("div");
    pop.className = `lane-float-pop ${tone}`;
    pop.textContent = text;
    laneChip.appendChild(pop);
    setTimeout(() => pop.remove(), 1100);
  }

  async playAnimatedClashTurn() {
    if (!this.duelEngine || this.duelEngine.over || this.isResolvingClash) return;
    const eng = this.duelEngine;

    const pHasCard = eng.player.row1.some(Boolean);
    const eHasCard = eng.enemy.row1.some(Boolean);
    if (!pHasCard && !eHasCard && eng.player.hand.length > 0) {
      SFX.alert();
      this.showToast("Chưa thể giao chiến", "Hãy đặt ít nhất 1 lá bài từ tay lên Hàng 1 (Chiến tuyến) trước khi Giao Chiến!");
      return;
    }

    this.isResolvingClash = true;
    const resolveBtn = document.getElementById("btn-resolve-clash");
    if (resolveBtn) resolveBtn.disabled = true;

    try {
      // Execute the turn resolution in the pure engine first, then play sequential lane animations (Lane 1 -> 2 -> 3)
      const res = eng.resolveClashTurn();
      if (!res.ok) {
        SFX.alert();
        this.showToast("Chưa thể giao chiến", res.reason || "Đặt thẻ ra Hàng 1 trước khi đấu!");
        this.isResolvingClash = false;
        if (resolveBtn) resolveBtn.disabled = false;
        return;
      }

      const battleView = document.getElementById("duel-battle-view");
      const laneResList = res.laneResults || [];

      for (let i = 0; i < 3; i++) {
        const lr = laneResList[i];
        if (!lr || lr.outcome === "empty") continue;

        const pSlot = document.querySelector(`#duel-p-row1 .board-slot[data-lane="${i}"]`);
        const eSlot = document.querySelector(`#duel-e-row1 .board-slot[data-lane="${i}"]`);
        const laneChip = document.querySelectorAll("#duel-lanes-bar .lane-loc-chip")[i];

        pSlot?.classList.add("lane-resolving", "anim-lunge-up");
        eSlot?.classList.add("lane-resolving", "anim-lunge-down");
        laneChip?.classList.add("lane-resolving");

        SFX.cardHit();
        if (battleView) {
          battleView.classList.remove("arena-shake");
          void battleView.offsetWidth;
          battleView.classList.add("arena-shake");
        }

        // Flash impact + floating CR numbers
        const flashEl = document.createElement("div");
        flashEl.className = "lane-impact-flash";
        laneChip?.appendChild(flashEl);

        if (lr.outcome === "player_win") {
          this.spawnLaneFloatPop(i, `🏆 THẮNG LÀN ${i + 1} (${lr.pTotal} vs ${lr.eTotal})`, "win");
        } else if (lr.outcome === "enemy_win") {
          this.spawnLaneFloatPop(i, `💥 THUA LÀN ${i + 1} (${lr.pTotal} vs ${lr.eTotal})`, "loss");
        } else if (lr.outcome === "player_shield_block" || lr.outcome === "enemy_shield_block") {
          this.spawnLaneFloatPop(i, `🛡️ KHIÊN CHẶN! (${lr.pTotal} vs ${lr.eTotal})`, "tie");
        } else if (lr.outcome === "tie") {
          this.spawnLaneFloatPop(i, `⚖️ HÒA LÀN ${i + 1} (${lr.pTotal})`, "tie");
        } else if (lr.outcome === "player_hold") {
          this.spawnLaneFloatPop(i, `🔥 TRẤN GIỮ LÀN ${i + 1} (${lr.pTotal} CR)`, "win");
        } else if (lr.outcome === "enemy_hold") {
          this.spawnLaneFloatPop(i, `⚠️ ĐỊCH TRẤN GIỮ (${lr.eTotal} CR)`, "loss");
        }

        await new Promise((r) => setTimeout(r, 270));
        pSlot?.classList.remove("lane-resolving", "anim-lunge-up");
        eSlot?.classList.remove("lane-resolving", "anim-lunge-down");
        laneChip?.classList.remove("lane-resolving");
        flashEl.remove();
      }

      if (res.newTokens && res.newTokens.length) {
        SFX.breed();
        res.newTokens.forEach((tok) => this.game.recordTokenBred(tok));
        this.game.saveToSlot("auto");
        this.checkAndToastAchievements();
        const tokenNotes = res.newTokens.map((t) =>
          t.spawnedZone === "row1_boost"
            ? `${t.boostedAllyName} +${t.boostAmount} CR (H1 đầy)`
            : `${t.name} (CR ${t.cr}) → Hàng 1 Làn ${(t.spawnedLane ?? 0) + 1}`
        );
        this.showToast(
          "🧬 Hàng 2 Sinh Token Lên Hàng 1!",
          `${tokenNotes.join(" • ")} • Đã thỏa ĐK hiệu ứng H1/H2!`
        );
      }

      this.renderDuelUI();
      if (eng.over) {
        this.showDuelOutcome();
      }
    } finally {
      this.isResolvingClash = false;
      if (resolveBtn && this.duelEngine && !this.duelEngine.over) {
        resolveBtn.disabled = false;
      }
    }
  }

  startCardMatch({ kind = "skirmish", playerCharId = null, enemyId = "overlord", buffMult = 1, modeLabel = "Đấu Thẻ 3 Hàng", gauntletFloor = 0, difficulty = 1, isDraftMode = false, customDeckIds = null } = {}) {
    const activeDeckObj = this.game.getActiveDeck();
    const pId = playerCharId || activeDeckObj?.leaderId || this.game.protagonistId || "arisia";
    const sourceCards = Array.isArray(customDeckIds) && customDeckIds.length > 0
      ? customDeckIds
      : (playerCharId && playerCharId !== activeDeckObj?.leaderId
        ? (this.game.customDeck || [])
        : (activeDeckObj?.cards || []));
    const legalOwned = isDraftMode
      ? sourceCards.filter((id) => Boolean(resolveCard(id, this.game.hybrids || [])))
      : validateDeckForLeader(sourceCards, pId, this.game.hybrids || [], this.game.collection);
    const ownedPoolDeck = buildFactionDeck(pId, this.game.hybrids || [], this.game.collection);
    // Keep custom Story battles resilient even if player owns < 6 cards of an alternate story lead
    const activeDeck = legalOwned.length >= 6
      ? legalOwned
      : (ownedPoolDeck.length >= 6 ? ownedPoolDeck : buildFactionDeck(pId, this.game.hybrids || [], null));

    const effDifficulty = buffMult > 1 ? Math.min(difficulty, 0.85) : difficulty;
    this.lastMatchParams = { kind, playerCharId, enemyId, buffMult, modeLabel, gauntletFloor, difficulty, isDraftMode, customDeckIds };
    this.duelContext = { kind, enemyId, floor: gauntletFloor, buffMult, isDraftMode };
    this.duelEngine = new CardBattleEngine({
      playerLeaderId: pId,
      playerDeckIds: activeDeck,
      enemyLeaderId: enemyId,
      hybrids: this.game.hybrids || [],
      difficulty: effDifficulty,
      gauntletFloor,
      isDraftMode,
      sectorId: this.pendingInvasionSectorId || null,
      gameStateRef: this.game
    });
    this.duelEngine.modeLabel = modeLabel;
    this.inspectedDuelCard = null;
    this.isResolvingClash = false;
    document.getElementById("duel-victory-modal").classList.add("hidden");
    this.renderDuelUI();
  }

  startGauntletFloor(floor = 1) {
    const isBossFloor = floor > 0 && floor % 5 === 0;
    const mythicBossIds = ["overlord", "emma", "magnatere", "ovalina", "zarcseid"];
    let boss = null;
    if (isBossFloor) {
      const bossId = mythicBossIds[Math.floor((floor / 5 - 1) % mythicBossIds.length)] || "overlord";
      boss = CHAR_BY_ID[bossId] || CHAR_BY_ID.overlord;
    } else {
      const sorted = [...CHARACTERS].sort((a, b) => a.cr - b.cr);
      const bossIdx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * Math.min(1, 0.22 + floor * 0.12)));
      boss = sorted[bossIdx] || CHAR_BY_ID.overlord;
    }
    this.setDuelTab("gauntlet");
    const floorTag = isBossFloor ? `👑 BOSS TẦNG ${floor}` : `🗼 Đang ở Tầng ${floor}`;
    document.getElementById("gauntlet-floor-badge").textContent = `${floorTag} • Kỷ lục: ${this.game.stats?.gauntletMax || 0}`;
    this.startCardMatch({
      kind: "gauntlet",
      enemyId: boss.id,
      modeLabel: isBossFloor ? `👑 BOSS THÁP HƯ KHÔNG • TẦNG ${floor}` : `🗼 Tháp Hư Không Tầng ${floor}`,
      gauntletFloor: floor,
      difficulty: 0.9 + floor * 0.2 + (isBossFloor ? 0.35 : 0)
    });
    if (isBossFloor) {
      this.showToast(`👑 BOSS TẦNG ${floor}: ${boss.name}!`, "Thủ lĩnh Boss được cường hóa CR đặc biệt & khởi đầu +1⚡ Năng lượng Gen!");
    }
  }

  initCardZoomModal() {
    const modal = document.getElementById("card-zoom-modal");
    if (!modal) return;
    document.getElementById("btn-close-card-zoom")?.addEventListener("click", () => {
      SFX.click();
      this.closeCardZoomModal();
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        SFX.click();
        this.closeCardZoomModal();
      }
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        this.closeCardZoomModal();
      }
    });
  }

  closeCardZoomModal() {
    document.getElementById("card-zoom-modal")?.classList.add("hidden");
    this.zoomedCard = null;
  }

  initDuelLogModal() {
    const modal = document.getElementById("duel-log-modal");
    if (!modal) return;
    document.getElementById("btn-close-duel-log")?.addEventListener("click", () => {
      SFX.click();
      modal.classList.add("hidden");
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        SFX.click();
        modal.classList.add("hidden");
      }
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
      }
    });
  }

  openDuelLogModal() {
    const modal = document.getElementById("duel-log-modal");
    const listEl = document.getElementById("duel-log-list");
    if (!modal || !listEl) return;
    const eng = this.duelEngine;
    const logs = eng?.log || [];
    const subEl = document.getElementById("duel-log-subtitle");
    if (subEl && eng) {
      subEl.textContent = `${eng.modeLabel || "Đấu Thẻ 3 Hàng"} • Hiệp ${eng.turn} • Hàng 2 Ta: ${eng.player.row2.length}/3 • Hàng 2 Địch: ${eng.enemy.row2.length}/3`;
    }
    if (!logs.length) {
      listEl.innerHTML = `<div class="muted" style="padding:14px;">Chưa có nhật ký giao chiến nào trong ván này.</div>`;
    } else {
      listEl.innerHTML = logs.map((line, i) => {
        const isBreed = line.includes("🧬") || line.includes("Token") || line.includes("Hàng 2");
        const isClash = line.includes("⚔️") || line.includes("Hiệp") || line.includes("thắng");
        const isWarn = line.includes("⚠️") || line.includes("💥") || line.includes("khuất phục");
        const cls = isBreed ? "breed" : (isWarn ? "warn" : (isClash ? "clash" : ""));
        return `
          <div class="duel-log-entry ${cls}">
            <span class="duel-log-idx">#${i + 1}</span>
            <div class="duel-log-text">${ESC(line)}</div>
          </div>
        `;
      }).join("");
    }
    modal.classList.remove("hidden");
    listEl.scrollTop = listEl.scrollHeight;
  }

  initCharDossierModal() {
    const modal = document.getElementById("char-dossier-modal");
    if (!modal) return;
    document.getElementById("btn-close-char-dossier")?.addEventListener("click", () => {
      SFX.click();
      this.closeCharDossierModal();
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        SFX.click();
        this.closeCharDossierModal();
      }
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        this.closeCharDossierModal();
      }
    });

    document.getElementById("btn-cd-prev")?.addEventListener("click", () => {
      SFX.click();
      this.stepCharDossier(-1);
    });
    document.getElementById("btn-cd-next")?.addEventListener("click", () => {
      SFX.click();
      this.stepCharDossier(1);
    });

    document.querySelectorAll("#cd-subtabs [data-cdtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.dossierTab = btn.dataset.cdtab;
        document.querySelectorAll("#cd-subtabs [data-cdtab]").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderCharDossierContent();
      });
    });
  }

  closeCharDossierModal() {
    document.getElementById("char-dossier-modal")?.classList.add("hidden");
  }

  getFilteredRosterList() {
    const all = [...(this.game.hybrids || []).map((h) => ({ ...h, isHybrid: true })), ...CHARACTERS];
    const q = (this.rosterSearch || "").trim().toLowerCase();
    const facF = this.rosterFilterFac || "ALL";
    const genF = this.rosterFilterGender || "all";
    const ownF = this.rosterFilterOwned || "all";
    const sortMode = this.rosterSort || "cr";

    const filtered = all.filter((c) => {
      if (facF !== "ALL" && c.fac !== facF) return false;
      const isMale = c.g === "M" || c.gender === "Male";
      if (genF === "male" && !isMale) return false;
      if (genF === "female" && isMale) return false;
      const owned = this.game.getOwnedCount(c.id);
      if (ownF === "owned" && owned <= 0) return false;
      if (ownF === "unowned" && owned > 0) return false;
      if (!q) return true;
      const hay = `${c.name} ${c.species || ""} ${c.title || ""} ${this.game.facName(c.fac)} ${(c.skills || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });

    filtered.sort((a, b) => {
      if (sortMode === "aff") return this.game.getAffinity(b.id) - this.game.getAffinity(a.id) || (b.cr - a.cr);
      if (sortMode === "name") return String(a.name).localeCompare(String(b.name), "vi");
      return (b.cr || 0) - (a.cr || 0);
    });

    return filtered;
  }

  stepCharDossier(delta) {
    const pool = this.getFilteredRosterList();
    const list = pool.length > 0 ? pool : [...(this.game.hybrids || []).map((h) => ({ ...h, isHybrid: true })), ...CHARACTERS];
    if (!list.length) return;
    const curIdx = list.findIndex((c) => c.id === this.dossierCharId);
    const nextIdx = curIdx >= 0 ? (curIdx + delta + list.length) % list.length : 0;
    this.openCharDossierModal(list[nextIdx].id, this.dossierTab);
  }

  openCharDossierModal(charId, tab = null) {
    if (!charId) return;
    const selected = this.resolveCharacterSubject(charId);
    if (!selected) return;
    this.dossierCharId = selected.id;
    this.inspectedRosterId = selected.id;
    if (tab) this.dossierTab = tab;
    if (!this.dossierTab) this.dossierTab = "overview";

    document.querySelectorAll("#cd-subtabs [data-cdtab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.cdtab === this.dossierTab);
    });

    this.renderCharDossierContent();
    document.getElementById("char-dossier-modal")?.classList.remove("hidden");

    // Highlight active card in roster grid if open, without re-rendering or scrolling
    document.querySelectorAll("[data-pick-roster]").forEach((el) => {
      el.classList.toggle("active", el.dataset.pickRoster === selected.id);
    });
  }

  renderCharDossierContent() {
    const selected = this.resolveCharacterSubject(this.dossierCharId || this.inspectedRosterId);
    if (!selected) return;
    const card = resolveCard(selected.id, this.game.hybrids);
    const fac = FACTIONS[selected.fac] || FACTIONS.independent;
    const loc = selected.loc ? findLocation(selected.loc) : null;
    const aff = this.game.getAffinity(selected.id);
    const imgUrl = this.resolvePortrait(selected.id);
    const isMale = card?.gender === "Male" || selected.g === "M" || selected.gender === "Male";
    const owned = this.game.getOwnedCount(selected.id);
    const maxCap = card ? this.game.getMaxCopies(card) : 1;
    const priceInfo = card ? getCardPriceInfo(card) : { credits: 600, dust: 90, dustYield: 25, tierLabel: "★ Nhân Vật Độc Nhất" };
    const activeDeck = this.game.getActiveDeck();
    const inDeckCount = activeDeck ? activeDeck.cards.filter((id) => id === selected.id).length : 0;

    const facPill = document.getElementById("cd-faction-pill");
    if (facPill) {
      facPill.textContent = `${fac.name} • CR ${selected.cr}`;
      facPill.style.borderColor = fac.color;
      facPill.style.color = fac.color;
    }
    const nameEl = document.getElementById("cd-name");
    if (nameEl) {
      nameEl.innerHTML = `${ESC(selected.name)} <span class="gender-pill ${isMale ? "male" : "female"}">${isMale ? "♂ Nam" : "♀ Nữ"}</span>`;
    }
    const subEl = document.getElementById("cd-subtitle");
    if (subEl) {
      subEl.textContent = `${selected.title || "Chiến Binh Gaiastra"} • ${selected.species || "Sinh vật"} • Độ tin cậy ${aff}/100`;
    }

    const bodyEl = document.getElementById("cd-body");
    if (!bodyEl) return;

    if (this.dossierTab === "overview") {
      const spEntry = SPECIES.find((s) => s.id === selected.race || selected.species?.toLowerCase().includes(s.name.toLowerCase()));
      bodyEl.innerHTML = `
        <div class="cd-overview-grid">
          <div class="cd-portrait-col">
            <div class="cd-portrait-frame" style="--card-accent:${fac.color};">
              <img src="${imgUrl}" alt="${ESC(selected.name)}" />
              <div class="cd-portrait-badges">
                <span class="badge" style="background:rgba(2,6,23,0.88);color:var(--gold);border-color:var(--gold);">⚔️ CR ${selected.cr}</span>
                <span class="badge" style="background:rgba(2,6,23,0.88);color:${owned > 0 ? "#4ade80" : "#fda4af"};">${owned > 0 ? `✓ Đã sở hữu (${owned}/${maxCap})` : "🔒 Chưa sở hữu thẻ"}</span>
              </div>
            </div>
            <div class="cd-aff-box">
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px;">
                <span>💞 Độ tin cậy</span>
                <strong style="color:#f472b6;">${aff}/100 ${aff >= 35 ? "(Đủ ĐK Chiêu mộ 0 Inf)" : "(Cần 35 để Chiêu mộ 0 Inf)"}</strong>
              </div>
              <div class="cd-aff-bar"><div class="cd-aff-fill" style="width:${Math.min(100, Math.max(0, aff))}%;"></div></div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
              <button type="button" class="btn-glass btn-compact" id="btn-cd-upload-portrait">🖼️ Gắn Ảnh Grok / Tự Chọn</button>
              ${getCustomPortrait(selected.id) ? `<button type="button" class="btn-glass btn-compact" id="btn-cd-reset-portrait">↩️ Ảnh Mặc Định</button>` : ""}
              <input type="file" id="cd-portrait-file" accept="image/*" class="hidden" />
            </div>
          </div>

          <div class="cd-info-col">
            <div class="cd-section-card">
              <div class="cd-section-title">📜 Tiểu Sử &amp; Nguồn Gốc Vũ Trụ</div>
              <p class="cd-bio-p">${ESC(selected.bio || "Hậu duệ dòng gen mới kiến tạo trong Chu Kỳ 12.")}</p>
              <div class="planet-meta-grid" style="margin-top:10px;">
                <div><strong>Chủng tộc:</strong> ${ESC(selected.species || "Khác")}</div>
                <div><strong>Phe phái:</strong> <span style="color:${fac.color};font-weight:700;">${ESC(fac.name)}</span></div>
                <div><strong>Chiều cao:</strong> ${selected.h || 1.8}m</div>
                <div>
                  <strong>Căn cứ:</strong> ${ESC(loc ? loc.label : (selected.loc || "Gaiastra"))}
                  ${loc?.sector ? `<button type="button" class="btn-glass btn-compact" id="btn-cd-goto-sector" style="margin-left:6px;padding:2px 7px;font-size:10.5px;">🪐 Mở Hệ Sao</button>` : ""}
                </div>
              </div>
            </div>

            ${(selected.skills && selected.skills.length) ? `
              <div class="cd-section-card">
                <div class="cd-section-title">⚡ Tuyệt Kỹ &amp; Năng Lực Đặc Trưng</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${selected.skills.map((sk) => `<span class="badge" style="color:#7dd3fc;border-color:rgba(56,189,248,0.45);">✦ ${ESC(sk)}</span>`).join("")}
                </div>
              </div>
            ` : ""}

            <div class="cd-section-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                <div class="cd-section-title" style="margin:0;">🃏 Tóm Tắt Thẻ Bài Chiến Thuật</div>
                <button type="button" class="btn-accent btn-compact" data-cd-switch-tab="card">🃏 Xem Chi Tiết Thẻ &amp; H1/H2 ▶</button>
              </div>
              <div style="font-size:12.5px;line-height:1.55;color:#e2e8f0;">
                <div><strong style="color:#38bdf8;">⚔️ Hàng 1 (Chiến Đấu):</strong> ${ESC(card?.row1Effect?.desc || "Đấu theo Tổng CR & Phe")}</div>
                <div style="margin-top:4px;"><strong style="color:#f472b6;">🧬 Hàng 2 (Sinh Sản):</strong> ${ESC(card?.row2Effect?.desc || "Hỗ trợ Hàng 1 & Lai Tạo")}</div>
              </div>
            </div>

            ${spEntry ? `
              <div class="cd-section-card">
                <div class="cd-section-title">🧬 Đặc Tính Sinh Học Chủng Tộc (${ESC(spEntry.name)})</div>
                <div class="muted" style="font-size:12px;line-height:1.5;">${ESC(spEntry.traits)} • Thể chất: ${ESC(spEntry.physic)} • Công nghệ: ${ESC(spEntry.tech)}</div>
              </div>
            ` : ""}
          </div>
        </div>
      `;

      const fileInput = document.getElementById("cd-portrait-file");
      document.getElementById("btn-cd-upload-portrait")?.addEventListener("click", () => {
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
              if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
              this.renderCharDossierContent();
              this.showToast("🖼️ Đã gắn ảnh chân dung mới!", `Ảnh cho ${selected.name} đã được lưu trên thiết bị.`);
            } else {
              SFX.alert();
              this.showToast("Bộ nhớ trình duyệt đầy", "Không thể lưu thêm ảnh vào localStorage.");
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });

      document.getElementById("btn-cd-reset-portrait")?.addEventListener("click", () => {
        SFX.click();
        setCustomPortrait(selected.id, null);
        clearPortraitCache(selected.id);
        this.refreshTopResources();
        if (this.duelEngine) this.renderDuelUI();
        if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
        this.renderCharDossierContent();
        this.showToast("↩️ Đã khôi phục ảnh", `${selected.name} dùng lại ảnh mặc định.`);
      });

      document.getElementById("btn-cd-goto-sector")?.addEventListener("click", () => {
        if (!loc?.sector) return;
        SFX.click();
        this.closeCharDossierModal();
        this.selectedSectorId = loc.sector.id;
        this.switchMode("galaxy");
        this.selectSector(loc.sector.id, true);
      });
    } else if (this.dossierTab === "card") {
      const r1 = card?.row1Effect || {};
      const r2 = card?.row2Effect || {};
      const breedPctStr = r2.tier === "tamarite"
        ? "100% Mặc định sinh Token lên Hàng 1"
        : (r2.omniWomb ? `Omni-Womb (${r2.breedChance || 85}% sinh dị biến/lượt)` : `${r2.breedChance || 50}% sinh Token lên Hàng 1 (0–99%)`);
      const deckFac = CHAR_BY_ID[activeDeck?.leaderId]?.fac;
      const canAddToActiveDeck = card && activeDeck && card.fac === deckFac && card.id !== activeDeck.leaderId;

      bodyEl.innerHTML = `
        <div class="cd-overview-grid">
          <div class="cd-portrait-col" style="align-items:center;">
            ${card ? this.renderTCGCardHTML(card, {
              playable: owned > 0,
              locked: owned <= 0,
              ownText: owned > 0 ? `✓ Sở hữu ${owned}/${maxCap}` : `🔒 Chưa sở hữu`,
              condMet: Boolean(r1.condType),
              style: "width:176px;height:248px;",
              zoomAttrs: `data-cd-full-zoom="1"`
            }) : ""}
            <button type="button" class="btn-glass btn-compact" id="btn-cd-open-cardzoom" style="width:100%;">🔍 Phóng To Thẻ Toàn Màn Hình</button>
          </div>
          <div class="cd-info-col">
            <div class="cd-section-card" style="border-color:rgba(56,189,248,0.45);">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
                <div class="cd-section-title" style="color:#7dd3fc;margin:0;">⚔️ HÀNG 1 — HIỆU ỨNG CHIẾN ĐẤU TRỰC TIẾP</div>
                ${r1.condType ? `<span class="badge" style="color:#fde047;">⚡ ĐK +${r1.condBonus || 0} CR</span>` : `<span class="badge">Trực Chiến</span>`}
              </div>
              <p class="cd-bio-p" style="margin-top:6px;">${ESC(r1.desc || "Chiến đấu trực diện theo Tổng CR, phe phái và hiệu ứng làn.")}</p>
              ${r1.tag ? `<div class="muted" style="font-size:11.5px;margin-top:4px;">Nhãn chiến thuật: <code>${ESC(r1.tag)}</code></div>` : ""}
            </div>

            <div class="cd-section-card" style="border-color:rgba(244,114,182,0.45);">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
                <div class="cd-section-title" style="color:#f9a8d4;margin:0;">🧬 HÀNG 2 — HIỆU ỨNG SINH SẢN &amp; HỖ TRỢ</div>
                <span class="badge" style="color:#f472b6;">Aura +${r2.crAura || 60} CR</span>
              </div>
              <p class="cd-bio-p" style="margin-top:6px;">${ESC(r2.desc || "Khi bị bắt giữ hoặc lai cặp Nam×Nữ tại Hàng 2 sẽ kích hoạt hỗ trợ Hàng 1.")}</p>
              <div class="muted" style="font-size:12px;margin-top:6px;">🧬 Tỷ lệ sinh Token lên Hàng 1: <strong style="color:#fff;">${ESC(breedPctStr)}</strong></div>
              ${r2.crPenaltyPct ? `<div class="cz-note warn" style="margin-top:6px;">⚠️ Debuff Người Thuần: Token sinh ra bị giảm -${r2.crPenaltyPct}% CR (hóa giải nếu có Dick hỗ trợ).</div>` : ""}
            </div>

            <div class="cd-section-card">
              <div class="cd-section-title">📚 Quản Lý Kho Thẻ &amp; Bộ Bài (${ESC(activeDeck?.name || "Deck")})</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;margin-bottom:8px;">
                <span class="badge" style="color:${owned > 0 ? "#4ade80" : "#fda4af"};">${owned > 0 ? `✓ Sở hữu: ${owned}/${maxCap}` : "🔒 Chưa mở khóa"}</span>
                ${canAddToActiveDeck ? `<span class="badge">📚 Trong ${ESC(activeDeck.name)}: ${inDeckCount}/${maxCap}</span>` : `<span class="badge">Khác phe Chủ Tướng Deck hiện tại (${ESC(this.game.facName(deckFac))})</span>`}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${canAddToActiveDeck && owned > inDeckCount && activeDeck.cards.length < 16 ? `<button type="button" class="btn-primary btn-compact" id="btn-cd-deck-add">➕ Thêm Vào ${ESC(activeDeck.name)}</button>` : ""}
                ${canAddToActiveDeck && inDeckCount > 0 ? `<button type="button" class="btn-glass btn-compact" id="btn-cd-deck-rem">➖ Gỡ 1 Khỏi Deck (${inDeckCount})</button>` : ""}
                ${!selected.isHybrid && owned < maxCap ? `<button type="button" class="btn-gold btn-compact" id="btn-cd-buy-card">🪙 Mua (${priceInfo.credits.toLocaleString()} Cr)</button>` : ""}
                ${!selected.isHybrid && owned < maxCap ? `<button type="button" class="btn-accent btn-compact" id="btn-cd-craft-card">⚒️ Chế Tạo (${priceInfo.dust} Mảnh)</button>` : ""}
                ${!selected.isHybrid && owned > 0 && selected.id !== this.game.protagonistId ? `<button type="button" class="btn-glass btn-compact" id="btn-cd-dismantle-card">♻️ Phân Giải (+${priceInfo.dustYield} Mảnh)</button>` : ""}
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById("btn-cd-open-cardzoom")?.addEventListener("click", () => {
        if (!card) return;
        SFX.click();
        this.openCardZoomModal(card, { source: "codex" });
      });
      bodyEl.querySelector("[data-cd-full-zoom]")?.addEventListener("click", () => {
        if (!card) return;
        SFX.click();
        this.openCardZoomModal(card, { source: "codex" });
      });
      document.getElementById("btn-cd-deck-add")?.addEventListener("click", () => {
        const r = this.game.addCardToActiveDeck(selected.id);
        if (r.ok) {
          SFX.cardPlay();
          this.renderCharDossierContent();
          this.showToast("➕ Đã thêm vào Deck!", `${selected.name} đã vào ${activeDeck.name}.`);
        } else {
          SFX.alert();
          this.showToast("Không thể thêm", r.msg);
        }
      });
      document.getElementById("btn-cd-deck-rem")?.addEventListener("click", () => {
        const idx = activeDeck?.cards.indexOf(selected.id) ?? -1;
        if (idx >= 0) {
          SFX.click();
          this.game.removeCardFromActiveDeck(idx);
          this.renderCharDossierContent();
        }
      });
      document.getElementById("btn-cd-buy-card")?.addEventListener("click", () => {
        const r = this.game.buyCardWithCredits(selected.id);
        if (r.ok) {
          SFX.victory();
          this.refreshTopResources();
          if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
          this.renderCharDossierContent();
          this.showToast("🪙 Mua Thẻ Thành Công!", `Đã mở khóa ${selected.name}.`);
        } else {
          SFX.alert();
          this.showToast("Chưa thể mua", r.msg);
        }
      });
      document.getElementById("btn-cd-craft-card")?.addEventListener("click", () => {
        const r = this.game.craftCardWithDust(selected.id);
        if (r.ok) {
          SFX.breed();
          this.refreshTopResources();
          if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
          this.renderCharDossierContent();
          this.showToast("⚒️ Chế Tạo Thành Công!", `Đã chế tạo ${selected.name}.`);
        } else {
          SFX.alert();
          this.showToast("Chưa đủ Mảnh Gen", r.msg);
        }
      });
      document.getElementById("btn-cd-dismantle-card")?.addEventListener("click", () => {
        const r = this.game.dismantleCard(selected.id);
        if (r.ok) {
          SFX.click();
          this.refreshTopResources();
          if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
          this.renderCharDossierContent();
          this.showToast("♻️ Đã Phân Giải", `+${r.dustGained} Mảnh Gen.`);
        } else {
          SFX.alert();
          this.showToast("Không thể phân giải", r.msg);
        }
      });
    } else if (this.dossierTab === "relations") {
      const firstName = selected.name.split(" ")[0].toLowerCase();
      const matchedRelLines = [];
      RELATIONS.forEach((group) => {
        group.items.forEach((line) => {
          if (line.toLowerCase().includes(selected.name.toLowerCase()) || (firstName.length >= 4 && line.toLowerCase().includes(firstName))) {
            const linkedChars = CHARACTERS.filter((c) => c.id !== selected.id && (line.includes(c.name) || (c.name.split(" ")[0].length >= 4 && line.includes(c.name.split(" ")[0]))));
            matchedRelLines.push({ type: group.type, line, linkedChars });
          }
        });
      });

      const factionPeers = CHARACTERS.filter((c) => c.fac === selected.fac && c.id !== selected.id).sort((a, b) => b.cr - a.cr);
      const childrenHybrids = (this.game.hybrids || []).filter((h) => h.motherId === selected.id || h.fatherId === selected.id);
      const motherObj = selected.motherId ? CHAR_BY_ID[selected.motherId] : null;
      const fatherObj = selected.fatherId ? CHAR_BY_ID[selected.fatherId] : null;

      bodyEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="cd-section-card">
            <div class="cd-section-title">🔗 Mối Quan Hệ Lore &amp; Định Mệnh Vũ Trụ</div>
            ${matchedRelLines.length ? matchedRelLines.map((m) => `
              <div class="cd-rel-row">
                <div style="font-size:11px;color:var(--gold);font-weight:700;">${ESC(m.type)}</div>
                <div style="font-size:12.5px;color:#e2e8f0;margin:3px 0;">• ${ESC(m.line)}</div>
                ${m.linkedChars.length ? `
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                    ${m.linkedChars.map((lc) => `
                      <button type="button" class="cd-rel-chip" data-cd-jump-char="${ESC(lc.id)}">
                        <img src="${this.resolvePortrait(lc.id)}" alt="${ESC(lc.name)}" />
                        <span>${ESC(lc.name)} (CR ${lc.cr})</span>
                      </button>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            `).join("") : `<div class="muted" style="font-size:12.5px;">Chưa có ghi chép xung đột cá nhân trực tiếp — nhân vật hoạt động theo chiến lược của ${ESC(fac.name)}.</div>`}
          </div>

          ${(motherObj || fatherObj || childrenHybrids.length) ? `
            <div class="cd-section-card">
              <div class="cd-section-title">🧬 Gia Phả &amp; Phả Hệ Lai Tạo</div>
              ${(motherObj || fatherObj) ? `
                <div style="margin-bottom:8px;">
                  <div class="muted" style="font-size:11.5px;margin-bottom:4px;">Cha Mẹ Khởi Nguyên:</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${motherObj ? `<button type="button" class="cd-rel-chip" data-cd-jump-char="${ESC(motherObj.id)}"><img src="${this.resolvePortrait(motherObj.id)}" alt="" /><span>♀ Mẹ: ${ESC(motherObj.name)}</span></button>` : ""}
                    ${fatherObj ? `<button type="button" class="cd-rel-chip" data-cd-jump-char="${ESC(fatherObj.id)}"><img src="${this.resolvePortrait(fatherObj.id)}" alt="" /><span>♂ Cha: ${ESC(fatherObj.name)}</span></button>` : ""}
                  </div>
                </div>
              ` : ""}
              ${childrenHybrids.length ? `
                <div>
                  <div class="muted" style="font-size:11.5px;margin-bottom:4px;">Hậu Duệ Đã Lai Tạo (${childrenHybrids.length}):</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${childrenHybrids.map((ch) => `<button type="button" class="cd-rel-chip" data-cd-jump-char="${ESC(ch.id)}"><img src="${this.resolvePortrait(ch.id)}" alt="" /><span>✦ ${ESC(ch.name)} (CR ${ch.cr})</span></button>`).join("")}
                  </div>
                </div>
              ` : ""}
            </div>
          ` : ""}

          <div class="cd-section-card">
            <div class="cd-section-title">🛡️ Đồng Minh Cùng Phe ${ESC(fac.name)} (${factionPeers.length}) — Ấn Để Chuyển Nhanh Hồ Sơ</div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;">
              ${factionPeers.map((p) => `
                <button type="button" class="cd-rel-chip" data-cd-jump-char="${ESC(p.id)}">
                  <img src="${this.resolvePortrait(p.id)}" alt="${ESC(p.name)}" loading="lazy" />
                  <span>${ESC(p.name)} <small style="color:var(--gold);">CR ${p.cr}</small></span>
                </button>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    } else if (this.dossierTab === "interact") {
      const pRes = this.game.resources[this.game.playerFaction] || { credits: 0, influence: 0, research: 0 };
      bodyEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="cd-section-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              <div class="cd-section-title" style="margin:0;">🎁 Tăng Độ Tin Cậy &amp; Viện Trợ Trực Tiếp</div>
              <span class="badge" style="color:#f472b6;">Độ tin cậy hiện tại: ${aff}/100</span>
            </div>
            <div class="muted" style="font-size:12px;margin-bottom:10px;">
              Đạt <strong>Độ tin cậy ≥ 35</strong> giúp <strong>Chiêu Mộ Thẻ Bài Miễn Phí (0 Ảnh hưởng)</strong>. Kho dự trữ phe bạn: 🪙 ${(pRes.credits || 0).toLocaleString()} Cr • 🤝 ${pRes.influence || 0} Inf • 🔬 ${pRes.research || 0} Res.
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-glass btn-compact" id="btn-cd-gift-talk">💬 Tâm Sự Chiến Thuật (+10 Tin cậy • 10 Inf)</button>
              <button type="button" class="btn-gold btn-compact" id="btn-cd-gift-credit">🎁 Viện Trợ Vũ Khí (+18 Tin cậy &amp; +15 Inf • 200 Cr)</button>
              <button type="button" class="btn-accent btn-compact" id="btn-cd-gift-research">🔬 Trao Đổi Cổ Ngữ (+25 Tin cậy • 40 Res)</button>
            </div>
          </div>

          <div class="cd-section-card" style="border-color:rgba(168,85,247,0.45);">
            <div class="cd-section-title" style="color:#d8b4fe;">🤖 Đối Thoại AI Trực Tiếp Cùng ${ESC(selected.name)} (Chuẩn Lore Chu Kỳ 12)</div>
            <div id="cd-ai-chat-log" class="cd-ai-chat-log">
              <div class="cd-ai-msg char">
                <strong>${ESC(selected.name)}:</strong> Ta đang lắng nghe đây, ${ESC(this.game.getProtagonist().name)}. Ngươi muốn bàn về cục diện ${ESC(fac.name)}, chiến thuật Hàng 1/Hàng 2 hay bí mật của Chu Kỳ 12?
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <input type="text" id="cd-ai-input" placeholder="Nhập câu hỏi hoặc lời thoại gửi tới ${ESC(selected.name)}..." style="flex:1;" />
              <button type="button" class="btn-primary btn-compact" id="btn-cd-ai-send">Gửi ▶</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("btn-cd-gift-talk")?.addEventListener("click", () => {
        if ((pRes.influence || 0) < 10) {
          SFX.alert();
          this.showToast("Thiếu Ảnh hưởng", "Cần 10 Ảnh hưởng (Inf) để tổ chức buổi đàm đạo riêng.");
          return;
        }
        pRes.influence -= 10;
        this.game.addAffinity(selected.id, 10);
        const nextAff = this.game.getAffinity(selected.id);
        this.game.saveToSlot("auto");
        SFX.choice();
        this.refreshTopResources();
        if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
        this.renderCharDossierContent();
        this.showToast(`💞 +10 Độ tin cậy với ${selected.name}`, `Độ tin cậy hiện tại: ${nextAff}/100.`);
      });

      document.getElementById("btn-cd-gift-credit")?.addEventListener("click", () => {
        if ((pRes.credits || 0) < 200) {
          SFX.alert();
          this.showToast("Thiếu Credits", "Cần 200 Credits để gửi viện trợ trang bị.");
          return;
        }
        pRes.credits -= 200;
        pRes.influence = (pRes.influence || 0) + 15;
        this.game.addAffinity(selected.id, 18);
        const nextAff = this.game.getAffinity(selected.id);
        this.game.saveToSlot("auto");
        SFX.victory();
        this.refreshTopResources();
        if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
        this.renderCharDossierContent();
        this.showToast(`🎁 Viện trợ cho ${selected.name}!`, `+18 Độ tin cậy (${nextAff}/100) & +15 Ảnh hưởng!`);
      });

      document.getElementById("btn-cd-gift-research")?.addEventListener("click", () => {
        if ((pRes.research || 0) < 40) {
          SFX.alert();
          this.showToast("Thiếu Nghiên cứu", "Cần 40 điểm Nghiên cứu (Res) để chia sẻ dữ liệu cổ ngữ.");
          return;
        }
        pRes.research -= 40;
        this.game.addAffinity(selected.id, 25);
        const nextAff = this.game.getAffinity(selected.id);
        this.game.saveToSlot("auto");
        SFX.breed();
        this.refreshTopResources();
        if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
        this.renderCharDossierContent();
        this.showToast(`🔬 Đã chia sẻ dữ liệu với ${selected.name}!`, `+25 Độ tin cậy (${nextAff}/100)!`);
      });

      const sendDossierAIChat = async () => {
        const inp = document.getElementById("cd-ai-input");
        const logBox = document.getElementById("cd-ai-chat-log");
        const msg = (inp?.value || "").trim();
        if (!msg || !logBox || this.aiBusy) return;
        inp.value = "";
        this.aiBusy = true;
        logBox.insertAdjacentHTML("beforeend", `<div class="cd-ai-msg user"><strong>Bạn:</strong> ${ESC(msg)}</div>`);
        const waitEl = document.createElement("div");
        waitEl.className = "cd-ai-msg char muted";
        waitEl.textContent = `⏳ ${selected.name} đang suy nghĩ...`;
        logBox.appendChild(waitEl);
        logBox.scrollTop = logBox.scrollHeight;
        try {
          const reply = await askAICharacterReply({
            gameState: this.game,
            npcId: selected.id,
            userMessage: msg,
            history: this.aiChatHistory || []
          });
          this.aiChatHistory.push({ role: "user", text: msg }, { role: "assistant", text: reply.reply });
          waitEl.remove();
          logBox.insertAdjacentHTML("beforeend", `<div class="cd-ai-msg char"><strong>${ESC(selected.name)}:</strong> ${ESC(reply.reply)}</div>`);
          if (reply.affinityDelta) {
            this.game.addAffinity(selected.id, reply.affinityDelta);
          }
          if (reply.memoryNote) {
            this.game.recordAIMemory(reply.memoryNote, selected.name);
          }
          this.game.recordStoryBeat({
            kind: "ai_chat",
            chapterId: this.game.vn.currentChapterId,
            chapter: `Hồ Sơ: ${selected.name}`,
            speaker: selected.name,
            speakerId: selected.id,
            userPrompt: msg,
            text: reply.reply
          });
          this.game.saveToSlot("auto");
        } catch (err) {
          waitEl.textContent = `⚠️ Không thể kết nối AI: ${err.message || "Lỗi mạng"}`;
        } finally {
          this.aiBusy = false;
          logBox.scrollTop = logBox.scrollHeight;
        }
      };

      document.getElementById("btn-cd-ai-send")?.addEventListener("click", sendDossierAIChat);
      document.getElementById("cd-ai-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendDossierAIChat();
        }
      });
    }

    bodyEl.querySelectorAll("[data-cd-switch-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.openCharDossierModal(selected.id, btn.dataset.cdSwitchTab);
      });
    });

    bodyEl.querySelectorAll("[data-cd-jump-char]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.click();
        this.openCharDossierModal(btn.dataset.cdJumpChar, "overview");
      });
    });

    // Render Persistent Footer Actions
    const actionsEl = document.getElementById("cd-actions");
    if (actionsEl) {
      const infCost = aff >= 35 ? 0 : (selected.cr >= 750 ? 90 : 45);
      actionsEl.innerHTML = `
        <button type="button" class="btn-gold btn-compact" id="btn-cd-make-protag">⭐ Chọn Làm Nhân Vật Chính</button>
        <button type="button" class="btn-primary btn-compact" id="btn-cd-talk-vn">💬 Mở Cảnh Đối Thoại VN</button>
        <button type="button" class="btn-glass btn-compact" id="btn-cd-duel">⚔️ Đấu Thử Thẻ Bài</button>
        ${owned > 0
          ? `<span class="badge" style="color:#4ade80;border-color:rgba(74,222,128,0.55);">✓ Đã Sở Hữu Thẻ (${owned}/${maxCap})</span>`
          : `<button type="button" class="btn-accent btn-compact" id="btn-cd-recruit">${infCost === 0 ? "🤝 Chiêu Mộ Miễn Phí (Thân ≥35)" : `🤝 Chiêu Mộ Thẻ (${infCost} Inf)`}</button>`}
        <button type="button" class="btn-glass btn-compact" id="btn-cd-close-footer">Đóng</button>
      `;

      document.getElementById("btn-cd-make-protag")?.addEventListener("click", () => {
        SFX.choice();
        this.game.selectProtagonist(selected.id, true);
        this.duelEngine = null;
        this.refreshTopResources();
        this.closeCharDossierModal();
        this.switchMode("vn");
        this.showToast(`⭐ Chủ Tướng Mới: ${selected.name}`, "Cốt truyện đã chuyển sang Khởi Nguyên theo góc nhìn của nhân vật này!");
      });

      document.getElementById("btn-cd-talk-vn")?.addEventListener("click", () => {
        SFX.click();
        this.closeCharDossierModal();
        this.startEncounter(selected.id);
      });

      document.getElementById("btn-cd-duel")?.addEventListener("click", () => {
        SFX.alert();
        this.closeCharDossierModal();
        this.pendingStoryBattle = null;
        this.pendingInvasionSectorId = null;
        this.switchMode("duel");
        this.setDuelTab("skirmish");
        this.startCardMatch({ kind: "skirmish", enemyId: selected.id, modeLabel: `🃏 Đấu Thử vs ${selected.name}` });
      });

      document.getElementById("btn-cd-recruit")?.addEventListener("click", () => {
        const r = this.game.recruitCharacterCard(selected.id);
        if (r.ok) {
          SFX.victory();
          this.refreshTopResources();
          if (this.currentMode === "codex" && this.codexTab === "roster") this.renderRosterGridItems();
          this.renderCharDossierContent();
          this.showToast("🤝 Chiêu Mộ Thành Công!", `Đã mở khóa thẻ bài ${selected.name} vào Kho Thẻ!`);
        } else {
          SFX.alert();
          this.showToast("Chưa đủ điều kiện chiêu mộ", r.msg);
        }
      });

      document.getElementById("btn-cd-close-footer")?.addEventListener("click", () => {
        SFX.click();
        this.closeCharDossierModal();
      });
    }
  }

  bindZoomTriggers(rootEl, resolveCtxFn) {
    if (!rootEl) return;
    rootEl.querySelectorAll("[data-zoom-trigger]").forEach((trg) => {
      trg.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        SFX.click();
        const host = trg.closest("[data-zoom-host]") || trg;
        const resolved = resolveCtxFn(host, trg);
        if (resolved?.card) this.openCardZoomModal(resolved.card, resolved.ctx || {});
      });
    });
    rootEl.querySelectorAll("[data-zoom-host]").forEach((host) => {
      host.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        SFX.click();
        const resolved = resolveCtxFn(host, host);
        if (resolved?.card) this.openCardZoomModal(resolved.card, resolved.ctx || {});
      });
    });
  }

  openCardZoomModal(card, ctx = {}) {
    if (!card) return;
    const modal = document.getElementById("card-zoom-modal");
    if (!modal) return;
    this.zoomedCard = { card, ctx };

    const hybrids = this.game.hybrids || [];
    const baseChar = CHAR_BY_ID[card.baseCharId || card.id] || null;
    const facObj = FACTIONS[card.fac] || {};
    const facColor = facObj.color || "#38bdf8";
    const facLabel = facObj.name || card.fac;
    const isM = card.gender === "Male";
    const r1 = card.row1Effect || {};
    const r2 = card.row2Effect || {};
    const evalCR = ctx.evalCR || null;
    const priceInfo = getCardPriceInfo(card);
    const isCollectible = !card.isToken && !card.fromRow2Breeding;
    const maxCap = this.game.getMaxCopies(card);
    const owned = isCollectible ? this.game.getOwnedCount(card.id) : 1;
    const activeDeck = this.game.getActiveDeck();
    const inDeckCount = (activeDeck?.cards || []).filter((id) => id === card.id).length;
    const eng = this.duelEngine;
    const sideKey = ctx.side || "player";
    const sCtx = eng ? eng.getSideBreedingContext(sideKey) : null;
    const cardCost = Number(card.cost || getCardEnergyCost(card.cr, card.isToken));
    const h1Kws = (card.h1Keywords || []).map((k) => H1_KEYWORDS[k]).filter(Boolean);
    const h2Kws = (card.h2Keywords || []).map((k) => H2_KEYWORDS[k]).filter(Boolean);
    const leaderSkill = card.leaderSkill || getLeaderSkillForCard(card);

    document.getElementById("cz-name").innerHTML = `${ESC(card.name)} <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂ Nam" : "♀ Nữ"}</span> <span class="badge energy-orb-pill" style="font-size:11px;">⚡ ${cardCost} Năng Lượng</span>`;
    const tierSuffix = card.unique ? `${priceInfo.tierLabel} • ★ Nhân Vật Độc Nhất` : priceInfo.tierLabel;
    document.getElementById("cz-subtitle").textContent =
      `${card.species || "Sinh vật"} • Phe ${facLabel} • Cost ${cardCost}⚡ • ${tierSuffix}`;

    const breakdownLines = [];
    if (evalCR) {
      breakdownLines.push(`Gốc CR ${card.cr}`);
      if (evalCR.breakdown) {
        Object.entries(evalCR.breakdown).forEach(([k, v]) => {
          if (v && k !== "base") breakdownLines.push(`${k}: ${v > 0 ? "+" : ""}${v}`);
        });
      }
      if (evalCR.triggeredConditionals?.length) {
        breakdownLines.push(...evalCR.triggeredConditionals);
      }
    }

    const r1CondTag = r1.condType
      ? (evalCR?.triggeredConditionals?.length || (eng && eng.isConditionMet(card, null, sideKey))
        ? `<span class="badge" style="color:#6ee7b7;border-color:rgba(52,211,153,0.65);">✅ ĐK Hàng 1 Đã Kích Hoạt (+${r1.condBonus || 0} CR)</span>`
        : `<span class="badge" style="color:#fde047;border-color:rgba(250,204,21,0.5);">⚡ Hiệu Ứng Có Điều Kiện (+${r1.condBonus || 0} CR)</span>`)
      : `<span class="badge">⚔️ Trực Chiến Tiêu Chuẩn</span>`;

    const breedPctStr = card.breedingActive && eng
      ? `${eng.getEffectiveBreedChance(card, sideKey)}%/lượt (Đang lai cùng ♂ ${card.sireCard?.name || "Nam"} • Đã sinh ${card.spawnCount || 0} Token→H1)`
      : (r2.tier === "tamarite"
        ? "100% Sinh Token khi bị ♂ bắt vào Hàng 2"
        : (r2.omniWomb ? `Omni-Womb (${r2.breedChance || 85}% sinh dị biến/lượt)` : `${r2.breedChance || 50}% sinh Token lên Hàng 1 (0–99%)`));

    const debuffNote = r2.crPenaltyPct
      ? (card.debuffCanceledByDick || sCtx?.hasDick
        ? `<div class="cz-note ok">✅ Nhân tố <strong>Dick</strong> đang hóa giải Debuff -${r2.crPenaltyPct}% CR cho Token lai!</div>`
        : `<div class="cz-note warn">⚠️ <strong>Debuff Người Thuần:</strong> Nếu không có Dick hỗ trợ, con lai sinh ra bị giảm -${r2.crPenaltyPct}% CR.</div>`)
      : "";

    const specialStatusNotes = [];
    if (card.fromRow2Breeding) specialStatusNotes.push("🧬 Sinh ra từ Buồng Lai Hàng 2 và tự nhảy lên Hàng 1");
    if (card.isToken) specialStatusNotes.push(`🪙 Thẻ Token Lai${card.motherId ? ` (Mẹ: ${CHAR_BY_ID[card.motherId]?.name || card.motherId})` : ""}${card.fatherId ? ` × (Cha: ${CHAR_BY_ID[card.fatherId]?.name || card.fatherId})` : ""}`);
    if (card.isHybrid) specialStatusNotes.push("✦ Dòng Lai Vĩnh Viễn trong kho gen");
    if (card.shieldCharges > 0) specialStatusNotes.push("🛡️ Đang có Khiên Bảo Hộ (Chặn 1 lần thua giao chiến tại Hàng 1)");
    if (r2.symbiosisR2Boost) specialStatusNotes.push(`✨ Cộng sinh Hàng 2: Tăng +${r2.symbiosisR2Boost}% tỷ lệ sinh Token cho mọi cặp lai cùng bên`);
    if (r2.doubleIfTokenBred) specialStatusNotes.push(`⚡ Nhân đôi Aura CR Hàng 2 (+${(r2.crAura || 40) * 2} CR) khi Hàng 1 đã có Token lai`);

    const h1KwHtml = h1Kws.length
      ? `<div class="cz-kw-box">${h1Kws.map((kw) => `<div class="cz-kw-item"><span class="badge" style="color:${kw.color};border-color:${kw.color};">${kw.icon} ${ESC(kw.name)}</span> <span>${ESC(kw.desc)}</span></div>`).join("")}</div>`
      : "";
    const h2KwHtml = h2Kws.length
      ? `<div class="cz-kw-box">${h2Kws.map((kw) => `<div class="cz-kw-item"><span class="badge" style="color:${kw.color};border-color:${kw.color};">${kw.icon} ${ESC(kw.name)}</span> <span>${ESC(kw.desc)}</span></div>`).join("")}</div>`
      : "";

    const skillsHtml = baseChar?.skills?.length
      ? `<div class="cz-skills">${baseChar.skills.map((sk) => `<span class="badge">${ESC(sk)}</span>`).join("")}</div>`
      : "";
    const loreBio = baseChar?.bio || (card.isHybrid ? "Chiến binh lai tạo đa chủng tộc mang đặc tính dung hợp từ hai dòng máu." : "Đơn vị chiến thuật chuyên trách của phe phái trong Chu Kỳ 12.");

    const bodyEl = document.getElementById("cz-body");
    bodyEl.innerHTML = `
      <div class="cz-visual-col">
        <div class="cz-portrait-frame ${this.getCardRarityClass(card)}" style="--card-accent:${facColor};">
          <img src="${getCardPortrait(card)}" alt="${ESC(card.name)}" />
          <div class="cz-portrait-overlay">
            <span class="cz-cr-badge">⚡${cardCost} • ⚔️ CR ${evalCR ? evalCR.total : card.cr}${evalCR && evalCR.total !== card.cr ? ` <small>(Gốc ${card.cr})</small>` : ""}</span>
            ${card.fromRow2Breeding ? `<span class="token-pill row2-spawn">🧬 H2→H1</span>` : (card.isToken ? `<span class="token-pill">🪙 TOKEN</span>` : (card.isHybrid ? `<span class="token-pill hybrid">✦ LAI</span>` : ""))}
          </div>
        </div>
        <div class="cz-meta-pills">
          <span class="badge energy-orb-pill">⚡ Cost: ${cardCost}</span>
          <span class="badge" style="color:${facColor};border-color:${facColor};">${ESC(facLabel)}</span>
          <span class="badge">${ESC(card.species || "Khác")}</span>
          <span class="badge">${isM ? "♂ Ưu thế +2 Cấp (+120 CR) trước ♀" : "♀ Bị ♂ khắc chế tại H1"}</span>
          ${isCollectible ? `<span class="badge" style="color:${owned > 0 ? "#4ade80" : "#fda4af"};">${owned > 0 ? `✓ Sở hữu ${owned}/${maxCap}` : "🔒 Chưa sở hữu"}</span>` : ""}
          ${activeDeck && isCollectible && card.fac === (CHAR_BY_ID[activeDeck.leaderId]?.fac) && card.id !== activeDeck.leaderId ? `<span class="badge">📚 Trong Deck: ${inDeckCount}/${maxCap}</span>` : ""}
          ${baseChar?.h ? `<span class="badge">📏 ${baseChar.h}m</span>` : ""}
        </div>
        ${isCollectible && !card.isHybrid ? `
          <div class="cz-economy-box">
            <div>🪙 Mua lẻ: <strong>${priceInfo.credits.toLocaleString()} Cr</strong></div>
            <div>⚒️ Chế tạo: <strong>${priceInfo.dust} Mảnh Gen</strong></div>
            <div>♻️ Phân giải: <strong>+${priceInfo.dustYield} Mảnh Gen</strong></div>
          </div>
        ` : ""}
      </div>

      <div class="cz-detail-col">
        ${evalCR ? `
          <div class="cz-block cr-live">
            <div class="cz-block-title">⚡ Chỉ Số Chiến Đấu Trực Tiếp Trong Trận</div>
            <div class="cz-block-text"><strong>Tổng CR: ${evalCR.total}</strong> • ${ESC(breakdownLines.join(" | ") || `Gốc ${card.cr}`)}</div>
          </div>
        ` : ""}

        <div class="cz-block row1">
          <div class="cz-block-head">
            <span class="cz-block-title">⚔️ HÀNG 1 — TỪ KHÓA &amp; HIỆU ỨNG CHIẾN ĐẤU</span>
            ${r1CondTag}
          </div>
          ${h1KwHtml}
          <div class="cz-block-text">${ESC(r1.desc || "Chiến đấu trực diện theo Tổng CR, phe phái và hiệu ứng làn.")}</div>
          ${r1.tag ? `<div class="cz-tag-line">Nhãn hiệu ứng: <code>${ESC(r1.tag)}</code></div>` : ""}
        </div>

        <div class="cz-block row2">
          <div class="cz-block-head">
            <span class="cz-block-title">🧬 HÀNG 2 — TỪ KHÓA SINH SẢN &amp; TÙ BINH</span>
            <span class="badge" style="color:#f472b6;">Hỗ trợ +${r2.crAura || 60} CR</span>
          </div>
          ${h2KwHtml}
          <div class="cz-block-text">${ESC(r2.desc || "Khi bị bắt giữ hoặc lai cặp Nam×Nữ tại Hàng 2 sẽ kích hoạt hỗ trợ Hàng 1.")}</div>
          <div class="cz-tag-line">🧬 Tỷ lệ lai / cơ chế: <strong>${ESC(breedPctStr)}</strong></div>
          ${debuffNote}
        </div>

        ${leaderSkill ? `
          <div class="cz-block special">
            <div class="cz-block-title">👑 Kỹ Năng Chủ Động Khi Làm Thủ Lĩnh Hàng 3</div>
            <div class="cz-note ok"><strong>🔥 Gene Surge (4⚡ • 1 lần/ván):</strong> +3 Cấp (+180 CR) toàn bàn trong lượt hiện tại.</div>
            <div class="cz-note ok"><strong>${leaderSkill.icon || "👑"} ${ESC(leaderSkill.name)} (${leaderSkill.cost || 3}⚡ • 1 lần/ván):</strong> ${ESC(leaderSkill.desc)}</div>
          </div>
        ` : ""}

        ${specialStatusNotes.length ? `
          <div class="cz-block special">
            <div class="cz-block-title">✦ Trạng Thái &amp; Đặc Tính Đột Biến</div>
            ${specialStatusNotes.map((n) => `<div class="cz-note ok">${ESC(n)}</div>`).join("")}
          </div>
        ` : ""}

        <div class="cz-block lore">
          <div class="cz-block-title">📜 Hồ Sơ Nhân Vật &amp; Tiểu Sử Lore</div>
          ${skillsHtml}
          <p class="cz-bio-text">${ESC(loreBio)}</p>
        </div>
      </div>
    `;

    // Build Context-Sensitive Actions Footer
    const actionsEl = document.getElementById("cz-actions");
    const btns = [];

    if (ctx.source === "duel" && ctx.zone === "hand" && eng && !eng.over) {
      const canAfford = eng.player.energy >= cardCost;
      btns.push(`<button type="button" class="btn-primary btn-compact" id="btn-cz-deploy" ${canAfford ? "" : "disabled"}>📥 Đặt Vào Làn Trống (${cardCost}⚡)</button>`);
      [0, 1, 2].forEach((laneIdx) => {
        const occupied = Boolean(eng.player.row1[laneIdx]);
        btns.push(`<button type="button" class="btn-glass btn-compact" data-cz-deploy-lane="${laneIdx}" ${(occupied || !canAfford) ? "disabled" : ""}>${occupied ? `🔒 Làn ${laneIdx + 1} Đầy` : `⚔️ Đặt Làn ${laneIdx + 1} (${cardCost}⚡)`}</button>`);
      });
    }

    const dossierTargetId = baseChar?.id || (CHAR_BY_ID[card.id] ? card.id : null);
    if (dossierTargetId) {
      btns.push(`<button type="button" class="btn-accent btn-compact" id="btn-cz-open-dossier">👤 Mở Mini-Tab Hồ Sơ Nhân Vật</button>`);
    }

    const deckFac = CHAR_BY_ID[activeDeck?.leaderId]?.fac;
    if (isCollectible && activeDeck && card.fac === deckFac && card.id !== activeDeck.leaderId) {
      if (owned > inDeckCount && activeDeck.cards.length < 16) {
        btns.push(`<button type="button" class="btn-primary btn-compact" id="btn-cz-add-deck">➕ Thêm Vào ${ESC(activeDeck.name)}</button>`);
      }
      if (inDeckCount > 0) {
        btns.push(`<button type="button" class="btn-glass btn-compact" id="btn-cz-rem-deck">➖ Gỡ 1 Khỏi Deck (${inDeckCount})</button>`);
      }
    }

    if (isCollectible && !card.isHybrid) {
      const curStar = this.game.getCardStarLevel(card.id);
      if (curStar < 3) {
        const starCost = this.game.getCardStarUpgradeCost(curStar);
        const nextBonus = this.game.getCardStarBonusCR(card.baseOriginCR || card.cr, curStar + 1);
        btns.push(`<button type="button" class="btn-gold btn-compact" id="btn-cz-upgrade-star" title="Cường hóa thẻ lên ★${curStar + 1} (+${nextBonus} CR & +${(curStar + 1) * 3}% tỷ lệ Lai H2)">🌟 Cường Hóa ★${curStar + 1} (${starCost} Mảnh)</button>`);
      } else {
        btns.push(`<span class="badge" style="color:#fbbf24;border-color:#fbbf24;">★★★ Tinh Anh Tối Đa</span>`);
      }
      if (owned < maxCap) {
        btns.push(`<button type="button" class="btn-gold btn-compact" id="btn-cz-buy">🪙 Mua (${priceInfo.credits.toLocaleString()} Cr)</button>`);
        btns.push(`<button type="button" class="btn-accent btn-compact" id="btn-cz-craft">⚒️ Chế Tạo (${priceInfo.dust} Mảnh)</button>`);
      }
      if (card.unique && owned === 0 && CHAR_BY_ID[card.id]) {
        const aff = this.game.getAffinity(card.id);
        const infCost = aff >= 35 ? 0 : (card.cr >= 750 ? 90 : 45);
        btns.push(`<button type="button" class="btn-glass btn-compact" id="btn-cz-recruit">${infCost === 0 ? "🤝 Chiêu Mộ Miễn Phí (Thân ≥35)" : `🤝 Chiêu Mộ (${infCost} Ảnh Hưởng)`}</button>`);
      }
      if (owned > 0 && card.id !== this.game.protagonistId) {
        btns.push(`<button type="button" class="btn-glass btn-compact" id="btn-cz-dismantle">♻️ Phân Giải (+${priceInfo.dustYield} Mảnh)</button>`);
      }
    }

    btns.push(`<button type="button" class="btn-glass btn-compact" id="btn-cz-close-footer">Đóng</button>`);
    actionsEl.innerHTML = btns.join("");

    document.getElementById("btn-cz-upgrade-star")?.addEventListener("click", () => {
      const r = this.game.upgradeCardStar(card.id, false);
      if (r.ok) {
        SFX.victory();
        this.refreshTopResources();
        if (this.duelTab === "deck") this.renderDeckBuilder();
        if (this.duelTab === "shop") this.renderShopView();
        if (this.duelTab === "draft") this.renderDraftView();
        if (this.duelEngine) this.renderDuelUI();
        this.showToast(`🌟 Cường Hóa ${"★".repeat(r.star)} Thành Công!`, `${card.name} nhận +${r.bonusCR} CR gốc & +${r.star * 3}% tỷ lệ Lai H2!`);
        this.openCardZoomModal(card, ctx);
      } else {
        SFX.alert();
        this.showToast("Chưa đủ Mảnh Gen", r.msg);
      }
    });

    document.getElementById("btn-cz-close-footer")?.addEventListener("click", () => {
      SFX.click();
      this.closeCardZoomModal();
    });

    document.getElementById("btn-cz-deploy")?.addEventListener("click", () => {
      const firstEmpty = this.duelEngine?.player.row1.findIndex((s) => s === null);
      if (firstEmpty == null || firstEmpty < 0) {
        SFX.alert();
        this.showToast("Hàng 1 đã đầy", "Hãy thu hồi 1 lá hoặc bấm Giao Chiến!");
        return;
      }
      const res = this.duelEngine.deployCardToRow1(ctx.idx, firstEmpty);
      if (res.ok) {
        SFX.cardPlay();
        this.lastDeployedLane = firstEmpty;
        this.closeCardZoomModal();
        this.renderDuelUI();
      } else {
        SFX.alert();
        this.showToast("Không thể ra bài", res.reason);
      }
    });

    actionsEl.querySelectorAll("[data-cz-deploy-lane]").forEach((laneBtn) => {
      laneBtn.addEventListener("click", () => {
        const laneIdx = Number(laneBtn.dataset.czDeployLane);
        const res = this.duelEngine?.deployCardToRow1(ctx.idx, laneIdx);
        if (res?.ok) {
          SFX.cardPlay();
          this.lastDeployedLane = laneIdx;
          this.closeCardZoomModal();
          this.renderDuelUI();
        } else if (res) {
          SFX.alert();
          this.showToast("Không thể ra bài", res.reason || res.msg || "Làn đã có thẻ");
        }
      });
    });

    document.getElementById("btn-cz-open-dossier")?.addEventListener("click", () => {
      SFX.click();
      this.closeCardZoomModal();
      if (dossierTargetId) this.openCharDossierModal(dossierTargetId, "overview");
    });

    document.getElementById("btn-cz-add-deck")?.addEventListener("click", () => {
      const r = this.game.addCardToActiveDeck(card.id);
      if (r.ok) {
        SFX.cardPlay();
        this.renderDeckBuilder();
        this.openCardZoomModal(card, ctx);
      } else {
        SFX.alert();
        this.showToast("Không thể thêm", r.msg);
      }
    });

    document.getElementById("btn-cz-rem-deck")?.addEventListener("click", () => {
      const pos = this.game.getActiveDeck().cards.lastIndexOf(card.id);
      if (pos >= 0) {
        SFX.click();
        this.game.removeCardFromActiveDeck(pos);
        this.renderDeckBuilder();
        this.openCardZoomModal(card, ctx);
      }
    });

    document.getElementById("btn-cz-buy")?.addEventListener("click", () => {
      const r = this.game.buyCardWithCredits(card.id);
      if (r.ok) {
        SFX.victory();
        this.refreshTopResources();
        this.renderDeckBuilder();
        this.renderShopView();
        this.showToast("🪙 Mua Thẻ Thành Công!", `${card.name} (${r.count}/${maxCap})`);
        this.openCardZoomModal(card, ctx);
      } else {
        SFX.alert();
        this.showToast("Chưa thể mua", r.msg);
      }
    });

    document.getElementById("btn-cz-craft")?.addEventListener("click", () => {
      const r = this.game.craftCardWithDust(card.id);
      if (r.ok) {
        SFX.breed();
        this.refreshTopResources();
        this.renderDeckBuilder();
        this.renderShopView();
        this.showToast("⚒️ Chế Tạo Thành Công!", `${card.name} (${r.count}/${maxCap})`);
        this.openCardZoomModal(card, ctx);
      } else {
        SFX.alert();
        this.showToast("Chưa đủ Mảnh Gen", r.msg);
      }
    });

    document.getElementById("btn-cz-recruit")?.addEventListener("click", () => {
      const r = this.game.recruitCharacterCard(card.id);
      if (r.ok) {
        SFX.victory();
        this.refreshTopResources();
        this.renderDeckBuilder();
        this.renderShopView();
        this.showToast("🤝 Chiêu Mộ Thành Công!", `${card.name} đã vào Kho Thẻ!`);
        this.openCardZoomModal(card, ctx);
      } else {
        SFX.alert();
        this.showToast("Chưa thể chiêu mộ", r.msg);
      }
    });

    document.getElementById("btn-cz-dismantle")?.addEventListener("click", () => {
      const r = this.game.dismantleCard(card.id);
      if (r.ok) {
        SFX.click();
        this.refreshTopResources();
        this.renderDeckBuilder();
        this.renderShopView();
        this.showToast("♻️ Đã Phân Giải Thẻ", `+${r.dustGained} Mảnh Gen (Còn ${r.remaining} bản)`);
        this.openCardZoomModal(card, ctx);
      } else {
        SFX.alert();
        this.showToast("Không thể phân giải", r.msg);
      }
    });

    modal.classList.remove("hidden");
  }

  getCardRarityClass(c) {
    if (!c) return "rarity-core";
    if (c.isToken || c.isHybrid) return "rarity-hybrid";
    if ((c.cr || 0) >= 220) return "rarity-mythic";
    if ((c.cr || 0) >= 140 || c.unique) return "rarity-legend";
    return "rarity-core";
  }

  renderTCGCardHTML(c, opts = {}) {
    const accent = FACTIONS[c.fac]?.color || "#38bdf8";
    const facShort = FACTIONS[c.fac]?.short || FACTIONS[c.fac]?.name || c.fac;
    const isM = c.gender === "Male";
    const r1 = c.row1Effect || {};
    const r2 = c.row2Effect || {};
    const rarity = this.getCardRarityClass(c);
    const condLit = Boolean(opts.condMet);
    const starLevel = typeof c.starLevel === "number" ? c.starLevel : this.game.getCardStarLevel(c.id);
    const starBonus = typeof c.starBonusCR === "number" ? c.starBonusCR : this.game.getCardStarBonusCR(c.cr, starLevel);
    const displayCR = typeof c.starBonusCR === "number" ? c.cr : ((c.cr || 100) + starBonus);
    const starBadge = starLevel > 0 ? `<span class="star-foil-pill star-${starLevel}" title="Cấp Tinh Anh ${"★".repeat(starLevel)}: +${starBonus} CR & +${starLevel * 3}% Lai H2">${"★".repeat(starLevel)}</span>` : "";
    const cardCost = Number(c.cost || getCardEnergyCost(c.cr, c.isToken));
    const h1Kws = (c.h1Keywords || []).map((k) => H1_KEYWORDS[k]).filter(Boolean);
    const h2Kws = (c.h2Keywords || []).map((k) => H2_KEYWORDS[k]).filter(Boolean);
    const kwBadges = [
      ...h1Kws.slice(0, 2).map((kw) => `<span class="kw-mini-pill h1" style="--kw-color:${kw.color};" title="${ESC(kw.name)}: ${ESC(kw.desc)}">${kw.icon} ${ESC(kw.shortLabel || kw.name)}</span>`),
      ...h2Kws.slice(0, 1).map((kw) => `<span class="kw-mini-pill h2" style="--kw-color:${kw.color};" title="H2 ${ESC(kw.name)}: ${ESC(kw.desc)}">${kw.icon}</span>`)
    ].join("");
    const h2Mod = r2.crPenaltyPct ? "debuff" : (r2.tier === "tamarite" ? "tamarite" : "");
    const extraCls = [
      opts.className || "hand-card",
      rarity,
      starLevel > 0 ? `star-foil-${starLevel}` : "",
      opts.selected ? "selected" : "",
      opts.playable === false ? "unaffordable" : "playable",
      opts.locked ? "card-locked" : "",
      condLit ? "cond-lit" : ""
    ].filter(Boolean).join(" ");
    const dragAttr = opts.draggable ? 'draggable="true"' : "";
    const attrs = `${dragAttr} ${opts.attrs || ""}`.trim();
    const zoomAttrs = opts.zoomAttrs || `data-zoom-host="1" data-zoom-card="${ESC(c.id)}"`;
    const ownBadge = opts.ownText ? `<span class="own-pill ${opts.locked ? "locked" : ""}">${ESC(opts.ownText)}</span>` : "";
    const customStyle = `--card-accent:${accent};${opts.style || ""}`;
    const titleStr = opts.title || `Cost ${cardCost}⚡ | H1: ${r1.desc || ""} | H2: ${r2.desc || ""}`;
    const badgeTop = c.fromRow2Breeding
      ? `<span class="token-pill row2-spawn">🧬 H2→H1</span>`
      : (c.isToken
        ? `<span class="token-pill">🪙 TOKEN</span>`
        : (condLit
          ? `<span class="cond-pill active">✅ ĐK H1</span>`
          : (c.isHybrid ? `<span class="token-pill hybrid">✦ LAI</span>` : "")));

    return `
      <button type="button" class="${extraCls}" style="${customStyle}" ${attrs} ${zoomAttrs} title="${ESC(titleStr)}">
        <span class="card-foil-sweep"></span>
        <span class="card-zoom-trigger" data-zoom-trigger="1" role="button" tabindex="0" title="Phóng to hoặc nhấn giữ để đọc toàn bộ thông số &amp; hiệu ứng">🔍</span>
        <span class="card-cost-gem" title="Chi phí Năng lượng Gen: ${cardCost}⚡">${cardCost}⚡</span>
        <span class="card-cr-gem">${displayCR}</span>
        <div class="card-top-badges">
          ${starBadge}
          <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
          ${ownBadge}
          ${badgeTop}
        </div>
        <div class="card-art-stage">
          <img class="hand-card-thumb" src="${getCardPortrait(c)}" alt="${ESC(c.name)}" draggable="false" ${opts.lazy ? 'loading="lazy"' : ""} />
          <div class="card-art-vignette"></div>
          ${kwBadges ? `<div class="card-kw-strip">${kwBadges}</div>` : ""}
          <div class="card-nameplate">
            <div class="card-name-title">${ESC(c.name)}</div>
            <div class="card-subline">${ESC(c.species)} • ${ESC(facShort)}</div>
          </div>
        </div>
        <div class="card-effects-mini">
          <div class="eff-line h1 ${condLit ? "cond-active" : ""}"><span>${condLit ? "✅" : "⚔️"}</span><span>${ESC(r1.tag || "Trực chiến")}</span></div>
          <div class="eff-line h2 ${h2Mod}"><span>🧬</span><span>${ESC(r2.tag || `+${r2.crAura || 60} CR`)}</span></div>
        </div>
      </button>
    `;
  }

  inspectDuelCard(card, evalCR = null) {
    const bar = document.getElementById("duel-card-inspector");
    if (!bar) return;
    if (!card) {
      bar.innerHTML = `<span class="muted">🔍 Chạm, kéo-thả hoặc nhấn giữ vào bất kỳ thẻ bài nào để xem rõ ⚡Cost, CR, Loài, Phe, ♂/♀, Từ khóa H1 &amp; H2.</span>`;
      return;
    }
    this.inspectedDuelCard = card;
    const isM = card.gender === "Male";
    const accent = FACTIONS[card.fac]?.color || "#38bdf8";
    const facLabel = FACTIONS[card.fac]?.name || card.fac;
    const cardCost = Number(card.cost || getCardEnergyCost(card.cr, card.isToken));
    const crStr = evalCR ? `Tổng CR ${evalCR.total} (Gốc ${card.cr})` : `CR ${card.cr}`;
    const r1 = card.row1Effect || {};
    const r2 = card.row2Effect || {};
    const h1Kws = (card.h1Keywords || []).map((k) => H1_KEYWORDS[k]).filter(Boolean);
    const h2Kws = (card.h2Keywords || []).map((k) => H2_KEYWORDS[k]).filter(Boolean);
    const kwSummary = [
      ...h1Kws.map((kw) => `<span class="badge" style="color:${kw.color};border-color:${kw.color};">${kw.icon} ${ESC(kw.name)}</span>`),
      ...h2Kws.map((kw) => `<span class="badge" style="color:${kw.color};border-color:${kw.color};">${kw.icon} ${ESC(kw.name)}</span>`)
    ].join(" ");
    const eng = this.duelEngine;
    const pCtx = eng ? eng.getSideBreedingContext("player") : null;
    const condActiveList = evalCR?.triggeredConditionals?.length
      ? evalCR.triggeredConditionals
      : (eng && r1.condType && eng.isConditionMet(card, null, "player") ? [`✅ ĐK H1 Sẵn Sàng (+${r1.condBonus || 0} CR)`] : []);
    const condHtml = condActiveList.length
      ? `<span class="badge" style="color:#6ee7b7;border-color:rgba(52,211,153,0.65);">${condActiveList.map((x) => ESC(x)).join(" • ")}</span>`
      : (r1.condType ? `<span class="badge" style="color:#94a3b8;">⏳ Cần Hàng 2 Lai / Token Hàng 1</span>` : "");

    const dickCancelsDebuff = card.debuffCanceledByDick || (pCtx?.hasDick && r2.crPenaltyPct);
    const penWarn = r2.crPenaltyPct
      ? (dickCancelsDebuff
        ? ` • <span style="color:#6ee7b7;">✅ Dick đã hóa giải Debuff -${r2.crPenaltyPct}% CR!</span>`
        : ` • <span style="color:#fda4af;">Debuff -${r2.crPenaltyPct}% CR Token</span>`)
      : "";
    const symNote = r2.symbiosisR2Boost ? ` • <span style="color:#c084fc;">✨ +${r2.symbiosisR2Boost}% cho mọi Buồng Lai H2</span>` : "";
    const dblActive = r2.doubleIfTokenBred && pCtx && (pCtx.hasRow1Token || pCtx.totalTokensBred > 0);
    const dblNote = r2.doubleIfTokenBred
      ? (dblActive ? ` • <span style="color:#fde047;">✅ ×2 Aura H2 (+${(r2.crAura || 40) * 2} CR)</span>` : ` • <span class="muted">×2 Aura khi có Token H1</span>`)
      : "";
    const sireLine = card.breedingActive && card.sireCard
      ? ` • <span style="color:#f472b6;">Đang lai cùng ♂ ${ESC(card.sireCard.name)} (${eng?.getEffectiveBreedChance(card) || r2.breedChance || 50}%/lượt → Token lên Hàng 1, đã sinh ${card.spawnCount || 0})</span>`
      : "";
    bar.innerHTML = `
      <div class="inspector-card-thumb ${this.getCardRarityClass(card)}" style="--card-accent:${accent};">
        <img src="${getCardPortrait(card)}" alt="${ESC(card.name)}" />
        <span class="inspector-cr-chip">${evalCR ? evalCR.total : card.cr}</span>
      </div>
      <div class="inspector-body">
        <div class="inspector-head">
          <strong style="color:#fff;">${ESC(card.name)}</strong>
          <span class="badge energy-orb-pill" style="font-size:10.5px;">⚡ ${cardCost}</span>
          <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂ Nam" : "♀ Nữ"}</span>
          <span class="inspector-cr-text">⚔️ ${crStr}</span>
          <span class="muted">${ESC(card.species)} • ${ESC(facLabel)}</span>
          ${kwSummary}
          ${card.fromRow2Breeding ? `<span class="badge" style="color:#a7f3d0;border-color:rgba(52,211,153,0.6);">🧬 TOKEN TỪ HÀNG 2</span>` : (card.isToken ? `<span class="badge" style="color:#f472b6;border-color:rgba(244,114,182,0.5);">🪙 TOKEN LAI</span>` : "")}
          ${condHtml}
          <button type="button" class="btn-primary btn-compact insp-zoom-btn" id="btn-inspect-zoom">🔍 Phóng To / Đọc Đủ Eff</button>
        </div>
        <div class="inspector-eff h1">⚔️ <strong>H1:</strong> ${ESC(r1.desc || "Đánh trực tiếp theo tổng CR")}</div>
        <div class="inspector-eff h2">🧬 <strong>H2:</strong> ${ESC(r2.desc || "Hỗ trợ +60 CR")}${penWarn}${symNote}${dblNote}${sireLine}</div>
      </div>
    `;
    document.getElementById("btn-inspect-zoom")?.addEventListener("click", () => {
      SFX.click();
      this.openCardZoomModal(card, { source: "duel", evalCR });
    });
  }

  renderDuelUI() {
    const eng = this.duelEngine;
    if (!eng) return;

    const pLeader = eng.player.leader;
    const eLeader = eng.enemy.leader;
    const pFacName = FACTIONS[pLeader.fac]?.name || pLeader.fac;
    const eFacName = FACTIONS[eLeader.fac]?.name || eLeader.fac;

    document.getElementById("deck-count-badge").textContent =
      this.game.getActiveDeck()?.cards?.length ?? validateDeckForLeader(this.game.customDeck || [], this.game.protagonistId, this.game.hybrids, this.game.collection).length;

    // Row 3 Outer Leader Slots
    const eRow3Eval = eng.evalCardCombatCR(eLeader, eng.getRow1Cards("player")[0] || null, "enemy", { attackingRow3: true });
    const pRow3Eval = eng.evalCardCombatCR(pLeader, eng.getRow1Cards("enemy")[0] || null, "player", { attackingRow3: true });
    const eFrontCount = eng.getRow1Cards("enemy").length;
    const pFrontCount = eng.getRow1Cards("player").length;

    const eWingBar = document.querySelector(".commander-bar.enemy.row3-slot");
    const pWingBar = document.querySelector(".commander-bar.player.row3-slot");
    eWingBar?.classList.toggle("exposed", eFrontCount === 0);
    pWingBar?.classList.toggle("exposed", pFrontCount === 0);
    if (eWingBar) eWingBar.style.setProperty("--card-accent", FACTIONS[eLeader.fac]?.color || "#ef4444");
    if (pWingBar) pWingBar.style.setProperty("--card-accent", FACTIONS[pLeader.fac]?.color || "#38bdf8");

    document.getElementById("duel-e-img").src = getCardPortrait(eLeader);
    document.getElementById("duel-e-name").innerHTML = `${ESC(eLeader.name)} <span class="gender-pill ${eLeader.gender === "Male" ? "male" : "female"}">${eLeader.gender === "Male" ? "♂" : "♀"}</span>${eng.isBossFloor ? ` <span class="badge" style="color:#fbbf24;border-color:#fbbf24;">👑 BOSS</span>` : ""}`;
    document.getElementById("duel-e-meta").textContent = `${eLeader.species} • Phe ${eFacName} • H1: ${eLeader.row1Effect?.tag || ""}`;
    document.getElementById("duel-e-row3-cr").textContent = `⚔️ CR Hàng 3: ${eRow3Eval.total} (Gốc ${eLeader.cr})`;
    document.getElementById("duel-e-row3-state").textContent = eFrontCount > 0 ? `🛡️ Hàng 1 Bảo Hộ (${eFrontCount} lá)` : "⚡ LỘ DIỆN — Tổng CR H1 đánh thẳng Hàng 3!";
    document.getElementById("duel-e-captives").textContent = `🔒 Bắt: ${eng.enemy.row2.length}/3`;
    const eEnergyBadge = document.getElementById("duel-e-energy-badge");
    if (eEnergyBadge) eEnergyBadge.textContent = `⚡ ${eng.enemy.energy}/${eng.enemy.maxEnergy}`;
    const eHandCountEl = document.getElementById("duel-e-hand-count");
    if (eHandCountEl) eHandCountEl.textContent = `🃏 Tay Địch: ${eng.enemy.hand.length} lá`;
    const eHandEl = document.getElementById("duel-e-hand");
    if (eHandEl) {
      eHandEl.innerHTML = eng.enemy.hand.slice(0, 8).map((_, idx) => `<div class="enemy-card-back" title="Bài trên tay Địch #${idx + 1}"><span>✦</span></div>`).join("");
    }
    const eDeckCountEl = document.getElementById("duel-e-deck-count");
    if (eDeckCountEl) eDeckCountEl.textContent = `${eng.enemy.deck.length}`;

    document.getElementById("duel-p-img").src = getCardPortrait(pLeader);
    document.getElementById("duel-p-name").innerHTML = `${ESC(pLeader.name)} <span class="gender-pill ${pLeader.gender === "Male" ? "male" : "female"}">${pLeader.gender === "Male" ? "♂" : "♀"}</span>`;
    document.getElementById("duel-p-meta").textContent = `${pLeader.species} • Phe ${pFacName} • H1: ${pLeader.row1Effect?.tag || ""}`;
    document.getElementById("duel-p-row3-cr").textContent = `⚔️ CR Hàng 3: ${pRow3Eval.total} (Gốc ${pLeader.cr})`;
    document.getElementById("duel-p-row3-state").textContent = pFrontCount > 0 ? `🛡️ Hàng 1 Bảo Hộ (${pFrontCount} lá)` : "⚠️ HÀNG 1 TRỐNG — Hàng 3 bị uy hiếp!";
    document.getElementById("duel-p-captives").textContent = `🔒 Bắt: ${eng.player.row2.length}/3`;
    const pDeckNumEl = document.getElementById("duel-p-deck-num");
    if (pDeckNumEl) pDeckNumEl.textContent = `${eng.player.deck.length}`;
    document.getElementById("duel-p-deck-count").textContent = `Bộ bài: ${eng.player.deck.length} (+2/lượt)`;

    // Energy Orb & Turn Bar
    const energyBadge = document.getElementById("duel-energy-badge");
    if (energyBadge) {
      energyBadge.innerHTML = `⚡ <strong>${eng.player.energy}/${eng.player.maxEnergy}</strong> Năng Lượng Gen`;
    }
    const undoBtn = document.getElementById("btn-undo-duel");
    if (undoBtn) {
      undoBtn.disabled = !eng.canUndo() || this.isResolvingClash;
    }
    const mulliganBtn = document.getElementById("btn-mulligan-duel");
    if (mulliganBtn) {
      const canMull = eng.canMulligan() && !this.isResolvingClash;
      mulliganBtn.disabled = !canMull;
      mulliganBtn.textContent = eng.player.mulliganUsed ? "✓ Đã Đổi Bài" : "🔄 Đổi Bài";
    }
    const dirBtn = document.getElementById("btn-tactical-directive");
    if (dirBtn) {
      const canDir = !eng.over && !this.isResolvingClash && !eng.player.directiveUsedThisTurn && eng.player.energy >= 1;
      dirBtn.disabled = !canDir;
      dirBtn.textContent = eng.player.directiveUsedThisTurn
        ? "✓ Đã Dùng Chỉ Thị"
        : (eng.enemy.row2.length > 0 && eng.player.energy >= 2
          ? "🔓 Giải Cứu (2⚡)"
          : (eng.player.energy >= 2 ? "🧬 Đột Biến (2⚡)" : "🛡️ Khiên (1⚡)"));
    }

    // Active Leader Skills Bar (Gene Surge 4⚡ + Faction/Leader Skill 3⚡)
    const surgeBtn = document.getElementById("btn-gene-surge");
    if (surgeBtn) {
      const surgeCost = GENE_SURGE_SKILL.cost || 4;
      surgeBtn.disabled = Boolean(eng.over || this.isResolvingClash || eng.player.geneSurgeUsed || eng.player.energy < surgeCost);
      surgeBtn.classList.toggle("skill-active", Boolean(eng.player.geneSurgeActiveThisTurn));
      surgeBtn.textContent = eng.player.geneSurgeActiveThisTurn
        ? "🔥 Gene Surge Đang Bật!"
        : eng.player.geneSurgeUsed
          ? "✓ Gene Surge (Đã dùng)"
          : `🔥 Gene Surge (${surgeCost}⚡)`;
    }

    const lSkillBtn = document.getElementById("btn-leader-skill");
    if (lSkillBtn) {
      const lSkill = pLeader.leaderSkill || getLeaderSkillForCard(pLeader);
      const lCost = lSkill?.cost || 3;
      const lActive = Boolean(eng.player.leaderSkillBuffCR || eng.player.leaderSkillEnemyPenaltyCR);
      lSkillBtn.disabled = Boolean(eng.over || this.isResolvingClash || eng.player.leaderSkillUsed || eng.player.energy < lCost);
      lSkillBtn.classList.toggle("skill-active", lActive);
      lSkillBtn.title = `${lSkill?.name || "Tuyệt Kỹ Tướng"} (${lCost}⚡ • 1 lần/ván): ${lSkill?.desc || ""}`;
      lSkillBtn.textContent = lActive
        ? `${lSkill?.icon || "👑"} ${lSkill?.name || "Kỹ Năng"} Đang Bật!`
        : eng.player.leaderSkillUsed
          ? `✓ ${lSkill?.name || "Kỹ Năng"} (Đã dùng)`
          : `${lSkill?.icon || "👑"} ${lSkill?.name || "Kỹ Năng Tướng"} (${lCost}⚡)`;
    }

    document.getElementById("duel-turn-badge").textContent = `${eng.modeLabel || "Snap × YGO"} • Lượt ${eng.turn}`;
    const lastLog = eng.log[eng.log.length - 1];
    document.getElementById("duel-log-latest").textContent = lastLog || "";

    // Live Breeding & Conditional Synergy Bar
    const pCtx = eng.getSideBreedingContext("player");
    const eCtx = eng.getSideBreedingContext("enemy");
    const synBar = document.getElementById("duel-synergy-bar");
    if (synBar) {
      const pLitCount = eng.player.row1.filter((u, idx) => u && eng.evalCardCombatCR(u, eng.enemy.row1[idx], "player", { laneIdx: idx }).triggeredConditionals.length > 0).length
        + (eng.player.row2.filter((c) => c.row2Effect?.doubleIfTokenBred && (pCtx.hasRow1Token || pCtx.totalTokensBred > 0)).length);
      synBar.classList.remove("hidden");
      synBar.innerHTML = `
        <span class="synergy-pill ${pCtx.activeBreedCount > 0 ? "breed" : ""}">🔥 Buồng Lai H2: ${pCtx.activeBreedCount}/3</span>
        <span class="synergy-pill ${pCtx.row1TokenCount > 0 || pCtx.totalTokensBred > 0 ? "lit" : ""}">🧬 Token H1: ${pCtx.row1TokenCount} (Tổng sinh: ${pCtx.totalTokensBred})</span>
        <span class="synergy-pill ${pLitCount > 0 ? "lit" : ""}">⚡ ĐK Đã Kích Hoạt: ${pLitCount}</span>
        ${eng.player.geneSurgeActiveThisTurn ? `<span class="synergy-pill lit">🔥 Gene Surge: +180 CR</span>` : ""}
        ${eng.player.leaderSkillUsed ? `<span class="synergy-pill lit">👑 ${ESC(pLeader.leaderSkill?.name || "Tuyệt Kỹ Phe")}</span>` : ""}
        ${pCtx.r2SymbiosisBonus > 0 ? `<span class="synergy-pill breed">✨ Cộng Sinh H2: +${pCtx.r2SymbiosisBonus}%</span>` : ""}
        ${pCtx.hasDick ? `<span class="synergy-pill lit">💖 Dick: Phá Debuff Human</span>` : ""}
        ${eCtx.row1TokenCount > 0 ? `<span class="synergy-pill">👁️ Token Địch H1: ${eCtx.row1TokenCount}</span>` : ""}
      `;
    }

    // Row 2 Captives & Automatic Male×Female Breeding Zones (spawn Token -> Row 1)
    const renderRow2Chips = (sideKey, list, emptyMsg, isEnemy) => {
      if (!list.length) return `<span class="muted" style="font-size:11px;">${emptyMsg}</span>`;
      const sCtx = eng.getSideBreedingContext(sideKey);
      return list.map((c, idx) => {
        const isBreeding = Boolean(c.breedingActive);
        const effPct = isBreeding ? eng.getEffectiveBreedChance(c, sideKey) : 0;
        const r2 = c.row2Effect || {};
        const dblLit = Boolean(r2.doubleIfTokenBred && (sCtx.hasRow1Token || sCtx.totalTokensBred > 0));
        const symLit = Boolean(r2.symbiosisR2Boost && isBreeding);
        const effAura = (r2.crAura || 40) * (dblLit ? 2 : 1);
        const penBadge = r2.crPenaltyPct
          ? (sCtx.hasDick ? ` • <span style="color:#6ee7b7;">Dick Xóa -${r2.crPenaltyPct}%</span>` : ` • <span style="color:#fda4af;">-${r2.crPenaltyPct}% CR</span>`)
          : "";
        const symBadge = r2.symbiosisR2Boost ? ` • <span style="color:#e9d5ff;">+${r2.symbiosisR2Boost}% H2</span>` : "";
        const dblBadge = dblLit ? ` <span style="color:#fde047;">[✅ ×2: +${effAura} CR]</span>` : "";
        const subText = isBreeding
          ? `🔥 Lai ${effPct}%→H1 (♂ ${ESC(c.sireCard?.name || "Nam")}) • 🪙x${c.spawnCount || 0}${penBadge}${symBadge}${dblBadge}`
          : `🔒 Tù binh • H2: +${effAura} CR (${ESC(r2.tag || "")})${dblBadge}`;
        return `
          <div class="row2-captive-chip ${isBreeding ? "breeding-chamber" : ""} ${(dblLit || symLit) ? "cond-lit" : ""}"
               data-zoom-host="1" data-inspect-side="${sideKey}" data-inspect-zone="row2" data-inspect-idx="${idx}"
               title="${ESC(r2.desc || "")}">
            <img src="${getCardPortrait(c)}" alt="${ESC(c.name)}" />
            <div style="flex:1;min-width:0;">
              <strong>${ESC(c.name)}</strong>
              <span class="gender-pill ${c.gender === "Male" ? "male" : "female"}">${c.gender === "Male" ? "♂" : "♀"}</span>
              <span class="muted">(${ESC(c.species)})</span>
              <div style="font-size:10px;color:${isBreeding ? "#f9a8d4" : (isEnemy ? "#fda4af" : "#bae6fd")};">${subText}</div>
            </div>
            <button type="button" class="card-zoom-mini" data-zoom-trigger="1" title="Phóng to đọc đủ thông số &amp; H2">🔍</button>
          </div>
        `;
      }).join("");
    };

    document.getElementById("duel-e-row2-aura").textContent = `Hỗ trợ Địch: +${eng.getRow2SupportAura("enemy")} CR`;
    const eRow2El = document.getElementById("duel-e-row2");
    eRow2El.innerHTML = renderRow2Chips("enemy", eng.enemy.row2, "Chưa bắt được thẻ nào (Địch bắt 3 lá = Bạn thua!)", true);

    document.getElementById("duel-p-row2-aura").textContent = `Hỗ trợ H1 & Sinh Token→H1: +${eng.getRow2SupportAura("player")} CR`;
    const pRow2El = document.getElementById("duel-p-row2");
    pRow2El.innerHTML = renderRow2Chips("player", eng.player.row2, "Trống — Thẻ Nam thắng Nữ sẽ đưa vào đây lai & sinh Token lên HÀNG 1!", false);

    const activeHandCard = (this.draggedHandIdx !== null && eng.player.hand[this.draggedHandIdx])
      ? eng.player.hand[this.draggedHandIdx]
      : (eng.selectedHandIdx !== null ? eng.player.hand[eng.selectedHandIdx] : null);

    // Marvel Snap 3 Cosmic Lane Locations + Live Power Comparison + Outcome Forecast
    const lanesEl = document.getElementById("duel-lanes-bar");
    if (lanesEl) {
      lanesEl.innerHTML = (eng.lanes || []).map((loc, i) => {
        const pUnit = eng.player.row1[i];
        const eUnit = eng.enemy.row1[i];
        const pCR = pUnit ? eng.evalCardCombatCR(pUnit, eUnit, "player", { laneIdx: i }).total : 0;
        const eCR = eUnit ? eng.evalCardCombatCR(eUnit, pUnit, "enemy", { laneIdx: i }).total : 0;
        const forecast = eng.getLaneForecast(i, !pUnit ? activeHandCard : null);
        const statusCls = forecast.outcome === "player_win" || forecast.outcome === "player_hold"
          ? "win"
          : (forecast.outcome === "enemy_win" || forecast.outcome === "enemy_hold" ? "lose" : "");
        const fPillCls = forecast.outcome === "player_win" || forecast.outcome === "player_hold"
          ? "win"
          : forecast.outcome === "enemy_win" || forecast.outcome === "enemy_hold"
            ? "loss"
            : (forecast.outcome === "tie" || forecast.outcome === "player_shield_block" || forecast.outcome === "enemy_shield_block")
              ? "tie"
              : "empty";
        return `
          <div class="lane-loc-card lane-loc-chip ${statusCls}" data-lane-chip="${i}" title="${ESC(loc.desc)}">
            <div class="lane-loc-head">
              <span>${ESC(loc.name)}</span>
              <span>Làn ${i + 1}</span>
            </div>
            <div class="lane-loc-desc">${ESC(loc.desc)}</div>
            <div class="lane-cr-meter">
              <span style="color:#7dd3fc;">Ta ${forecast.pTotal ?? pCR}</span>
              <span style="color:#fbbf24;">VS</span>
              <span style="color:#fda4af;">Địch ${forecast.eTotal ?? eCR}</span>
            </div>
            <div class="lane-forecast-pill ${fPillCls}">${ESC(forecast.label)}</div>
          </div>
        `;
      }).join("");
    }

    // Helper for Row 1 unit active keyword pills
    const renderUnitActiveKws = (u, opp) => {
      const pills = [];
      if (u.shieldCharges > 0) pills.push(`<span class="unit-kw-tag shield" title="Khiên: Chặn 1 lần thua giao chiến">🛡️ Khiên</span>`);
      if (u.deployedTurn === eng.turn && (u.h1Keywords || []).includes("charge")) {
        pills.push(`<span class="unit-kw-tag charge" title="Xung Phong: +2 Cấp (+120 CR) lượt ra bài">⚡ Xung Phong</span>`);
      }
      if ((u.h1Keywords || []).includes("pierce")) {
        pills.push(`<span class="unit-kw-tag pierce" title="Xuyên Giáp: Phá Khiên địch &amp; tăng sát thương H3">🗡️ Xuyên Giáp</span>`);
      }
      if (u.gender === "Male" && opp && opp.gender === "Female") {
        pills.push(`<span class="unit-kw-tag gender-adv" title="Ưu thế giới tính: Nam đấu Nữ +2 Cấp (+120 CR)">♂&gt;♀ +120</span>`);
      }
      return pills.join("");
    };

    // Enemy Row 1 (3 Vertical Lanes)
    document.getElementById("duel-e-row1").innerHTML = eng.enemy.row1.map((u, i) => {
      if (!u) return `<div class="board-slot" data-lane="${i}">Địch Làn ${i + 1} (Trống)</div>`;
      const pOpp = eng.player.row1[i];
      const evalCR = eng.evalCardCombatCR(u, pOpp, "enemy", { laneIdx: i });
      const isM = u.gender === "Male";
      const accent = FACTIONS[u.fac]?.color || "#ef4444";
      const facShort = FACTIONS[u.fac]?.short || u.fac;
      const condLit = evalCR.triggeredConditionals && evalCR.triggeredConditionals.length > 0;
      const breedRisk = (pOpp && pOpp.gender === "Male" && !isM && evalCR.total < (pOpp ? eng.evalCardCombatCR(pOpp, u, "player", { laneIdx: i }).total : 0))
        ? `<span class="matchup-tag breed-target">💘 Bắt &amp; Lai</span>`
        : "";
      const tokBadge = u.fromRow2Breeding
        ? `<span class="token-pill row2-spawn">🧬 TỪ H2</span>`
        : (u.isToken ? `<span class="token-pill">🪙 TOKEN</span>` : "");
      const uCost = Number(u.cost || getCardEnergyCost(u.cr, u.isToken));
      return `
        <div class="board-slot" data-lane="${i}">
          <div class="tcg-unit-card enemy-unit ${this.getCardRarityClass(u)} ${u.isToken ? "is-token" : ""} ${condLit ? "cond-lit" : ""}"
               style="--card-accent:${accent};"
               data-zoom-host="1" data-inspect-side="enemy" data-inspect-zone="row1" data-inspect-idx="${i}"
               title="${ESC(u.row1Effect?.desc || "")}">
            <span class="card-foil-sweep"></span>
            <span class="card-zoom-trigger" data-zoom-trigger="1" role="button" tabindex="0" title="Phóng to hoặc nhấn giữ để đọc toàn bộ thông số &amp; hiệu ứng">🔍</span>
            <span class="card-cost-gem">${uCost}⚡</span>
            <span class="card-cr-gem">${evalCR.total}</span>
            ${tokBadge}
            <div class="unit-thumb-frame">
              <img src="${getCardPortrait(u)}" alt="${ESC(u.name)}" draggable="false" />
            </div>
            <div class="unit-info-col">
              <div class="unit-name-row">
                <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
                <span class="unit-name-text">${ESC(u.name)}</span>
              </div>
              <div class="unit-meta-line">${ESC(u.species)} • ${ESC(facShort)} ${renderUnitActiveKws(u, pOpp)}</div>
              <div class="unit-cr-delta enemy">Gốc ${u.cr} → ${evalCR.total} ${breedRisk}</div>
              <div class="unit-eff-tag ${condLit ? "cond-active" : ""}">${condLit ? "✅ " : "⚔️ "}${ESC(u.row1Effect?.tag || "Trực chiến")}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Player Row 1 (3 Vertical Lanes)
    const pRow1El = document.getElementById("duel-p-row1");
    const hasSelectedHand = activeHandCard;
    const justDeployedLane = this.lastDeployedLane;
    this.lastDeployedLane = null;

    pRow1El.innerHTML = eng.player.row1.map((u, i) => {
      if (!u) {
        const oppE = eng.enemy.row1[i];
        const canHunt = hasSelectedHand && hasSelectedHand.gender === "Male" && oppE && oppE.gender === "Female";
        const fCast = hasSelectedHand ? eng.getLaneForecast(i, hasSelectedHand) : null;
        const previewTag = fCast
          ? `<div class="slot-preview-outcome ${fCast.outcome}">${ESC(fCast.label)}</div>`
          : "";
        return `
          <button type="button" class="board-slot ${hasSelectedHand ? "droppable" : ""}" data-lane="${i}" data-deploy-lane="${i}">
            <div>${hasSelectedHand ? (canHunt ? `💘 Thả/Đặt ♂ Bắt Nữ Làn ${i + 1}` : `📥 Thả hoặc Bấm Đặt Làn ${i + 1}`) : `Hàng 1 — Làn ${i + 1} (Kéo thả thẻ vào đây)`}</div>
            ${previewTag}
          </button>
        `;
      }
      const eOpp = eng.enemy.row1[i];
      const evalCR = eng.evalCardCombatCR(u, eOpp, "player", { laneIdx: i });
      const canRecall = u.deployedTurn === eng.turn && !eng.over && !u.fromRow2Breeding;
      const isM = u.gender === "Male";
      const accent = FACTIONS[u.fac]?.color || "#38bdf8";
      const facShort = FACTIONS[u.fac]?.short || u.fac;
      const condLit = evalCR.triggeredConditionals && evalCR.triggeredConditionals.length > 0;
      const dangerTag = (eOpp && eOpp.gender === "Male" && !isM && evalCR.total < eng.evalCardCombatCR(eOpp, u, "enemy", { laneIdx: i }).total)
        ? `<span class="matchup-tag danger">⚠️ Nguy cơ</span>`
        : (u.tokenBoostCR ? `<span class="cond-pill active">+${u.tokenBoostCR} Token</span>` : "");
      const tokBadge = u.fromRow2Breeding
        ? `<span class="token-pill row2-spawn">🧬 TỪ H2</span>`
        : (u.isToken ? `<span class="token-pill">🪙 TOKEN</span>` : "");
      const uCost = Number(u.cost || getCardEnergyCost(u.cr, u.isToken));
      const deployAnimCls = justDeployedLane === i ? "anim-card-deploy" : "";
      return `
        <div class="board-slot" data-lane="${i}">
          <button type="button" class="tcg-unit-card ${this.getCardRarityClass(u)} ${canRecall ? "ready" : ""} ${u.isToken ? "is-token" : ""} ${condLit ? "cond-lit" : ""} ${deployAnimCls}"
                  style="--card-accent:${accent};"
                  data-recall-lane="${i}"
                  data-zoom-host="1" data-inspect-side="player" data-inspect-zone="row1" data-inspect-idx="${i}"
                  title="${canRecall ? "Bấm để thu hồi về tay (hoàn lại ⚡) trước khi Giao Chiến" : ESC(u.row1Effect?.desc || "")}">
            <span class="card-foil-sweep"></span>
            <span class="card-zoom-trigger" data-zoom-trigger="1" role="button" tabindex="0" title="Phóng to hoặc nhấn giữ để đọc toàn bộ thông số &amp; hiệu ứng">🔍</span>
            <span class="card-cost-gem">${uCost}⚡</span>
            <span class="card-cr-gem">${evalCR.total}</span>
            ${tokBadge}
            <div class="unit-thumb-frame">
              <img src="${getCardPortrait(u)}" alt="${ESC(u.name)}" draggable="false" />
            </div>
            <div class="unit-info-col">
              <div class="unit-name-row">
                <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span>
                <span class="unit-name-text">${ESC(u.name)}</span>
              </div>
              <div class="unit-meta-line">${ESC(u.species)} • ${ESC(facShort)} ${renderUnitActiveKws(u, eOpp)}</div>
              <div class="unit-cr-delta player">Gốc ${u.cr} → ${evalCR.total} ${dangerTag}</div>
              <div class="unit-eff-tag ${condLit ? "cond-active" : ""}">${canRecall ? `↩️ Thu (+${uCost}⚡) • ` : ""}${condLit ? "✅ " : "⚔️ "}${ESC(u.row1Effect?.tag || "Trực chiến")}</div>
            </div>
          </button>
        </div>
      `;
    }).join("");

    const deployHandCardToLane = (handIdx, laneIdx) => {
      if (this.isResolvingClash) return;
      const res = eng.deployCardToRow1(handIdx, laneIdx);
      if (res.ok) {
        SFX.cardPlay();
        this.lastDeployedLane = laneIdx;
        this.draggedHandIdx = null;
        this.renderDuelUI();
        if (res.notes && res.notes.length) {
          this.showToast(`⚡ Ra Bài Làn ${laneIdx + 1}`, res.notes.join(" • "));
        }
      } else {
        SFX.alert();
        this.draggedHandIdx = null;
        this.showToast("Không thể đặt bài", res.reason);
      }
    };

    pRow1El.querySelectorAll("[data-deploy-lane]").forEach((btn) => {
      const lane = Number(btn.dataset.deployLane);
      btn.addEventListener("click", () => {
        if (eng.selectedHandIdx === null) {
          this.showToast("Chọn hoặc kéo thẻ trên tay", "Hãy kéo-thả thẻ vào làn này hoặc bấm chọn 1 thẻ dưới tay trước!");
          return;
        }
        deployHandCardToLane(eng.selectedHandIdx, lane);
      });

      // HTML5 Drag & Drop target on open lane slots
      btn.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        btn.classList.add("drag-over");
      });
      btn.addEventListener("dragleave", () => {
        btn.classList.remove("drag-over");
      });
      btn.addEventListener("drop", (e) => {
        e.preventDefault();
        btn.classList.remove("drag-over");
        const rawIdx = e.dataTransfer?.getData("text/plain") ?? this.draggedHandIdx;
        const hIdx = Number(rawIdx);
        if (!Number.isNaN(hIdx) && eng.player.hand[hIdx]) {
          deployHandCardToLane(hIdx, lane);
        }
      });
    });

    pRow1El.querySelectorAll("[data-recall-lane]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (e.target.closest("[data-zoom-trigger]")) return;
        if (this.isResolvingClash) return;
        const res = eng.recallFromRow1(Number(btn.dataset.recallLane));
        if (res.ok) {
          SFX.click();
          this.renderDuelUI();
        } else if (res.reason) {
          this.showToast("Đang trấn giữ", res.reason);
        }
      });
    });

    // Player Hand (TCG Upright Cards with Energy Cost, Keywords, Drag & Drop + Touch Drag + Click)
    const handEl = document.getElementById("duel-p-hand");
    const openLane = eng.player.row1.findIndex((s) => s === null);
    const previewOpp = openLane >= 0 ? eng.enemy.row1[openLane] : eng.enemy.row1[0];
    handEl.innerHTML = eng.player.hand.map((c, idx) => {
      const cardCost = Number(c.cost || getCardEnergyCost(c.cr, c.isToken));
      const canAfford = !eng.over && openLane >= 0 && eng.player.energy >= cardCost;
      return this.renderTCGCardHTML(c, {
        playable: canAfford,
        draggable: !eng.over && eng.player.energy >= cardCost,
        selected: eng.selectedHandIdx === idx,
        condMet: eng.isConditionMet(c, previewOpp, "player"),
        zoomAttrs: `data-zoom-host="1" data-zoom-card="${ESC(c.id)}"`,
        attrs: `data-hand-idx="${idx}" data-inspect-side="player" data-inspect-zone="hand" data-inspect-idx="${idx}"`
      });
    }).join("");

    handEl.querySelectorAll("[data-hand-idx]").forEach((btn) => {
      const idx = Number(btn.dataset.handIdx);
      const card = eng.player.hand[idx];

      // HTML5 Drag start / end
      btn.addEventListener("dragstart", (e) => {
        if (!card || eng.over || this.isResolvingClash) {
          e.preventDefault();
          return;
        }
        this.draggedHandIdx = idx;
        eng.selectedHandIdx = idx;
        btn.classList.add("dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(idx));
        }
        this.inspectDuelCard(card);
        pRow1El.querySelectorAll("[data-deploy-lane]").forEach((slot) => slot.classList.add("droppable"));
      });

      btn.addEventListener("dragend", () => {
        btn.classList.remove("dragging");
        this.draggedHandIdx = null;
        pRow1El.querySelectorAll("[data-deploy-lane]").forEach((slot) => slot.classList.remove("drag-over"));
      });

      // Touch drag-to-lane for mobile / tablet touchscreens
      let touchDragActive = false;
      let touchStartX = 0;
      let touchStartY = 0;
      btn.addEventListener("touchstart", (e) => {
        if (!card || eng.over || this.isResolvingClash || e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchDragActive = false;
      }, { passive: true });

      btn.addEventListener("touchmove", (e) => {
        if (!card || eng.over || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (!touchDragActive && Math.hypot(dx, dy) > 18 && dy < -10) {
          touchDragActive = true;
          this.draggedHandIdx = idx;
          eng.selectedHandIdx = idx;
          btn.classList.add("dragging");
        }
        if (touchDragActive) {
          const targetEl = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
          const slotBtn = targetEl?.closest?.("[data-deploy-lane]");
          pRow1El.querySelectorAll("[data-deploy-lane]").forEach((s) => s.classList.toggle("drag-over", s === slotBtn));
        }
      }, { passive: true });

      btn.addEventListener("touchend", (e) => {
        if (!touchDragActive) return;
        touchDragActive = false;
        btn.classList.remove("dragging");
        const touch = e.changedTouches?.[0];
        pRow1El.querySelectorAll("[data-deploy-lane]").forEach((s) => s.classList.remove("drag-over"));
        if (touch) {
          const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
          const slotBtn = targetEl?.closest?.("[data-deploy-lane]");
          if (slotBtn) {
            deployHandCardToLane(idx, Number(slotBtn.dataset.deployLane));
            return;
          }
        }
        this.draggedHandIdx = null;
      });

      btn.addEventListener("click", (e) => {
        if (e.target.closest("[data-zoom-trigger]")) return;
        if (btn.dataset.longPressFired === "1") {
          btn.dataset.longPressFired = "0";
          return;
        }
        if (card) this.inspectDuelCard(card);
        const firstEmpty = eng.player.row1.findIndex((s) => s === null);
        if (firstEmpty < 0) {
          SFX.alert();
          this.showToast("Hàng 1 đã đủ 3 lá", "Hãy bấm Giao Chiến Chiều Dọc hoặc thu hồi 1 lá vừa đặt để đổi làn!");
          return;
        }
        // Second click on already-selected card auto-deploys into first open Row 1 lane;
        // First click highlights open lanes + shows Lane Forecast so player can choose exact lane!
        if (eng.selectedHandIdx === idx) {
          deployHandCardToLane(idx, firstEmpty);
        } else {
          SFX.click();
          eng.selectedHandIdx = idx;
          this.renderDuelUI();
        }
      });
    });

    // Attach hover/click card inspection, Zoom Modal triggers & Long-Press (420ms) Zoom across Board, Hand & Row 2
    const battleViewEl = document.getElementById("duel-battle-view");
    const resolveDuelZoomCtx = (host) => {
      const sideKey = host.dataset.inspectSide;
      const zone = host.dataset.inspectZone;
      const idx = Number(host.dataset.inspectIdx);
      const card = eng[sideKey]?.[zone]?.[idx];
      if (!card) return null;
      const oppSide = sideKey === "player" ? "enemy" : "player";
      const evalCR = zone === "row1"
        ? eng.evalCardCombatCR(card, eng[oppSide]?.row1?.[idx], sideKey, { laneIdx: idx })
        : null;
      return { card, ctx: { source: "duel", side: sideKey, zone, idx, evalCR } };
    };

    document.querySelectorAll("#duel-battle-view [data-inspect-zone]").forEach((el) => {
      const resolveSubject = () => {
        const resolved = resolveDuelZoomCtx(el);
        if (resolved?.card) this.inspectDuelCard(resolved.card, resolved.ctx.evalCR);
      };
      el.addEventListener("pointerenter", resolveSubject);
      if (el.dataset.inspectZone !== "hand") el.addEventListener("click", resolveSubject);

      // Long-press (~420ms) on any card in the duel arena opens full Card Zoom Modal
      let pressTimer = null;
      let startX = 0;
      let startY = 0;
      const clearPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };
      el.addEventListener("pointerdown", (e) => {
        if (e.target.closest("[data-zoom-trigger]")) return;
        startX = e.clientX;
        startY = e.clientY;
        clearPress();
        pressTimer = setTimeout(() => {
          pressTimer = null;
          const resolved = resolveDuelZoomCtx(el);
          if (resolved?.card) {
            el.dataset.longPressFired = "1";
            SFX.click();
            this.openCardZoomModal(resolved.card, resolved.ctx);
          }
        }, 420);
      });
      el.addEventListener("pointermove", (e) => {
        if (pressTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 12) {
          clearPress();
        }
      });
      el.addEventListener("pointerup", clearPress);
      el.addEventListener("pointercancel", clearPress);
      el.addEventListener("pointerleave", clearPress);
    });

    this.bindZoomTriggers(battleViewEl, resolveDuelZoomCtx);

    if (hasSelectedHand) this.inspectDuelCard(hasSelectedHand);
    else if (!this.inspectedDuelCard) this.inspectDuelCard(pLeader, pRow3Eval);
  }

  showDuelOutcome() {
    const eng = this.duelEngine;
    const won = eng.winner === "player";
    won ? SFX.victory() : SFX.alert();

    const isGauntlet = this.duelContext.kind === "gauntlet";
    const isDraft = this.duelContext.kind === "draft";
    const floor = Number(this.duelContext.floor || 1);
    const isBossFloor = isGauntlet && floor % 5 === 0;
    const creditReward = isGauntlet ? (600 + floor * 150 + (isBossFloor ? 600 : 0)) : (isDraft ? 900 : 600);
    let spoil = null;
    let draftOutcome = null;
    if (isDraft) {
      draftOutcome = this.game.recordDraftMatchResult(won);
    }
    if (won) {
      this.game.recordBattleWin();
      this.game.addRes(this.game.playerFaction, "credits", creditReward);
      this.game.addRes(this.game.playerFaction, "influence", isBossFloor ? 50 : 25);
      // Void Tower guarantees a random card or Gene Shards drop (100%), skirmish has 48% card drop + guaranteed dust
      spoil = this.game.grantBattleSpoil(eng.enemy.leader.id, isGauntlet || isDraft ? 1.0 : 0.48);
      if (isGauntlet) {
        this.game.recordGauntletFloor(floor);
        const fBadge = document.getElementById("gauntlet-floor-badge");
        if (fBadge) {
          fBadge.textContent = `🗼 Đã vượt Tầng ${floor} • Kỷ lục: ${this.game.stats?.gauntletMax || floor}`;
        }
      }
      this.refreshTopResources();
      this.checkAndToastAchievements();
    } else if (isDraft) {
      this.refreshTopResources();
    }

    const reasonMap = {
      capture_3: won ? "Bắt đủ 3/3 lá bài địch vào Hàng 2!" : "Để đối phương bắt đủ 3/3 lá vào Hàng 2!",
      leader_breach: won ? "Đột kích đánh bại Thủ lĩnh Hàng 3 khi Hàng 1 địch trống!" : "Thủ lĩnh Hàng 3 của bạn bị Tổng CR Hàng 1 địch khuất phục!",
      tiebreak: "Phân định thắng bại cuối trận!"
    };

    const spoilMsg = won && spoil
      ? (spoil.card
        ? ` • 🎁 Thưởng Thẻ: ${spoil.card.name} (+${spoil.dust} Mảnh Gen)!`
        : ` • ⚒️ +${spoil.dust} Mảnh Gen!`)
      : "";
    const draftNote = draftOutcome
      ? (draftOutcome.runEnded && draftOutcome.grandPrize
        ? ` • 🎲 KẾT THÚC DRAFT (${draftOutcome.grandPrize.wins} Thắng - ${draftOutcome.grandPrize.losses} Thua): Thưởng tổng +${draftOutcome.grandPrize.credits.toLocaleString()} Credits & +${draftOutcome.grandPrize.dust} Mảnh Gen!`
        : ` • 🎲 Tiến độ Draft: ${draftOutcome.draftState?.wins || 0}/5 Thắng • ${draftOutcome.draftState?.losses || 0}/2 Thua`)
      : "";

    const modal = document.getElementById("duel-victory-modal");
    document.getElementById("victory-title").textContent = won
      ? (isBossFloor ? `👑 ĐẠI THẮNG BOSS TẦNG ${floor}!` : (isDraft ? "🎲 CHIẾN THẮNG ĐẤU TRƯỜNG DRAFT!" : "🏆 CHIẾN THẮNG VÁN BÀI!"))
      : "💀 THẤT BẠI!";
    document.getElementById("victory-title").style.color = won ? "var(--gold)" : "var(--danger)";
    document.getElementById("victory-desc").textContent = won
      ? `${eng.player.leader.name} thắng ${eng.enemy.leader.name} (${reasonMap[eng.winReason] || ""}) (+${creditReward} Credits, +${isBossFloor ? 50 : 25} Ảnh hưởng${spoilMsg}${draftNote})`
      : `${eng.enemy.leader.name} thắng trận (${reasonMap[eng.winReason] || ""}).${draftNote} Hãy tận dụng Năng lượng Gen ⚡, Gene Surge, Chỉ Thị Chiến Thuật hoặc Cường Hóa ★ thẻ bài!`;

    document.getElementById("btn-victory-story").classList.toggle("hidden", !this.pendingStoryBattle);
    document.getElementById("btn-victory-conquer").classList.toggle("hidden", !(won && this.pendingInvasionSectorId));
    document.getElementById("btn-victory-next-floor").classList.toggle("hidden", !(won && this.duelContext.kind === "gauntlet"));

    // Offer Faction-Pure Card Draft reward on Gauntlet win & unlock card into Collection
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
          const uRes = this.game.unlockCard(cid, 1);
          const addRes = this.game.addCardToActiveDeck(cid);
          this.game.addRes(this.game.playerFaction, "credits", 500);
          this.refreshTopResources();
          const note = uRes.overflowDust > 0
            ? `Đã sở hữu tối đa → Quy đổi +${uRes.overflowDust} Mảnh Gen (+500 Cr)!`
            : (addRes.ok ? `Đã mở khóa thẻ & thêm vào ${this.game.getActiveDeck().name} (+500 Cr).` : "Đã mở khóa vào Kho Thẻ (+500 Cr).");
          this.showToast("🎁 Đã nhận thưởng Tháp!", note);
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
    const deckViewEl = document.getElementById("duel-deck-view");
    const prevPoolScroll = document.getElementById("deck-pool-grid")?.scrollTop || 0;
    const prevViewScroll = deckViewEl?.scrollTop || 0;
    const decks = this.game.ensureDecksInitialized() || this.game.decks || [];
    const activeDeck = this.game.getActiveDeck();
    const hybrids = this.game.hybrids || [];
    const lead = CHAR_BY_ID[activeDeck.leaderId] || this.game.getProtagonist();
    const fac = lead.fac || this.game.playerFaction;
    const facName = this.game.facName(fac);

    // Sync Deck Selector & Leader Selector
    const deckSel = document.getElementById("deck-select");
    if (deckSel) {
      deckSel.innerHTML = decks.map((d) => {
        const dFac = FACTIONS[CHAR_BY_ID[d.leaderId]?.fac]?.short || "?";
        return `<option value="${ESC(d.id)}">${ESC(d.name)} (${ESC(dFac)} • ${d.cards.length}/16)</option>`;
      }).join("");
      deckSel.value = activeDeck.id;
    }

    const leadSel = document.getElementById("deck-leader-select");
    if (leadSel) {
      const sortedChars = [...CHARACTERS].sort((a, b) => {
        const oa = this.game.getOwnedCount(a.id) > 0 ? 1 : 0;
        const ob = this.game.getOwnedCount(b.id) > 0 ? 1 : 0;
        if (oa !== ob) return ob - oa;
        return b.cr - a.cr;
      });
      leadSel.innerHTML = sortedChars.map((c) => {
        const owned = this.game.getOwnedCount(c.id) > 0;
        const fShort = FACTIONS[c.fac]?.short || c.fac;
        return `<option value="${ESC(c.id)}" ${owned ? "" : "disabled"}>${owned ? "" : "🔒 "}${ESC(c.name)} (${ESC(fShort)} • CR ${c.cr})${owned ? "" : " — Mua ở Chợ"}</option>`;
      }).join("");
      leadSel.value = lead.id;
    }

    const delBtn = document.getElementById("btn-deck-delete");
    if (delBtn) delBtn.disabled = decks.length <= 1;

    const zoomBtn = document.getElementById("btn-deck-zoom-mode");
    if (zoomBtn) {
      zoomBtn.classList.toggle("active", this.deckZoomMode);
      zoomBtn.textContent = this.deckZoomMode ? "👁️ Soi Thẻ: BẬT (Chạm để Zoom)" : "👁️ Soi Thẻ: TẮT";
    }

    // Enforce Ownership & Faction Leader Lock on Active Deck
    activeDeck.cards = validateDeckForLeader(activeDeck.cards, lead.id, hybrids, this.game.collection);
    this.game.syncActiveDeckRef();
    const deck = activeDeck.cards;

    document.getElementById("deck-count-badge").textContent = deck.length;
    const countTextEl = document.getElementById("deck-active-count-text");
    if (countTextEl) countTextEl.textContent = deck.length;

    const ruleBanner = document.getElementById("deck-faction-rule");
    if (ruleBanner) {
      const ownCap = this.game.getFactionOwnedCapacity(fac);
      ruleBanner.innerHTML = `🔒 <strong>Bộ Bài "${ESC(activeDeck.name)}" • Luật Phe Phái &amp; Sở Hữu:</strong> Thủ lĩnh <strong>${ESC(lead.name)}</strong> (CR ${lead.cr}) trấn thủ <strong>Hàng 3</strong>. Bộ bài tối đa 16 lá thuộc phe <strong style="color:var(--gold);">${ESC(facName)}</strong> từ Kho Thẻ (Đang mở: ${ownCap} slot khả dụng • ⚒️ Mảnh Gen: ${this.game.cardDust || 0}). Bấm <strong>🔍</strong> trên bất kỳ thẻ nào để Zoom đọc full H1/H2/Lore &amp; Cường Hóa ★!`;
    }

    // v13.0: Live TCG Mana Curve (1⚡-4⚡), Gender Ratio, Avg CR & Keyword Breakdown
    const analyticsEl = document.getElementById("deck-analytics-bar");
    if (analyticsEl) {
      const resolvedDeck = deck.map((cid) => resolveCard(cid, hybrids)).filter(Boolean);
      const costCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
      let maleCount = 0;
      let femaleCount = 0;
      let totalCR = 0;
      let totalStars = this.game.getCardStarLevel(lead.id);
      const kwCounts = { charge: 0, shield: 0, draw: 0, pierce: 0, recover: 0 };
      resolvedDeck.forEach((c) => {
        const cost = Math.max(1, Math.min(4, Number(c.cost || getCardEnergyCost(c.cr, c.isToken))));
        costCounts[cost] = (costCounts[cost] || 0) + 1;
        if (c.gender === "Male") maleCount++;
        else femaleCount++;
        const st = this.game.getCardStarLevel(c.id);
        totalStars += st;
        totalCR += (c.cr || 100) + this.game.getCardStarBonusCR(c.cr, st);
        (c.h1Keywords || []).forEach((k) => {
          if (kwCounts[k] !== undefined) kwCounts[k]++;
        });
      });
      const avgCR = resolvedDeck.length ? Math.round(totalCR / resolvedDeck.length) : 0;
      const maxBar = Math.max(1, costCounts[1], costCounts[2], costCounts[3], costCounts[4]);
      analyticsEl.innerHTML = `
        <div class="mana-curve-group">
          <span class="badge" style="color:var(--gold);">📊 Biểu Đồ ⚡Cost:</span>
          ${[1, 2, 3, 4].map((cost) => {
            const cnt = costCounts[cost] || 0;
            const pct = Math.round((cnt / maxBar) * 100);
            return `
              <div class="mana-curve-col" title="Số thẻ ${cost}⚡: ${cnt} lá">
                <div class="mana-bar-wrap"><div class="mana-bar-fill" style="height:${pct}%;"></div></div>
                <span>${cost}⚡: <strong>${cnt}</strong></span>
              </div>
            `;
          }).join("")}
        </div>
        <div class="deck-stat-pills">
          <span class="badge" style="color:#60a5fa;">♂ Nam: ${maleCount}</span>
          <span class="badge" style="color:#f472b6;">♀ Nữ: ${femaleCount}</span>
          <span class="badge" style="color:#fde047;">⚔️ CR TB: ${avgCR}</span>
          <span class="badge" style="color:#c084fc;">🌟 Tổng ★: ${totalStars}</span>
          <span class="badge">⚡Xung: ${kwCounts.charge} • 🛡️Khiên: ${kwCounts.shield} • 🗡️Xuyên: ${kwCounts.pierce} • 🃏Rút: ${kwCounts.draw} • 💚Hồi: ${kwCounts.recover}</span>
        </div>
      `;
    }

    const activeEl = document.getElementById("deck-active-list");
    activeEl.innerHTML = deck.length
      ? deck.map((cid, idx) => {
          const c = resolveCard(cid, hybrids);
          if (!c) return "";
          const gMark = c.gender === "Male" ? "♂" : "♀";
          return `
            <div class="deck-chip ${c.isHybrid ? "hybrid" : ""}" data-zoom-host="1" data-zoom-card="${ESC(cid)}">
              <button type="button" class="chip-main" data-remove-idx="${idx}" data-cid="${ESC(cid)}" title="${this.deckZoomMode ? "Chạm để phóng to đọc chi tiết" : "Bấm để gỡ khỏi Bộ Bài"}">
                ${gMark} [CR ${c.cr}] ${ESC(c.name)} ${this.deckZoomMode ? "" : "✕"}
              </button>
              <button type="button" class="chip-zoom-btn" data-zoom-trigger="1" title="Phóng to đọc toàn bộ thông số &amp; hiệu ứng">🔍</button>
            </div>
          `;
        }).join("")
      : `<span class="muted" style="font-size:12px;">Chưa có thẻ trong bộ bài — bấm vào thẻ đã sở hữu bên dưới hoặc bấm ✨ Tự Xếp Đội Hình Phe!</span>`;

    activeEl.querySelectorAll("[data-remove-idx]").forEach((b) => {
      b.addEventListener("click", (e) => {
        if (e.target.closest("[data-zoom-trigger]")) return;
        const cid = b.dataset.cid;
        const card = resolveCard(cid, hybrids);
        if (this.deckZoomMode && card) {
          SFX.click();
          this.openCardZoomModal(card, { source: "deck" });
          return;
        }
        SFX.click();
        this.game.removeCardFromActiveDeck(Number(b.dataset.removeIdx));
        this.renderDeckBuilder();
      });
    });

    this.bindZoomTriggers(activeEl, (host) => ({
      card: resolveCard(host.dataset.zoomCard, hybrids),
      ctx: { source: "deck" }
    }));

    const q = (document.getElementById("deck-search-input")?.value || "").trim().toLowerCase();
    const df = this.deckFilter || "all";
    const factionPool = getFactionCardPool(fac, hybrids).filter((c) => {
      if (c.id === lead.id) return false;
      const owned = this.game.getOwnedCount(c.id);
      if (df === "male" && c.gender !== "Male") return false;
      if (df === "female" && c.gender !== "Female") return false;
      if (df === "cond" && !(c.row1Effect?.condType || c.row2Effect?.symbiosisR2Boost || c.row2Effect?.doubleIfTokenBred || c.row2Effect?.omniWomb || c.row2Effect?.tier === "tamarite")) return false;
      if (df === "owned" && owned <= 0) return false;
      if (df === "unowned" && owned > 0) return false;
      if (!q) return true;
      return `${c.name} ${c.species || ""} ${c.row1Effect?.desc || ""} ${c.row2Effect?.desc || ""}`.toLowerCase().includes(q);
    });

    const poolEl = document.getElementById("deck-pool-grid");
    poolEl.innerHTML = factionPool.length
      ? factionPool.map((c) => {
          const owned = this.game.getOwnedCount(c.id);
          const maxCap = this.game.getMaxCopies(c);
          const inDeck = deck.filter((id) => id === c.id).length;
          const isLocked = owned <= 0;
          const ownText = isLocked
            ? `🔒 Mua ${getCardPriceInfo(c).credits.toLocaleString()} Cr`
            : `✓ ${inDeck}/${owned}${maxCap > 1 ? ` (Tối đa ${maxCap})` : ""}`;
          return this.renderTCGCardHTML(c, {
            playable: !isLocked && inDeck < owned && deck.length < 16,
            locked: isLocked,
            ownText,
            lazy: true,
            condMet: Boolean(c.row1Effect?.condType),
            style: "width:auto;min-width:0;",
            zoomAttrs: `data-zoom-host="1" data-zoom-card="${ESC(c.id)}"`,
            attrs: `data-add-card="${ESC(c.id)}"`
          });
        }).join("")
      : `<div class="muted" style="grid-column:1 / -1;padding:16px;">Không có lá nào khớp bộ lọc hiện tại.</div>`;

    poolEl.querySelectorAll("[data-add-card]").forEach((b) => {
      b.addEventListener("click", (e) => {
        if (e.target.closest("[data-zoom-trigger]")) return;
        const cid = b.dataset.addCard;
        const card = resolveCard(cid, hybrids);
        if (this.deckZoomMode && card) {
          SFX.click();
          this.openCardZoomModal(card, { source: "deck" });
          return;
        }
        const owned = this.game.getOwnedCount(cid);
        if (owned <= 0 && card) {
          SFX.click();
          this.openCardZoomModal(card, { source: "deck" });
          this.showToast("🔒 Thẻ chưa mở khóa", `Bạn có thể Mua / Chế Tạo ${card.name} ngay trong cửa sổ Zoom hoặc tab Chợ!`);
          return;
        }
        const r = this.game.addCardToActiveDeck(cid);
        if (r.ok) {
          SFX.cardPlay();
          this.renderDeckBuilder();
        } else {
          SFX.alert();
          this.showToast("Không thể thêm thẻ", r.msg);
        }
      });
    });

    this.bindZoomTriggers(poolEl, (host) => ({
      card: resolveCard(host.dataset.zoomCard, hybrids),
      ctx: { source: "deck" }
    }));
    if (prevPoolScroll > 0) poolEl.scrollTop = prevPoolScroll;
    if (deckViewEl && prevViewScroll > 0) deckViewEl.scrollTop = prevViewScroll;
  }

  renderShopView() {
    const view = document.getElementById("duel-shop-view");
    if (!view) return;
    const prevShopScroll = view.scrollTop || 0;
    const facRes = this.game.resources[this.game.playerFaction] || { credits: 0, influence: 0, research: 0 };
    const totalOwnedKinds = CARDS.filter((c) => this.game.getOwnedCount(c.id) > 0).length;
    const totalOwnedCopies = CARDS.reduce((sum, c) => sum + this.game.getOwnedCount(c.id), 0);

    const currBar = document.getElementById("shop-currency-bar");
    if (currBar) {
      currBar.innerHTML = `
        <span class="shop-curr-pill">🪙 Credits: <strong style="color:var(--gold);">${(facRes.credits || 0).toLocaleString()}</strong></span>
        <span class="shop-curr-pill">🤝 Ảnh Hưởng: <strong style="color:#f472b6;">${facRes.influence || 0}</strong></span>
        <span class="shop-curr-pill">🔬 Nghiên Cứu: <strong style="color:#6ee7b7;">${facRes.research || 0}</strong></span>
        <span class="shop-curr-pill">⚒️ Mảnh Gen: <strong style="color:#c084fc;">${this.game.cardDust || 0}</strong></span>
        <span class="shop-curr-pill">🃏 Bộ Sưu Tập: <strong>${totalOwnedKinds}/${CARDS.length} mẫu (${totalOwnedCopies} lá)</strong></span>
      `;
    }

    const activeFac = CHAR_BY_ID[this.game.getActiveDeck()?.leaderId]?.fac || this.game.playerFaction;
    const prefFac = this.shopFaction !== "all" ? this.shopFaction : activeFac;
    const packsGrid = document.getElementById("shop-packs-grid");
    if (packsGrid) {
      packsGrid.innerHTML = CARD_PACKS.map((p) => {
        const costs = [];
        if (p.costCredits) costs.push(`🪙 ${p.costCredits.toLocaleString()} Cr`);
        if (p.costInfluence) costs.push(`🤝 ${p.costInfluence} Ảnh hưởng`);
        if (p.costResearch) costs.push(`🔬 ${p.costResearch} Nghiên cứu`);
        const facHint = p.id === "faction_pack" ? ` • Ưu tiên phe ${this.game.facName(prefFac)}` : "";
        return `
          <div class="shop-pack-card">
            <div class="pack-head">
              ${p.icon ? `<span class="pack-icon">${ESC(p.icon)}</span>` : ""}
              <div>
                <div class="pack-title">${ESC(p.name)}</div>
                <div class="pack-sub">${p.count} lá ngẫu nhiên${ESC(facHint)}</div>
              </div>
            </div>
            <div class="pack-desc">${ESC(p.desc)}</div>
            <div class="pack-footer">
              <span class="pack-cost">${costs.join(" • ")}</span>
              <button type="button" class="btn-primary btn-compact" data-open-pack="${ESC(p.id)}">📦 Mở Gói</button>
            </div>
          </div>
        `;
      }).join("");

      packsGrid.querySelectorAll("[data-open-pack]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const r = this.game.openCardPack(btn.dataset.openPack, prefFac);
          if (!r.ok) {
            SFX.alert();
            this.showToast("Chưa đủ tài nguyên", r.msg);
            return;
          }
          SFX.breed();
          this.refreshTopResources();
          this.checkAndToastAchievements();
          const resBox = document.getElementById("shop-pack-result");
          if (resBox) {
            resBox.classList.remove("hidden");
            resBox.innerHTML = `
              <div class="pack-result-head">
                <strong>🎉 Khui Thành Công: ${ESC(r.pack.name)}</strong>
                ${r.totalDustGained > 0 ? `<span class="badge" style="color:#c084fc;">♻️ Thẻ trùng → +${r.totalDustGained} Mảnh Gen</span>` : `<span class="badge" style="color:#4ade80;">✓ Tất cả đã vào Kho Thẻ!</span>`}
              </div>
              <div class="pack-rewards-row">
                ${r.rewards.map((item) => this.renderTCGCardHTML(item.card, {
                  playable: true,
                  ownText: item.overflowDust > 0 ? `♻️ +${item.overflowDust} Mảnh` : (item.isNew ? "✨ MỚI!" : `✓ x${item.ownedAfter}`),
                  condMet: Boolean(item.card.row1Effect?.condType),
                  style: "width:auto;min-width:0;",
                  zoomAttrs: `data-zoom-host="1" data-zoom-card="${ESC(item.card.id)}"`,
                  attrs: `data-pack-pull="${ESC(item.card.id)}"`
                })).join("")}
              </div>
            `;
            this.bindZoomTriggers(resBox, (host) => ({
              card: resolveCard(host.dataset.zoomCard, this.game.hybrids),
              ctx: { source: "shop" }
            }));
            resBox.querySelectorAll("[data-pack-pull]").forEach((cardBtn) => {
              cardBtn.addEventListener("click", () => {
                SFX.click();
                this.openCardZoomModal(resolveCard(cardBtn.dataset.packPull, this.game.hybrids), { source: "shop" });
              });
            });
          }
          this.renderShopView();
        });
      });
    }

    const sf = this.shopFilter || "all";
    const sFac = this.shopFaction || "all";
    const q = (document.getElementById("shop-search-input")?.value || "").trim().toLowerCase();
    const list = CARDS.filter((c) => {
      if (sFac !== "all" && c.fac !== sFac) return false;
      const owned = this.game.getOwnedCount(c.id);
      const maxCap = this.game.getMaxCopies(c);
      if (sf === "unowned" && owned >= maxCap) return false;
      if (sf === "owned" && owned <= 0) return false;
      if (sf === "cond" && !(c.row1Effect?.condType || c.row2Effect?.symbiosisR2Boost || c.row2Effect?.doubleIfTokenBred || c.row2Effect?.omniWomb || c.row2Effect?.tier === "tamarite")) return false;
      if (sf === "legend" && !c.unique && (c.cr || 0) < 650) return false;
      if (!q) return true;
      return `${c.name} ${c.species || ""} ${FACTIONS[c.fac]?.name || ""} ${c.row1Effect?.desc || ""} ${c.row2Effect?.desc || ""}`.toLowerCase().includes(q);
    }).sort((a, b) => (b.cr || 0) - (a.cr || 0));

    const cardsGrid = document.getElementById("shop-cards-grid");
    if (!cardsGrid) return;
    cardsGrid.innerHTML = list.length
      ? list.map((c) => {
          const owned = this.game.getOwnedCount(c.id);
          const maxCap = this.game.getMaxCopies(c);
          const price = getCardPriceInfo(c);
          const facCol = FACTIONS[c.fac]?.color || "#38bdf8";
          const facShort = FACTIONS[c.fac]?.short || c.fac;
          const isM = c.gender === "Male";
          return `
            <div class="shop-card-tile ${this.getCardRarityClass(c)} ${owned === 0 ? "is-unowned" : ""}" style="--card-accent:${facCol};" data-zoom-host="1" data-zoom-card="${ESC(c.id)}">
              <div class="shop-tile-top">
                <div class="shop-tile-thumb" data-zoom-trigger="1" title="Bấm để Zoom Đọc Đủ Thông Số">
                  <img src="${getCardPortrait(c)}" alt="${ESC(c.name)}" loading="lazy" />
                  <span class="card-cr-gem">${c.cr}</span>
                </div>
                <div class="shop-tile-meta">
                  <div class="shop-tile-name">${ESC(c.name)} <span class="gender-pill ${isM ? "male" : "female"}">${isM ? "♂" : "♀"}</span></div>
                  <div class="shop-tile-sub" style="color:${facCol};">${ESC(c.species)} • ${ESC(facShort)} • ${c.unique ? "★ Độc Nhất" : "🛡️ Dự Bị"}</div>
                  <div class="shop-tile-eff">⚔️ ${ESC(c.row1Effect?.tag || "Trực chiến")} • 🧬 ${ESC(c.row2Effect?.tag || `+${c.row2Effect?.crAura || 60} CR`)}</div>
                  <div class="shop-tile-own ${owned >= maxCap ? "full" : ""}">${owned > 0 ? `✓ Sở hữu ${owned}/${maxCap}` : "🔒 Chưa sở hữu"}</div>
                </div>
              </div>
              <div class="shop-tile-actions">
                <button type="button" class="btn-glass btn-compact" data-zoom-trigger="1">🔍 Đọc Đủ</button>
                <button type="button" class="btn-gold btn-compact" data-shop-buy="${ESC(c.id)}" ${owned >= maxCap ? "disabled" : ""}>🪙 ${price.credits.toLocaleString()}</button>
                <button type="button" class="btn-accent btn-compact" data-shop-craft="${ESC(c.id)}" ${owned >= maxCap ? "disabled" : ""}>⚒️ ${price.dust}</button>
                ${owned > 0 && c.id !== this.game.protagonistId ? `<button type="button" class="btn-glass btn-compact" data-shop-dismantle="${ESC(c.id)}" title="Phân giải 1 bản lấy Mảnh Gen">♻️ +${price.dustYield}</button>` : ""}
              </div>
            </div>
          `;
        }).join("")
      : `<div class="muted" style="grid-column:1 / -1;padding:16px;">Không tìm thấy thẻ nào trong Chợ theo bộ lọc hiện tại.</div>`;

    this.bindZoomTriggers(cardsGrid, (host) => ({
      card: resolveCard(host.dataset.zoomCard, this.game.hybrids),
      ctx: { source: "shop" }
    }));

    cardsGrid.querySelectorAll("[data-shop-buy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = this.game.buyCardWithCredits(btn.dataset.shopBuy);
        if (r.ok) {
          SFX.victory();
          this.refreshTopResources();
          this.showToast("🪙 Mua Thẻ Thành Công!", `${r.card.name} (${r.count}/${this.game.getMaxCopies(r.card)})`);
          this.renderShopView();
        } else {
          SFX.alert();
          this.showToast("Chưa thể mua", r.msg);
        }
      });
    });

    cardsGrid.querySelectorAll("[data-shop-craft]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = this.game.craftCardWithDust(btn.dataset.shopCraft);
        if (r.ok) {
          SFX.breed();
          this.refreshTopResources();
          this.showToast("⚒️ Chế Tạo Thành Công!", `${r.card.name} (${r.count}/${this.game.getMaxCopies(r.card)})`);
          this.renderShopView();
        } else {
          SFX.alert();
          this.showToast("Chưa đủ Mảnh Gen", r.msg);
        }
      });
    });

    cardsGrid.querySelectorAll("[data-shop-dismantle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = this.game.dismantleCard(btn.dataset.shopDismantle);
        if (r.ok) {
          SFX.click();
          this.refreshTopResources();
          this.showToast("♻️ Đã Phân Giải Thẻ", `+${r.dustGained} Mảnh Gen (Còn ${r.remaining} bản)`);
          this.renderShopView();
        } else {
          SFX.alert();
          this.showToast("Không thể phân giải", r.msg);
        }
      });
    });
    if (prevShopScroll > 0) view.scrollTop = prevShopScroll;
  }

  renderDraftView() {
    const view = document.getElementById("duel-draft-view");
    if (!view) return;
    const ds = this.game.draftState || { active: false, phase: "idle", leaderId: null, cards: [], currentChoices: [], wins: 0, losses: 0 };
    const hybrids = this.game.hybrids || [];
    const panel = document.getElementById("draft-arena-panel");

    if (panel) {
      if (!ds.active || ds.phase === "idle") {
        panel.innerHTML = `
          <div class="draft-hero-banner">
            <div>
              <h3 style="margin:0 0 4px 0; color:var(--gold);">🎲 Đấu Trường Tuyển Chọn (Draft Arena 3-Chọn-1 Liên Phe Phái)</h3>
              <p class="muted" style="margin:0; font-size:12px;">
                Phá vỡ giới hạn phe phái! Chọn 1 trong 3 Thủ lĩnh Hàng 3, sau đó qua 8 vòng chọn thẻ (mỗi lượt nhận 2 bản sao = 16 lá từ mọi chủng tộc).
                Chinh phục chuỗi <strong>5 Trận Thắng</strong> (tối đa 2 Thua) để nhận thưởng lớn Credits &amp; Mảnh Gen!
              </p>
            </div>
            <button type="button" class="btn-gold" id="btn-start-new-draft">🎲 Bắt Đầu Lượt Draft Mới (Miễn Phí)</button>
          </div>
        `;
      } else if (ds.phase === "leader_pick" || ds.phase === "card_pick") {
        const isLeaderPick = ds.phase === "leader_pick";
        const roundNum = Math.floor((ds.cards?.length || 0) / 2) + 1;
        const choices = (ds.currentChoices || []).map((cid) => resolveCard(cid, hybrids)).filter(Boolean);
        const leadCard = ds.leaderId ? resolveCard(ds.leaderId, hybrids) : null;
        panel.innerHTML = `
          <div class="draft-hero-banner">
            <div>
              <h3 style="margin:0 0 4px 0; color:var(--primary);">
                ${isLeaderPick ? "👑 Bước 1/9: Chọn 1 trong 3 Thủ Lĩnh Hàng 3" : `🃏 Bước ${roundNum + 1}/9: Chọn 1 trong 3 Thẻ Bài (+2 bản vào Deck • Đã có ${ds.cards.length}/16 lá)`}
              </h3>
              <div class="muted" style="font-size:11.5px;">
                ${leadCard ? `Thủ lĩnh Draft: <strong style="color:var(--gold);">${ESC(leadCard.name)} (CR ${leadCard.cr})</strong> • Chế độ Liên Phe Phái (Dùng được mọi thẻ!)` : "Hãy chọn Thủ lĩnh dẫn dắt đội hình Draft của bạn."}
              </div>
            </div>
            <button type="button" class="btn-glass btn-compact" id="btn-reset-draft">↺ Chọn Lại Từ Đầu</button>
          </div>
          <div class="draft-choices-grid">
            ${choices.map((c) => this.renderTCGCardHTML(c, {
              playable: true,
              ownText: isLeaderPick ? "👑 Chọn Thủ Lĩnh" : "+2 Bản Vào Draft",
              style: "width:auto;min-width:0;",
              zoomAttrs: `data-zoom-host="1" data-zoom-card="${ESC(c.id)}"`,
              attrs: `data-pick-draft="${ESC(c.id)}"`
            })).join("")}
          </div>
        `;
      } else {
        const leadCard = resolveCard(ds.leaderId, hybrids) || CARD_BY_ID.arisia;
        const draftedCards = (ds.cards || []).map((cid) => resolveCard(cid, hybrids)).filter(Boolean);
        panel.innerHTML = `
          <div class="draft-hero-banner">
            <div>
              <h3 style="margin:0 0 4px 0; color:#4ade80;">⚔️ Bộ Bài Draft Đã Sẵn Sàng (16/16 Lá Liên Phe Phái)</h3>
              <div style="font-size:12px; color:#e2e8f0;">
                Thủ lĩnh: <strong style="color:var(--gold);">${ESC(leadCard.name)} (CR ${leadCard.cr})</strong> •
                Thành tích hiện tại: <strong style="color:#4ade80;">${ds.wins || 0}/5 Thắng</strong> — <strong style="color:#fb7185;">${ds.losses || 0}/2 Thua</strong>
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn-gold" id="btn-play-draft-match">🔥 Khai Chiến Trận Draft Tiếp Theo</button>
              <button type="button" class="btn-glass btn-compact" id="btn-reset-draft">🗑️ Hủy &amp; Draft Mới</button>
            </div>
          </div>
          <div class="deck-active-strip" style="margin-top:8px;">
            ${draftedCards.map((c) => `
              <div class="deck-chip" data-zoom-host="1" data-zoom-card="${ESC(c.id)}">
                <span class="chip-main">${c.gender === "Male" ? "♂" : "♀"} [${c.cost || getCardEnergyCost(c.cr)}⚡ • CR ${c.cr}] ${ESC(c.name)}</span>
                <button type="button" class="chip-zoom-btn" data-zoom-trigger="1">🔍</button>
              </div>
            `).join("")}
          </div>
        `;
      }

      document.getElementById("btn-start-new-draft")?.addEventListener("click", () => {
        SFX.choice();
        this.game.startNewDraftRun();
        this.renderDraftView();
      });

      document.getElementById("btn-reset-draft")?.addEventListener("click", () => {
        SFX.click();
        this.game.startNewDraftRun();
        this.renderDraftView();
      });

      panel.querySelectorAll("[data-pick-draft]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          if (e.target.closest("[data-zoom-trigger]")) return;
          const cid = btn.dataset.pickDraft;
          const res = this.game.pickDraftChoice(cid);
          if (res.ok) {
            SFX.cardPlay();
            this.renderDraftView();
            if (res.draftState.phase === "ready") {
              this.showToast("🎲 Đã Hoàn Tất 16 Lá Draft!", "Bấm '🔥 Khai Chiến Trận Draft Tiếp Theo' để bước vào bàn đấu!");
            }
          }
        });
      });

      document.getElementById("btn-play-draft-match")?.addEventListener("click", () => {
        SFX.choice();
        const round = (ds.wins || 0) + (ds.losses || 0) + 1;
        const pool = [...CHARACTERS].sort((a, b) => a.cr - b.cr);
        const oppIdx = Math.min(pool.length - 1, Math.floor((pool.length - 1) * Math.min(1, 0.25 + round * 0.14)));
        const opp = pool[oppIdx] || CHAR_BY_ID.overlord;
        this.setDuelTab("skirmish");
        this.startCardMatch({
          kind: "draft",
          playerCharId: ds.leaderId || this.game.protagonistId,
          enemyId: opp.id,
          isDraftMode: true,
          customDeckIds: ds.cards,
          difficulty: 0.95 + (ds.wins || 0) * 0.12,
          modeLabel: `🎲 Draft (${ds.wins || 0}W-${ds.losses || 0}L)`
        });
      });

      this.bindZoomTriggers(panel, (host) => ({
        card: resolveCard(host.dataset.zoomCard, hybrids),
        ctx: { source: "draft" }
      }));
    }

    const questsGrid = document.getElementById("tcg-quests-grid");
    if (questsGrid) {
      const claimed = new Set(this.game.claimedQuests || []);
      questsGrid.innerHTML = TCG_QUESTS.map((q) => {
        const prog = q.progress(this.game);
        const isClaimed = claimed.has(q.id);
        const isReady = !isClaimed && prog.cur >= prog.max;
        const pct = Math.min(100, Math.round((prog.cur / Math.max(1, prog.max)) * 100));
        return `
          <div class="tcg-quest-card ${isReady ? "ready" : ""} ${isClaimed ? "claimed" : ""}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <strong style="color:#fff; font-size:13px;">${q.icon} ${ESC(q.title)}</strong>
              <span class="badge" style="color:${isClaimed ? "#4ade80" : (isReady ? "var(--gold)" : "#94a3b8")};">
                ${isClaimed ? "✓ Đã Nhận" : `${prog.cur}/${prog.max}`}
              </span>
            </div>
            <div class="muted" style="font-size:11.5px;">${ESC(q.desc)}</div>
            <div class="quest-prog-bar"><div class="quest-prog-fill" style="width:${pct}%;"></div></div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:4px;">
              <span style="font-size:11px; color:#fde047;">🎁 +${q.rewardCredits.toLocaleString()} Cr • +${q.rewardDust} Mảnh Gen</span>
              <button type="button" class="${isReady ? "btn-gold" : "btn-glass"} btn-compact" data-claim-quest="${ESC(q.id)}" ${isReady ? "" : "disabled"}>
                ${isClaimed ? "✓ Hoàn Tất" : (isReady ? "🎁 Nhận Thưởng" : "Đang Làm")}
              </button>
            </div>
          </div>
        `;
      }).join("");

      questsGrid.querySelectorAll("[data-claim-quest]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const r = this.game.claimTCGQuest(btn.dataset.claimQuest);
          if (r.ok) {
            SFX.victory();
            this.refreshTopResources();
            this.renderDraftView();
            this.showToast(`🎁 Hoàn Thành: ${r.quest.title}!`, `Nhận +${r.quest.rewardCredits.toLocaleString()} Credits & +${r.quest.rewardDust} Mảnh Gen!`);
          } else {
            SFX.alert();
            this.showToast("Chưa thể nhận", r.msg);
          }
        });
      });
    }
  }

  // ==========================================================================
  // MODE 3: 3D GALAXY CONQUEST & SECTOR HIERARCHY
  // ==========================================================================
  setGalaxySheet(mode) {
    this.galaxySheetMode = mode;
    document.querySelectorAll("[data-gsheet]").forEach((b) => b.classList.toggle("active", b.dataset.gsheet === mode));
    document.getElementById("galaxy-left-sidebar")?.classList.toggle("mobile-sheet-active", mode === "left");
    document.getElementById("galaxy-right-sidebar")?.classList.toggle("mobile-sheet-active", mode === "right");
  }

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
        this.setGalaxySheet(btn.dataset.gsheet);
      });
    });

    document.getElementById("btn-galaxy-back-list")?.addEventListener("click", () => {
      SFX.click();
      this.setGalaxySheet("left");
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
    if (secId) this.setGalaxySheet("right");
  }

  selectBody(secId, bodyId) {
    this.selectedSectorId = secId;
    this.selectedBodyId = bodyId;
    this.engine.zoomToBody(secId, bodyId);
    this.renderSectorDetails();
    if (secId) this.setGalaxySheet("right");
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
      ? `<div style="margin-top:8px;"><strong style="font-size:11.5px;color:var(--gold);">Nhân vật đóng quân (Đối thoại / Mở Hồ Sơ):</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">` +
        garrisonChars.slice(0, 12).map(c => `
          <div style="display:inline-flex;align-items:center;gap:3px;background:rgba(15,23,42,0.75);border:1px solid var(--panel-border);border-radius:8px;padding:2px;">
            <button type="button" class="btn-glass btn-compact" data-garrison-char="${c.id}" title="Bắt đầu hội thoại VN với ${ESC(c.name)}">💬 ${ESC(c.name)}</button>
            <button type="button" class="btn-accent btn-compact" data-garrison-dossier="${c.id}" title="Mở Mini-Tab Hồ Sơ ${ESC(c.name)}">👤</button>
          </div>
        `).join("") +
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
    box.querySelectorAll("[data-garrison-dossier]").forEach((el) => {
      el.addEventListener("click", () => {
        SFX.click();
        this.openCharDossierModal(el.dataset.garrisonDossier, "overview");
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
  // MODE 4: UNIFIED 72-CHARACTER CARD ROSTER, CUTSCENES, DIPLOMACY & CODEX
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

  renderRosterGridItems() {
    const gridEl = document.getElementById("roster-grid-box");
    const countEl = document.getElementById("roster-count-badge");
    if (!gridEl) return;
    const prevScroll = gridEl.scrollTop || 0;
    const filtered = this.getFilteredRosterList();
    const totalAll = (this.game.hybrids?.length || 0) + CHARACTERS.length;

    if (countEl) {
      countEl.textContent = `Hiển thị ${filtered.length}/${totalAll} nhân vật`;
    }

    if (!filtered.length) {
      gridEl.innerHTML = `<div class="muted" style="grid-column:1 / -1;padding:24px;text-align:center;">Không có nhân vật nào khớp bộ lọc hiện tại. Hãy thử xóa từ khóa hoặc chọn "Mọi Phe".</div>`;
      return;
    }

    gridEl.innerHTML = filtered.map((c) => {
      const fc = FACTIONS[c.fac]?.color || "#38bdf8";
      const facShort = FACTIONS[c.fac]?.short || this.game.facName(c.fac);
      const act = c.id === this.inspectedRosterId ? "active" : "";
      const isProtag = c.id === this.game.protagonistId;
      const portrait = this.resolvePortrait(c.id);
      const card = resolveCard(c.id, this.game.hybrids);
      const isMale = card?.gender === "Male" || c.g === "M" || c.gender === "Male";
      const owned = this.game.getOwnedCount(c.id);
      const aff = this.game.getAffinity(c.id);
      return `
        <div class="roster-card-tile ${act}" style="--card-accent:${fc};" data-pick-roster="${ESC(c.id)}">
          <div class="roster-tile-top">
            <div class="roster-tile-avatar">
              <img src="${portrait}" alt="${ESC(c.name)}" loading="lazy" />
              <span class="roster-tile-cr">CR ${c.cr}</span>
              ${isProtag ? `<span class="roster-tile-protag" title="Nhân vật chính đang điều khiển">⭐</span>` : ""}
            </div>
            <div class="roster-tile-info">
              <div class="roster-tile-name">
                <span>${ESC(c.name)}</span>
                <span class="gender-pill ${isMale ? "male" : "female"}">${isMale ? "♂" : "♀"}</span>
              </div>
              <div class="roster-tile-fac" style="color:${fc};">${ESC(c.title || "Chiến Binh")} • ${ESC(facShort)}</div>
              <div class="roster-tile-meta">
                <span>${ESC(c.species)}</span>
                <span style="color:#f472b6;">💞 ${aff}</span>
                <span style="color:${owned > 0 ? "#4ade80" : "#94a3b8"};">${owned > 0 ? `✓ Thẻ x${owned}` : "🔒 Chưa có thẻ"}</span>
              </div>
              <div class="roster-tile-eff">
                <span>⚔️ ${ESC(card?.row1Effect?.tag || "Trực chiến")}</span>
                <span>🧬 ${ESC(card?.row2Effect?.tag || `+${card?.row2Effect?.crAura || 60} CR`)}</span>
              </div>
            </div>
          </div>
          <div class="roster-tile-actions">
            <button type="button" class="btn-primary btn-compact" data-roster-open-tab="overview" data-roster-char="${ESC(c.id)}">📋 Mở Hồ Sơ Mini-Tab</button>
            <button type="button" class="btn-glass btn-compact" data-roster-open-tab="card" data-roster-char="${ESC(c.id)}" title="Xem Thẻ Bài &amp; H1/H2">🃏 H1/H2</button>
            <button type="button" class="btn-accent btn-compact" data-roster-open-tab="interact" data-roster-char="${ESC(c.id)}" title="Tặng Quà &amp; Chat AI">🎁 Tương Tác</button>
          </div>
        </div>
      `;
    }).join("");

    gridEl.querySelectorAll("[data-pick-roster]").forEach((tile) => {
      tile.addEventListener("click", (e) => {
        const tabBtn = e.target.closest("[data-roster-open-tab]");
        const targetTab = tabBtn ? tabBtn.dataset.rosterOpenTab : "overview";
        SFX.click();
        this.openCharDossierModal(tile.dataset.pickRoster, targetTab);
      });
    });

    if (prevScroll > 0) gridEl.scrollTop = prevScroll;
  }

  renderCodexTab() {
    const body = document.getElementById("codex-main-content");
    const t = this.codexTab;

    if (t === "roster") {
      const facOptions = [`<option value="ALL">🌌 Mọi Phe Phái (72+ Nhân Vật)</option>`]
        .concat(Object.entries(FACTIONS).map(([id, f]) => `<option value="${ESC(id)}" ${this.rosterFilterFac === id ? "selected" : ""}>${ESC(f.name)}</option>`))
        .join("");

      body.innerHTML = `
        <div class="roster-Explorer-wrap">
          <div class="roster-toolbar">
            <div class="roster-toolbar-row">
              <input type="text" id="roster-filter-q" value="${ESC(this.rosterSearch || "")}" placeholder="🔍 Tìm tên, chủng tộc, phe phái, kỹ năng..." style="flex:1;min-width:190px;" />
              <select id="roster-fac-select" style="min-width:165px;">${facOptions}</select>
              <select id="roster-sort-select" style="min-width:150px;">
                <option value="cr" ${this.rosterSort === "cr" ? "selected" : ""}>⬇️ Sắp xếp: CR Cao → Thấp</option>
                <option value="aff" ${this.rosterSort === "aff" ? "selected" : ""}>💞 Sắp xếp: Độ Tin Cậy</option>
                <option value="name" ${this.rosterSort === "name" ? "selected" : ""}>🔤 Sắp xếp: Tên A → Z</option>
              </select>
            </div>
            <div class="roster-toolbar-row" style="justify-content:space-between;">
              <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
                <button type="button" class="btn-glass btn-compact ${this.rosterFilterGender === "all" ? "active" : ""}" data-rgender="all">Tất cả</button>
                <button type="button" class="btn-glass btn-compact ${this.rosterFilterGender === "female" ? "active" : ""}" data-rgender="female">♀ Nữ</button>
                <button type="button" class="btn-glass btn-compact ${this.rosterFilterGender === "male" ? "active" : ""}" data-rgender="male">♂ Nam</button>
                <span class="muted" style="margin:0 3px;">|</span>
                <button type="button" class="btn-glass btn-compact ${this.rosterFilterOwned === "all" ? "active" : ""}" data-rowned="all">Mọi Thẻ</button>
                <button type="button" class="btn-glass btn-compact ${this.rosterFilterOwned === "owned" ? "active" : ""}" data-rowned="owned">✓ Đã Sở Hữu Thẻ</button>
                <button type="button" class="btn-glass btn-compact ${this.rosterFilterOwned === "unowned" ? "active" : ""}" data-rowned="unowned">🔒 Chưa Có Thẻ</button>
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <span class="badge" id="roster-count-badge" style="color:var(--gold);">72 nhân vật</span>
                <button type="button" class="btn-gold btn-compact" id="btn-roster-open-current" title="Mở ngay Mini-Tab nhân vật đang chọn">👤 Mở Hồ Sơ: ${ESC(this.resolveActorName(this.inspectedRosterId))}</button>
              </div>
            </div>
          </div>

          <div id="roster-grid-box" class="roster-card-grid"></div>
        </div>
      `;

      this.renderRosterGridItems();

      const qInput = document.getElementById("roster-filter-q");
      qInput?.addEventListener("input", () => {
        this.rosterSearch = qInput.value;
        this.renderRosterGridItems();
      });

      const facSel = document.getElementById("roster-fac-select");
      facSel?.addEventListener("change", () => {
        SFX.click();
        this.rosterFilterFac = facSel.value;
        this.renderRosterGridItems();
      });

      const sortSel = document.getElementById("roster-sort-select");
      sortSel?.addEventListener("change", () => {
        SFX.click();
        this.rosterSort = sortSel.value;
        this.renderRosterGridItems();
      });

      body.querySelectorAll("[data-rgender]").forEach((btn) => {
        btn.addEventListener("click", () => {
          SFX.click();
          this.rosterFilterGender = btn.dataset.rgender;
          body.querySelectorAll("[data-rgender]").forEach((b) => b.classList.toggle("active", b === btn));
          this.renderRosterGridItems();
        });
      });

      body.querySelectorAll("[data-rowned]").forEach((btn) => {
        btn.addEventListener("click", () => {
          SFX.click();
          this.rosterFilterOwned = btn.dataset.rowned;
          body.querySelectorAll("[data-rowned]").forEach((b) => b.classList.toggle("active", b === btn));
          this.renderRosterGridItems();
        });
      });

      document.getElementById("btn-roster-open-current")?.addEventListener("click", () => {
        SFX.click();
        this.openCharDossierModal(this.inspectedRosterId || this.game.protagonistId || "arisia", "overview");
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
        const keyHeroes = CHARACTERS.filter((c) => c.fac === id).sort((a, b) => b.cr - a.cr).slice(0, 4);
        return `
          <div class="diplo-row" style="flex-direction:column;align-items:stretch;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
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
            ${keyHeroes.length ? `
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <span class="muted" style="font-size:11px;">Thủ lĩnh &amp; Tướng chủ lực:</span>
                ${keyHeroes.map((hc) => `
                  <button type="button" class="cd-rel-chip" data-open-dossier="${ESC(hc.id)}">
                    <img src="${this.resolvePortrait(hc.id)}" alt="${ESC(hc.name)}" loading="lazy" />
                    <span>${ESC(hc.name)} <small style="color:var(--gold);">CR ${hc.cr}</small></span>
                  </button>
                `).join("")}
              </div>
            ` : ""}
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
      body.querySelectorAll("[data-open-dossier]").forEach((btn) => {
        btn.addEventListener("click", () => {
          SFX.click();
          this.openCharDossierModal(btn.dataset.openDossier, "overview");
        });
      });
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
        SPECIES.map((sp) => {
          const reps = CHARACTERS.filter((c) => c.race === sp.id || c.species?.toLowerCase().includes(sp.name.toLowerCase())).sort((a, b) => b.cr - a.cr).slice(0, 6);
          return `
            <div class="codex-card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="color:${sp.color};font-size:14px;">${ESC(sp.name)}</strong>
                <span class="badge">Dân số: ${ESC(sp.pop)}</span>
              </div>
              <div class="muted"><strong>Thể chất:</strong> ${ESC(sp.physic)} • <strong>Công nghệ:</strong> ${ESC(sp.tech)}</div>
              <div style="font-size:12px;color:#cbd5e1;">${ESC(sp.traits)}</div>
              ${reps.length ? `
                <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">
                  ${reps.map((rc) => `
                    <button type="button" class="cd-rel-chip" data-open-dossier="${ESC(rc.id)}">
                      <img src="${this.resolvePortrait(rc.id)}" alt="${ESC(rc.name)}" loading="lazy" />
                      <span>${ESC(rc.name)}</span>
                    </button>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          `;
        }).join("")
      }</div>`;
      body.querySelectorAll("[data-open-dossier]").forEach((btn) => {
        btn.addEventListener("click", () => {
          SFX.click();
          this.openCharDossierModal(btn.dataset.openDossier, "overview");
        });
      });
      return;
    }

    if (t === "relations") {
      body.innerHTML = `<div class="codex-grid">${
        RELATIONS.map((r) => `
          <div class="codex-card">
            <strong style="color:var(--accent);font-size:14px;">🔗 ${ESC(r.type)}</strong>
            ${r.items.map((it) => {
              const mentioned = CHARACTERS.filter((c) => it.includes(c.name) || (c.name.split(" ")[0].length >= 4 && it.includes(c.name.split(" ")[0])));
              return `
                <div style="padding:5px 0;border-bottom:1px dashed rgba(148,163,184,0.14);">
                  <div class="muted">• ${ESC(it)}</div>
                  ${mentioned.length ? `
                    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px;">
                      ${mentioned.map((mc) => `
                        <button type="button" class="cd-rel-chip" data-open-dossier="${ESC(mc.id)}">
                          <img src="${this.resolvePortrait(mc.id)}" alt="${ESC(mc.name)}" loading="lazy" />
                          <span>${ESC(mc.name)}</span>
                        </button>
                      `).join("")}
                    </div>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        `).join("")
      }</div>`;
      body.querySelectorAll("[data-open-dossier]").forEach((btn) => {
        btn.addEventListener("click", () => {
          SFX.click();
          this.openCharDossierModal(btn.dataset.openDossier, "overview");
        });
      });
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
