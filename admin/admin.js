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
    
    // Vues & Filtres
    listView: document.getElementById("listView"),
    searchInput: document.getElementById("searchInput"),
    filterChapter: document.getElementById("filterChapter"),
    filterStatus: document.getElementById("filterStatus"),
    addBossBtn: document.getElementById("addBossBtn"),
    bossTableBody: document.getElementById("bossTableBody"),
    selectAll: document.getElementById("selectAll"),

    // Actions en lot
    bulkBar: document.getElementById("bulkBar"),
    bulkCount: document.getElementById("bulkCount"),
    bulkChapterSelect: document.getElementById("bulkChapterSelect"),
    bulkDifficultySelect: document.getElementById("bulkDifficultySelect"),
    applyBulkBtn: document.getElementById("applyBulkBtn"),
    deleteBulkBtn: document.getElementById("deleteBulkBtn"),
    
    // Vue Édition
    editView: document.getElementById("editView"),
    backToListBtn: document.getElementById("backToListBtn"),
    backToSiteBtn: document.getElementById("backToSiteBtn"),
    editForm: document.getElementById("editForm"),
    saveFeedback: document.getElementById("saveFeedback"),
    deleteBossBtn: document.getElementById("deleteBossBtn"),

    // Champs
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

    // Media
    dropZone: document.getElementById("dropZone"),
    editImagePreview: document.getElementById("editImagePreview"),
    changeImageBtn: document.getElementById("changeImageBtn"),
    removeImageBtn: document.getElementById("removeImageBtn"),
    imageFileInput: document.getElementById("imageFileInput"),
    imageWarning: document.getElementById("imageWarning")
  };

  var chapters = [];
  var baseBosses = []; 
  var bosses = []; 
  var editingId = null;
  var currentImageValue = "";
  var isDirty = false;
  var draggedRow = null;

  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); } catch (e) { return {}; }
  }

  function saveOverrides(obj) {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(obj));
    isDirty = false;
  }

  function mergeAndSort() {
    var overrides = loadOverrides();
    bosses = baseBosses.map(function (b) {
      return Object.assign({}, b, overrides[b.id] || {});
    });

    var baseIds = baseBosses.map(function(b) { return b.id; });
    Object.keys(overrides).forEach(function(idStr) {
      var id = Number(idStr);
      if (!baseIds.includes(id)) {
        bosses.push(overrides[idStr]);
      }
    });

    bosses = bosses
      .filter(function(b) { return !b._deleted; })
      .map(function(b) {
        b._edited = !!overrides[b.id];
        b.tags = b.tags || [];
        return b;
      })
      .sort(function (a, b) { return a.number - b.number; });
  }

  function setStatus(msg) {
    els.statusNote.innerHTML = "<strong>Statut :</strong> " + msg;
  }

  function populateChapterSelects() {
    var options = chapters.map(function (c) {
      return '<option value="' + c.num + '">Chapitre ' + c.num + " \u2014 " + c.title + "</option>";
    }).join("");
    
    els.filterChapter.innerHTML = '<option value="all">Tous les chapitres</option>' + options;
    els.f_chapter.innerHTML = options;
    els.bulkChapterSelect.innerHTML = '<option value="">Changer de chapitre...</option>' + options;
  }

  function renderList() {
    var query = els.searchInput.value.toLowerCase();
    var filterCh = els.filterChapter.value;
    var filterSt = els.filterStatus.value;

    var filteredBosses = bosses.filter(function(b) {
      var matchQuery = b.name.toLowerCase().includes(query) || (b.zone && b.zone.toLowerCase().includes(query));
      var matchChap = (filterCh === "all" || b.chapterNum == filterCh);
      var matchStat = (filterSt === "all" || (filterSt === "edited" && b._edited));
      return matchQuery && matchChap && matchStat;
    });

    if (filteredBosses.length === 0) {
      els.bossTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Aucun boss ne correspond.</td></tr>';
      updateBulkBar();
      return;
    }

    els.bossTableBody.innerHTML = filteredBosses.map(function (b) {
        var tagsHtml = (b.tags || []).map(function(t) { return '<span class="tag-badge">' + escapeHtml(t) + '</span>'; }).join(" ");
        return (
          '<tr data-id="' + b.id + '" draggable="true">' +
          '<td><input type="checkbox" class="boss-checkbox" value="' + b.id + '"></td>' +
          '<td class="drag-handle">&#x2630;</td>' +
          '<td class="col-num">' + String(b.number).padStart(2, "0") + '</td>' +
          '<td class="col-name">' + escapeHtml(b.name) + '</td>' +
          '<td><div class="tags-list">' + tagsHtml + '</div></td>' +
          '<td class="col-chapter">' + escapeHtml(b.chapterTitle) + '</td>' +
          '<td class="col-zone">' + escapeHtml(b.zone || "") + '</td>' +
          '<td>' + (b._edited ? '<span class="badge-edited">modifi\u00e9</span>' : "") + '</td>' +
          '</tr>'
        );
      }).join("");

    bindTableEvents();
    updateBulkBar();
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function bindTableEvents() {
    var rows = els.bossTableBody.querySelectorAll("tr");
    Array.prototype.forEach.call(rows, function (tr) {
      // Ouverture au clic sur le nom
      var colName = tr.querySelector(".col-name");
      if (colName) {
        colName.addEventListener("click", function () {
          openEditor(Number(tr.getAttribute("data-id")));
        });
      }

      // Écouteurs Drag and Drop pour réordonner les lignes
      tr.addEventListener("dragstart", function (e) {
        draggedRow = tr;
        tr.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      tr.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        tr.classList.add("drag-over-row");
      });

      tr.addEventListener("dragleave", function () {
        tr.classList.remove("drag-over-row");
      });

      tr.addEventListener("drop", function (e) {
        e.preventDefault();
        tr.classList.remove("drag-over-row");
        if (draggedRow && draggedRow !== tr) {
          var sourceId = Number(draggedRow.getAttribute("data-id"));
          var targetId = Number(tr.getAttribute("data-id"));
          reorderBosses(sourceId, targetId);
        }
      });

      tr.addEventListener("dragend", function () {
        if (draggedRow) draggedRow.classList.remove("dragging");
        draggedRow = null;
      });
    });

    // Écouteurs de sélections (checkboxes)
    var checkboxes = els.bossTableBody.querySelectorAll(".boss-checkbox");
    Array.prototype.forEach.call(checkboxes, function (cb) {
      cb.addEventListener("change", updateBulkBar);
    });
  }

  // Réordonner les numéros de boss après un Glisser-Déposer
  function reorderBosses(sourceId, targetId) {
    var srcIdx = bosses.findIndex(function(b) { return b.id === sourceId; });
    var tgtIdx = bosses.findIndex(function(b) { return b.id === targetId; });

    if (srcIdx < 0 || tgtIdx < 0) return;

    var movedBoss = bosses.splice(srcIdx, 1)[0];
    bosses.splice(tgtIdx, 0, movedBoss);

    // Mettre à jour la séquence globale des numéros
    var overrides = loadOverrides();
    bosses.forEach(function(b, idx) {
      b.number = idx + 1;
      overrides[b.id] = Object.assign({}, overrides[b.id] || {}, b);
    });

    saveOverrides(overrides);
    mergeAndSort();
    renderList();
    setStatus("Ordre des boss mis à jour.");
  }

  // Gestion des actions en lot (Bulk Actions)
  function getSelectedIds() {
    var checked = els.bossTableBody.querySelectorAll(".boss-checkbox:checked");
    return Array.prototype.map.call(checked, function(cb) { return Number(cb.value); });
  }

  function updateBulkBar() {
    var selectedIds = getSelectedIds();
    if (selectedIds.length > 0) {
      els.bulkBar.hidden = false;
      els.bulkCount.textContent = selectedIds.length + " boss sélectionné(s)";
    } else {
      els.bulkBar.hidden = true;
      els.selectAll.checked = false;
    }
  }

  function onApplyBulk() {
    var ids = getSelectedIds();
    if (ids.length === 0) return;

    var newChap = els.bulkChapterSelect.value;
    var newDiff = els.bulkDifficultySelect.value;

    if (!newChap && !newDiff) {
      alert("Veuillez choisir un chapitre ou une difficulté à appliquer.");
      return;
    }

    var overrides = loadOverrides();
    var chMeta = newChap ? chapterMeta(newChap) : {};

    ids.forEach(function(id) {
      var boss = bosses.find(function(b) { return b.id === id; });
      if (!boss) return;

      var updated = Object.assign({}, boss, overrides[id] || {});
      if (newChap) {
        updated.chapterNum = newChap;
        updated.chapterTitle = chMeta.title || "";
        updated.chapterSub = chMeta.sub || "";
      }
      if (newDiff) {
        updated.difficulty = Number(newDiff);
      }
      overrides[id] = updated;
    });

    saveOverrides(overrides);
    mergeAndSort();
    renderList();
    setStatus(ids.length + " boss mis à jour en lot.");
  }

  function onDeleteBulk() {
    var ids = getSelectedIds();
    if (ids.length === 0) return;
    if (!confirm("Voulez-vous vraiment supprimer les " + ids.length + " boss sélectionnés ?")) return;

    var overrides = loadOverrides();
    ids.forEach(function(id) {
      overrides[id] = { id: id, _deleted: true };
    });

    saveOverrides(overrides);
    mergeAndSort();
    renderList();
    setStatus(ids.length + " boss supprimés.");
  }

  function openEditor(id) {
    var boss = bosses.find(function (b) { return b.id === id; });
    if (!boss) return;
    editingId = id;
    isDirty = false;

    els.f_name.value = boss.name || "";
    els.f_number.value = boss.number;
    els.f_chapter.value = boss.chapterNum || 1;
    els.f_zone.value = boss.zone || "";
    els.f_difficulty.value = boss.difficulty || 1;
    els.f_description.value = boss.description || "";
    els.f_hp.value = boss.hp || "";
    els.f_defense.value = boss.defense || "";
    els.f_weakness.value = boss.weakness || "";
    els.f_resistances.value = boss.resistances || "";
    els.f_rewards.value = boss.rewards || "";
    els.f_extra.value = boss.extra || "";

    // Cocher les tags existants
    var currentTags = boss.tags || [];
    var tagCheckboxes = els.editForm.querySelectorAll('input[name="f_tags"]');
    Array.prototype.forEach.call(tagCheckboxes, function(cb) {
      cb.checked = currentTags.includes(cb.value);
    });

    setImagePreview(boss.image || "");
    
    els.saveFeedback.classList.remove("show");
    els.listView.hidden = true;
    els.editView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setImagePreview(value) {
    currentImageValue = value;
    els.editImagePreview.src = value || "../images/bosses/placeholder.svg";
    
    if (value && value.indexOf("data:") === 0) {
      els.f_imagePath.value = "";
      els.f_imagePath.placeholder = "(image téléversée en mémoire)";
    } else {
      els.f_imagePath.value = value;
      els.f_imagePath.placeholder = "images/bosses/exemple.jpg";
    }
  }

  function confirmLeaveIfDirty(e) {
    if (!isDirty) return true;
    var msg = "Modifications non enregistrées. Voulez-vous quitter ?";
    if (e && e.type === "beforeunload") { e.returnValue = msg; return msg; }
    return confirm(msg);
  }

  function closeEditor(force) {
    if (force !== true && !confirmLeaveIfDirty()) return;
    if (isDirty) mergeAndSort(); 
    
    editingId = null;
    isDirty = false;
    els.editView.hidden = true;
    els.listView.hidden = false;
  }

  function chapterMeta(num) {
    return chapters.find(function (c) { return c.num === Number(num); }) || {};
  }

  function onSubmit(e) {
    e.preventDefault();
    if (editingId == null) return;

    var overrides = loadOverrides();
    var chMeta = chapterMeta(els.f_chapter.value);

    // Récupération des tags cochés
    var selectedTags = [];
    var tagCheckboxes = els.editForm.querySelectorAll('input[name="f_tags"]:checked');
    Array.prototype.forEach.call(tagCheckboxes, function(cb) { selectedTags.push(cb.value); });

    overrides[editingId] = {
      id: editingId,
      name: els.f_name.value.trim(),
      number: Number(els.f_number.value) || editingId,
      chapterNum: els.f_chapter.value,
      chapterTitle: chMeta.title || "",
      chapterSub: chMeta.sub || "",
      zone: els.f_zone.value.trim(),
      difficulty: Math.max(1, Math.min(5, Number(els.f_difficulty.value) || 1)),
      tags: selectedTags,
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

    els.saveFeedback.textContent = "Enregistré.";
    els.saveFeedback.classList.add("show");
    setTimeout(function () { els.saveFeedback.classList.remove("show"); }, 2600);
  }

  function processImageFile(file) {
    if (!file || !file.type.match('image.*')) return;
    if (file.size > 1048576) { els.imageWarning.style.display = "block"; } else { els.imageWarning.style.display = "none"; }

    var reader = new FileReader();
    reader.onload = function () {
      setImagePreview(reader.result);
      isDirty = true;
    };
    reader.readAsDataURL(file);
  }

  function onExport() {
    var overrides = loadOverrides();
    var merged = baseBosses.map(function (b) { return Object.assign({}, b, overrides[b.id] || {}); });

    var baseIds = baseBosses.map(function(b){ return b.id; });
    Object.keys(overrides).forEach(function(idStr) {
      if (!baseIds.includes(Number(idStr))) merged.push(overrides[idStr]);
    });

    merged = merged
      .filter(function(b) { return !b._deleted; })
      .sort(function (a, b) { return a.number - b.number; })
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

  function bindEvents() {
    els.editForm.addEventListener("input", function() { isDirty = true; });
    els.editForm.addEventListener("change", function() { isDirty = true; });
    window.addEventListener("beforeunload", confirmLeaveIfDirty);

    els.editForm.addEventListener("submit", onSubmit);
    els.backToListBtn.addEventListener("click", closeEditor);
    els.backToSiteBtn.addEventListener("click", function(e) { if (!confirmLeaveIfDirty()) e.preventDefault(); });
    els.deleteBossBtn.addEventListener("click", function() {
      if (confirm("Supprimer ce boss ?")) {
        var overrides = loadOverrides();
        overrides[editingId] = { id: editingId, _deleted: true };
        saveOverrides(overrides);
        mergeAndSort();
        renderList();
        closeEditor(true);
      }
    });

    els.searchInput.addEventListener("input", renderList);
    els.filterChapter.addEventListener("change", renderList);
    els.filterStatus.addEventListener("change", renderList);
    els.addBossBtn.addEventListener("click", function() {
      var newId = bosses.length > 0 ? Math.max.apply(Math, bosses.map(function(b){ return b.id; })) + 1 : 1;
      bosses.push({ id: newId, name: "Nouveau Boss", number: bosses.length + 1, chapterNum: 1, _edited: true });
      openEditor(newId);
      isDirty = true;
    });

    // Checkbox Tout Sélectionner
    els.selectAll.addEventListener("change", function() {
      var checkboxes = els.bossTableBody.querySelectorAll(".boss-checkbox");
      Array.prototype.forEach.call(checkboxes, function(cb) { cb.checked = els.selectAll.checked; });
      updateBulkBar();
    });

    // Actions en lot
    els.applyBulkBtn.addEventListener("click", onApplyBulk);
    els.deleteBulkBtn.addEventListener("click", onDeleteBulk);

    // Images
    els.f_imagePath.addEventListener("change", function() { setImagePreview(els.f_imagePath.value.trim()); });
    els.changeImageBtn.addEventListener("click", function () { els.imageFileInput.click(); });
    els.imageFileInput.addEventListener("change", function (e) {
      if(e.target.files && e.target.files[0]) processImageFile(e.target.files[0]);
    });
    els.removeImageBtn.addEventListener("click", function() {
      setImagePreview("");
      els.imageWarning.style.display = "none";
      isDirty = true;
    });

    els.exportBtn.addEventListener("click", onExport);
    els.importBtn.addEventListener("click", function () { els.importFileInput.click(); });
    els.importFileInput.addEventListener("change", function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var imported = JSON.parse(reader.result);
          var newOverrides = {};
          imported.bosses.forEach(function (b) { if (b && b.id != null) newOverrides[b.id] = b; });
          saveOverrides(newOverrides);
          mergeAndSort();
          renderList();
          setStatus("Import réussi.");
        } catch (err) { setStatus("Erreur d'import."); }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
    els.resetBtn.addEventListener("click", function() {
      if (confirm("Réinitialiser tout ?")) {
        localStorage.removeItem(OVERRIDES_KEY);
        mergeAndSort();
        renderList();
      }
    });
  }

  function init() {
    fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        chapters = json.chapters;
        baseBosses = json.bosses;
        populateChapterSelects();
        mergeAndSort();
        renderList();
        bindEvents();
      })
      .catch(function () { setStatus("Erreur lors du chargement de bosses.json."); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
