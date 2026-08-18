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
    
    // Vues et filtres
    listView: document.getElementById("listView"),
    searchInput: document.getElementById("searchInput"),
    filterChapter: document.getElementById("filterChapter"),
    filterStatus: document.getElementById("filterStatus"),
    addBossBtn: document.getElementById("addBossBtn"),
    bossTableBody: document.getElementById("bossTableBody"),
    
    // Vue Édition
    editView: document.getElementById("editView"),
    backToListBtn: document.getElementById("backToListBtn"),
    backToSiteBtn: document.getElementById("backToSiteBtn"),
    editForm: document.getElementById("editForm"),
    saveFeedback: document.getElementById("saveFeedback"),
    deleteBossBtn: document.getElementById("deleteBossBtn"),

    // Champs du formulaire
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

    // Gestion de l'image
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
  var isDirty = false; // Permet de savoir si le formulaire a été modifié

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveOverrides(obj) {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(obj));
    isDirty = false; // Modification sauvée
  }

  function mergeAndSort() {
    var overrides = loadOverrides();
    bosses = baseBosses.map(function (b) {
      return Object.assign({}, b, overrides[b.id] || {});
    });

    // Ajouter les boss créés manuellement (présents dans overrides mais pas dans baseBosses)
    var baseIds = baseBosses.map(function(b) { return b.id; });
    Object.keys(overrides).forEach(function(idStr) {
      var id = Number(idStr);
      if (!baseIds.includes(id)) {
        bosses.push(overrides[idStr]);
      }
    });

    // Nettoyer, filtrer les supprimés, marquer les édités et trier
    bosses = bosses
      .filter(function(b) { return !b._deleted; })
      .map(function(b) {
        b._edited = !!overrides[b.id];
        return b;
      })
      .sort(function (a, b) {
        return a.number - b.number;
      });
  }

  function setStatus(msg) {
    els.statusNote.innerHTML = "<strong>Statut :</strong> " + msg;
  }

  function populateChapterSelects() {
    var options = chapters.map(function (c) {
      return '<option value="' + c.num + '">Chapitre ' + c.num + " \u2014 " + c.title + "</option>";
    }).join("");
    
    // Remplir le filtre
    els.filterChapter.innerHTML = '<option value="all">Tous les chapitres</option>' + options;
    // Remplir le formulaire
    els.f_chapter.innerHTML = options;
  }

  function renderList() {
    // Appliquer les filtres
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
      els.bossTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun boss ne correspond à la recherche.</td></tr>';
      return;
    }

    els.bossTableBody.innerHTML = filteredBosses.map(function (b) {
        return (
          "<tr data-id=\"" + b.id + "\">" +
          '<td class="col-num">' + String(b.number).padStart(2, "0") + '</td>' +
          '<td class="col-name">' + escapeHtml(b.name) + '</td>' +
          '<td class="col-chapter">' + escapeHtml(b.chapterTitle) + '</td>' +
          '<td class="col-zone">' + escapeHtml(b.zone || "") + '</td>' +
          "<td>" + (b._edited ? '<span class="badge-edited">modifi\u00e9</span>' : "") + "</td>" +
          "</tr>"
        );
      }).join("");

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

  // Création d'un nouveau Boss
  function onAddBoss() {
    var newId = 1;
    if (bosses.length > 0) {
      newId = Math.max.apply(Math, bosses.map(function(b) { return b.id; })) + 1;
    }
    
    // Pré-remplir avec des données vides pour l'éditeur
    bosses.push({
      id: newId,
      name: "Nouveau Boss",
      number: bosses.length + 1,
      chapterNum: chapters[0] ? chapters[0].num : 1,
      _edited: true // On force le statut modifié pour la création
    });
    
    openEditor(newId);
    isDirty = true; // Forcer la demande de sauvegarde
  }

  // Suppression d'un Boss
  function onDeleteBoss() {
    if (editingId == null) return;
    if (!confirm("Voulez-vous vraiment supprimer ce boss ? Il n'apparaîtra plus dans la liste.")) return;

    var overrides = loadOverrides();
    overrides[editingId] = { id: editingId, _deleted: true };
    saveOverrides(overrides);
    
    mergeAndSort();
    renderList();
    closeEditor(true); // Fermer en forçant (sans alerte isDirty)
    setStatus("Boss supprimé.");
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
      els.f_imagePath.placeholder = "(image t\u00e9l\u00e9vers\u00e9e en m\u00e9moire)";
    } else {
      els.f_imagePath.value = value;
      els.f_imagePath.placeholder = "images/bosses/exemple.jpg";
    }
  }

  function confirmLeaveIfDirty(e) {
    if (!isDirty) return true;
    var msg = "Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?";
    if (e && e.type === "beforeunload") {
      e.returnValue = msg;
      return msg;
    }
    return confirm(msg);
  }

  function closeEditor(force) {
    if (force !== true && !confirmLeaveIfDirty()) return;
    
    // Si c'était un boss ajouté non sauvegardé, le retirer
    if (isDirty) mergeAndSort(); 
    
    editingId = null;
    isDirty = false;
    els.editView.hidden = true;
    els.listView.hidden = false;
  }

  function chapterMeta(num) {
    return chapters.find(function (c) {
      return c.num === Number(num);
    }) || {};
  }

  function onSubmit(e) {
    e.preventDefault();
    if (editingId == null) return;

    var overrides = loadOverrides();
    var chMeta = chapterMeta(els.f_chapter.value);

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

  function processImageFile(file) {
    if (!file || !file.type.match('image.*')) return;
    
    // Avertissement de poids (1 Mo)
    if (file.size > 1048576) {
      els.imageWarning.style.display = "block";
    } else {
      els.imageWarning.style.display = "none";
    }

    var reader = new FileReader();
    reader.onload = function () {
      setImagePreview(reader.result);
      isDirty = true;
    };
    reader.onerror = function() {
      alert("Erreur lors de la lecture de l'image.");
    };
    reader.readAsDataURL(file);
  }

  function onExport() {
    var overrides = loadOverrides();
    var merged = baseBosses
      .map(function (b) { return Object.assign({}, b, overrides[b.id] || {}); });

    // Ajout des boss créés manuellement
    var baseIds = baseBosses.map(function(b){ return b.id; });
    Object.keys(overrides).forEach(function(idStr) {
      if (!baseIds.includes(Number(idStr))) merged.push(overrides[idStr]);
    });

    // Nettoyage avant export : retirer les boss supprimés et la propriété _edited
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
    // Écouteurs pour rendre le formulaire "Dirty" (modifié)
    els.editForm.addEventListener("input", function() { isDirty = true; });
    els.editForm.addEventListener("change", function() { isDirty = true; });
    window.addEventListener("beforeunload", confirmLeaveIfDirty);

    // Actions principales formulaire
    els.editForm.addEventListener("submit", onSubmit);
    els.backToListBtn.addEventListener("click", closeEditor);
    els.backToSiteBtn.addEventListener("click", function(e) {
      if (!confirmLeaveIfDirty()) e.preventDefault();
    });
    els.deleteBossBtn.addEventListener("click", onDeleteBoss);

    // Filtres et Recherche
    els.searchInput.addEventListener("input", renderList);
    els.filterChapter.addEventListener("change", renderList);
    els.filterStatus.addEventListener("change", renderList);
    els.addBossBtn.addEventListener("click", onAddBoss);

    // Gestion Image classique
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

    // Drag and Drop de l'image
    els.dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      els.dropZone.classList.add('drag-over');
    });
    els.dropZone.addEventListener('dragleave', function(e) {
      els.dropZone.classList.remove('drag-over');
    });
    els.dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      els.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processImageFile(e.dataTransfer.files[0]);
      }
    });

    // Toolbar globale
    els.exportBtn.addEventListener("click", onExport);
    els.importBtn.addEventListener("click", function () { els.importFileInput.click(); });
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
        populateChapterSelects();
        mergeAndSort();
        renderList();
        bindEvents();
        
        var overrideCount = Object.keys(loadOverrides()).length;
        setStatus(
          overrideCount
            ? overrideCount + " modification(s) non exportée(s)."
            : "Aucune modification locale pour le moment."
        );
      })
      .catch(function (err) {
        setStatus("Impossible de charger ../data/bosses.json (" + err.message + "). Lancez un serveur web local.");
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
