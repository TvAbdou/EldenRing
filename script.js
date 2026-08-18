(function () {
  "use strict";

  var DATA_URL = "data/bosses.json";
  var OVERRIDES_KEY = "err_admin_overrides_v1"; // shared with /admin/admin.js

  var els = {
    codexInner: document.getElementById("codexInner"),
    chapterTag: document.getElementById("chapterTag"),
    bossNumber: document.getElementById("bossNumber"),
    bossName: document.getElementById("bossName"),
    bossImage: document.getElementById("bossImage"),
    bossZone: document.getElementById("bossZone"),
    bossDifficulty: document.getElementById("bossDifficulty"),
    bossDescription: document.getElementById("bossDescription"),
    statHp: document.getElementById("statHp"),
    statDef: document.getElementById("statDef"),
    statWeak: document.getElementById("statWeak"),
    statResist: document.getElementById("statResist"),
    statRewards: document.getElementById("statRewards"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    progressText: document.getElementById("progressText"),
    progressFill: document.getElementById("progressFill"),
    chapterVeil: document.getElementById("chapterVeil"),
    cvEyebrow: document.getElementById("cvEyebrow"),
    cvTitle: document.getElementById("cvTitle"),
    cvSub: document.getElementById("cvSub"),
    emberField: document.getElementById("emberField")
  };

  var state = { bosses: [], index: 0, busy: false };

  var STAR_PATH =
    '<svg viewBox="0 0 24 24"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg>';

  function starsHTML(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    var out = "";
    for (var i = 0; i < 5; i++) {
      out += '<span class="star ' + (i < n ? "filled" : "empty") + '">' + STAR_PATH + "</span>";
    }
    return out;
  }

  function pad2(n) {
    return String(n).length < 2 ? "0" + n : String(n);
  }

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function fetchData() {
    return fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        var overrides = loadOverrides();
        var bosses = json.bosses.map(function (b) {
          return Object.assign({}, b, overrides[b.id] || {});
        });
        bosses.sort(function (a, b) {
          return a.number - b.number;
        });
        return { chapters: json.chapters, bosses: bosses };
      });
  }

  function renderBoss(boss) {
    els.chapterTag.textContent = "Chapitre " + boss.chapterNum + " \u2014 " + boss.chapterTitle;
    els.bossNumber.textContent = pad2(boss.number);
    els.bossName.textContent = boss.name;
    els.bossImage.src = boss.image || "images/bosses/placeholder.svg";
    els.bossImage.alt = boss.name;
    els.bossImage.onerror = function () {
      els.bossImage.onerror = null;
      els.bossImage.src = "images/bosses/placeholder.svg";
    };
    els.bossZone.textContent = boss.zone || "\u2014";
    els.bossDifficulty.innerHTML = starsHTML(boss.difficulty);
    els.bossDescription.textContent = boss.description || "";
    els.statHp.textContent = boss.hp || "\u2014";
    els.statDef.textContent = boss.defense || "\u2014";
    els.statWeak.textContent = boss.weakness || "\u2014";
    els.statResist.textContent = boss.resistances || "\u2014";
    els.statRewards.textContent = boss.rewards || "\u2014";
    document.title = boss.name + " \u2014 Parcours des Boss \u2014 Elden Ring";
  }

  function updateProgress(index, total) {
    var n = index + 1;
    els.progressText.textContent = "BOSS " + pad2(n) + " / " + total;
    els.progressFill.style.width = (n / total) * 100 + "%";
  }

  function updateNavButtons() {
    els.prevBtn.disabled = state.index === 0;
    els.nextBtn.disabled = state.index === state.bosses.length - 1;
  }

  function applyBossChange(newIndex) {
    state.index = newIndex;
    var boss = state.bosses[newIndex];
    renderBoss(boss);
    updateProgress(newIndex, state.bosses.length);
    updateNavButtons();
  }

  function showChapterVeil(newBoss, applyFn) {
    els.cvEyebrow.textContent = "Chapitre " + newBoss.chapterNum;
    els.cvTitle.textContent = newBoss.chapterTitle;
    els.cvSub.textContent = newBoss.chapterSub || "";
    els.chapterVeil.classList.add("active");
    setTimeout(function () {
      applyFn();
      els.chapterVeil.classList.remove("active");
      setTimeout(function () {
        state.busy = false;
      }, 600);
    }, 1900);
  }

  function goTo(newIndex) {
    if (state.busy) return;
    newIndex = Math.max(0, Math.min(state.bosses.length - 1, newIndex));
    if (newIndex === state.index) return;

    var oldBoss = state.bosses[state.index];
    var newBoss = state.bosses[newIndex];
    var chapterChanged = oldBoss.chapterNum !== newBoss.chapterNum;

    state.busy = true;

    if (chapterChanged) {
      els.codexInner.classList.add("is-leaving");
      showChapterVeil(newBoss, function () {
        applyBossChange(newIndex);
        els.codexInner.classList.remove("is-leaving");
      });
    } else {
      els.codexInner.classList.add("is-leaving");
      setTimeout(function () {
        applyBossChange(newIndex);
        els.codexInner.classList.remove("is-leaving");
        setTimeout(function () {
          state.busy = false;
        }, 500);
      }, 380);
    }
  }

  function spawnEmbers() {
    if (!els.emberField) return;
    var count = window.innerWidth < 620 ? 8 : 14;
    for (var i = 0; i < count; i++) {
      var e = document.createElement("span");
      e.className = "ember";
      e.style.left = Math.random() * 100 + "%";
      var duration = 9 + Math.random() * 10;
      e.style.animationDuration = duration + "s";
      e.style.animationDelay = Math.random() * duration + "s";
      els.emberField.appendChild(e);
    }
  }

  function bindEvents() {
    els.prevBtn.addEventListener("click", function () {
      goTo(state.index - 1);
    });
    els.nextBtn.addEventListener("click", function () {
      goTo(state.index + 1);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") goTo(state.index + 1);
      if (e.key === "ArrowLeft") goTo(state.index - 1);
    });
  }

  function init() {
    fetchData()
      .then(function (data) {
        state.bosses = data.bosses;
        state.index = 0;
        if (!state.bosses.length) throw new Error("Aucun boss dans les donn\u00e9es");
        applyBossChange(0);
        bindEvents();
        spawnEmbers();
      })
      .catch(function (err) {
        els.bossName.textContent = "Erreur de chargement";
        els.bossDescription.textContent =
          "Impossible de charger data/bosses.json (" + err.message + "). Si vous ouvrez ce fichier directement depuis votre disque, lancez plut\u00f4t un petit serveur local (ex. \u00ab python3 -m http.server \u00bb) puis ouvrez http://localhost:8000.";
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
