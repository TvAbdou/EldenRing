(function () {
  "use strict";

  var DATA_URL = "../data/bosses.json";
  var OVERRIDES_KEY = "err_admin_overrides_v1";

  var els = {
    statusNote: document.getElementById("statusNote"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),
    resetBtn: document.getElementById("resetBtn"),
    listView: document.getElementById("listView"),
    bossTableBody: document.getElementById("bossTableBody"),
    editView: document.getElementById("editView"),
    backToListBtn: document.getElementById("backToListBtn"),
    editForm: document.getElementById("editForm"),
    saveFeedback: document.getElementById("saveFeedback"),

    f_name: document.getElementById("f_name"),
    f_number: document.getElementById("f_number"),
    f_chapter: document.getElementById("f_chapter"),
    f_zone: document.getElementById("f_zone"),
    f_difficulty: document.getElementById("f_difficulty"),
    f_description: document.getElementById("f_description"),
    f_hp: document.getElementById("f_hp"),
    f_defense: document.getElementById("f_defense"),
    f_weakness: document.getElementById("f_weakness"),
    f_resistances: document.getElementById("f_resistances"),
    f_rewards: document.getElementById("f_rewards"),
    f_extra: document.getElementById("f_extra"),
    f_imagePath: document.getElementById("f_imagePath"),

    editImagePreview: document.getElementById("editImagePreview"),
    changeImageBtn: document.getElementById("changeImageBtn"),
    imageFileInput: document.getElementById("imageFileInput")
  };

  var chapters = [];
  var baseBosses = []; 
  var bosses = []; 
  var editingId = null;
  var currentImageValue = "";

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveOverrides(obj) {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(obj));
  }

  function mergeAndSort() {
    var overrides = loadOverrides();
    bosses = baseBosses
      .map(function (b) {
        var merged = Object.assign({}, b, overrides[b.id] || {});
        merged._edited = !!overrides[b.id];
        return merged;
      })
      .sort(function (a, b) {
        return a.number - b.number;
      });
  }

  function setStatus(msg) {
    els.statusNote.innerHTML = "<strong>Statut :</strong> " + msg;
  }

  function populateChapterSelect() {
    els.f_chapter.innerHTML = chapters
      .map(function (c) {
        return '<option value="' + c.num + '">Chapitre ' + c.num + " \u2014 " + c.title + "</option>";
      })
      .join("");
  }

  function renderList() {
    els.bossTableBody.innerHTML = bosses
      .map(function (b) {
        return (
          "<tr data-id=\"" +
          b.id +
          '"><td class="col-num">' +
          String(b.number).padStart(2, "0") +
          '</td><td class="col-name">' +
          escapeHtml(b.name) +
          '</td><td class="col-chapter">' +
          escapeHtml(b.chapterTitle) +
          '</td><td class="col-zone">' +
          escapeHtml(b.zone || "") +
          "</td><td>" +
          (b._edited ? '<span class="badge-edited">modifi\u00e9</span>' : "") +
          "</td></tr>"
        );
      })
      .join("");

    Array.prototype.forEach.call(els.bossTableBody.querySelectorAll("tr"), function (tr) {
      tr.addEventListener("click", function () {
        openEditor(Number(tr.getAttribute("data-id")));
      });
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function openEditor(id) {
    var boss = bosses.find(function (b) {
      return b.id === id;
    });
    if (!boss) return;
    editingId = id;

    els.f_name.value = boss.name || "";
    els.f_number.value = boss.number;
    els.f_chapter.value = boss.chapterNum;
    els.f_zone.value = boss.zone || "";
    els.f_difficulty.value = boss.difficulty || 1;
    els.f_description.value = boss.description || "";
    els.f_hp.value = boss.hp || "";
    els.f_defense.value = boss.defense || "";
    els.f_weakness.value = boss.weakness || "";
    els.f_resistances.value = boss.resistances || "";
    els.f_rewards.value = boss.rewards || "";
    els.f_extra.value = boss.extra || "";

    currentImageValue = boss.image || "images/bosses/placeholder.svg";
    els.f_imagePath.value = currentImageValue.indexOf("data:") === 0 ? "" : currentImageValue;
    els.f_imagePath.placeholder =
      currentImageValue.indexOf("data:") === 0
        ? "(image t\u00e9l\u00e9vers\u00e9e en m\u00e9moire)"
        : "images/bosses/exemple.jpg";
    setPreview(currentImageValue);

    els.saveFeedback.classList.remove("show");
    els.listView.hidden = true;
    els.editView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setPreview(value) {
    els.editImagePreview.src = value || "../images/bosses/placeholder.svg";
  }

  function closeEditor() {
    editingId = null;
    els.editView.hidden = true;
    els.listView.hidden = false;
  }

  function chapterMeta(num) {
    return chapters.find(function (c) {
      return c.num === num;
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (editingId == null) return;

    var overrides = loadOverrides();
    var chMeta = chapterMeta(els.f_chapter.value) || {};

    overrides[editingId] = {
      id: editingId,
      name: els.f_name.value.trim(),
      number: Number(els.f_number.value) || editingId,
      chapterNum: els.f_chapter.value,
      chapterTitle: chMeta.title || "",
      chapterSub: chMeta.sub || "",
      zone: els.f_zone.value.trim(),
      difficulty: Math.max(1, Math.min(5, Number(els.f_difficulty.value) || 1)),
      description: els.f_description.value.trim(),
      hp: els.f_hp.value.trim(),
      defense: els.f_defense.value.trim(),
      weakness: els.f_weakness.value.trim(),
      resistances: els.f_resistances.value.trim(),
      rewards: els.f_rewards.value.trim(),
      extra: els.f_extra.value.trim(),
      image: currentImageValue
    };

    saveOverrides(overrides);
    mergeAndSort();
    renderList();

    els.saveFeedback.textContent = "Modifications enregistr\u00e9es localement.";
    els.saveFeedback.classList.add("show");
    setTimeout(function () {
      els.saveFeedback.classList.remove("show");
    }, 2600);
  }

  function onImagePathInput() {
    var v = els.f_imagePath.value.trim();
    if (v) {
      currentImageValue = v;
      setPreview(v);
    }
  }

  function onChangeImageClick() {
    els.imageFileInput.click();
  }

  function onImageFileSelected(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    
    // Ajout d'une gestion d'erreur au cas où la lecture échoue
    var reader = new FileReader();
    reader.onload = function () {
      currentImageValue = reader.result;
      setPreview(currentImageValue);
      els.f_imagePath.value = "";
      els.f_imagePath.placeholder = "(image t\u00e9l\u00e9vers\u00e9e en m\u00e9moire)";
    };
    reader.onerror = function() {
      alert("Erreur lors de la lecture de l'image. Veuillez r\u00e9essayer avec un autre format.");
    };
    reader.readAsDataURL(file);
  }

  function onExport() {
    var overrides = loadOverrides();
    var merged = baseBosses
      .map(function (b) {
        return Object.assign({}, b, overrides[b.id] || {});
      })
      .sort(function (a, b) {
        return a.number - b.number;
      })
      .map(function (b) {
        var copy = Object.assign({}, b);
        delete copy._edited;
        return copy;
      });

    var payload = { chapters: chapters, bosses: merged };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "bosses.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onImportFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = JSON.parse(reader.result);
        if (!imported || !Array.isArray(imported.bosses)) throw new Error("format invalide");
        var newOverrides = {};
        imported.bosses.forEach(function (b) {
          if (b && b.id != null) newOverrides[b.id] = b;
        });
        saveOverrides(newOverrides);
        mergeAndSort();
        renderList();
        setStatus("Fichier import\u00e9 avec succ\u00e8s \u2014 les modifications sont maintenant actives localement.");
      } catch (err) {
        setStatus("Erreur d'import : " + err.message);
      }
    };
    reader.readAsText(file);
    // Réinitialiser la valeur de l'input pour pouvoir importer le même fichier deux fois de suite si besoin
    e.target.value = "";
  }

  function onReset() {
    if (!confirm("Effacer toutes les modifications enregistr\u00e9es localement et revenir aux donn\u00e9es d'origine de bosses.json ?")) return;
    localStorage.removeItem(OVERRIDES_KEY);
    mergeAndSort();
    renderList();
    setStatus("Modifications locales r\u00e9initialis\u00e9es.");
  }

  function bindEvents() {
    els.editForm.addEventListener("submit", onSubmit);
    els.backToListBtn.addEventListener("click", closeEditor);
    els.f_imagePath.addEventListener("change", onImagePathInput);
    els.changeImageBtn.addEventListener("click", onChangeImageClick);
    els.imageFileInput.addEventListener("change", onImageFileSelected);
    els.exportBtn.addEventListener("click", onExport);
    els.importBtn.addEventListener("click", function () {
      els.importFileInput.click();
    });
    els.importFileInput.addEventListener("change", onImportFile);
    els.resetBtn.addEventListener("click", onReset);
  }

  function init() {
    fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        chapters = json.chapters;
        baseBosses = json.bosses;
        populateChapterSelect();
        mergeAndSort();
        renderList();
        bindEvents();
        var overrideCount = Object.keys(loadOverrides()).length;
        setStatus(
          overrideCount
            ? overrideCount + " boss(es) avec des modifications locales non export\u00e9es."
            : "Aucune modification locale pour le moment."
        );
      })
      .catch(function (err) {
        setStatus(
          "Impossible de charger ../data/bosses.json (" +
            err.message +
            "). Si vous ouvrez ce fichier directement depuis votre disque, lancez un serveur local (ex. \u00ab python3 -m http.server \u00bb)."
        );
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
