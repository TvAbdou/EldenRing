# Parcours des Boss — Elden Ring

Site immersif présentant les 50 boss d'Elden Ring un par un, façon grimoire ancien.

## Structure

```
/index.html          page publique (le parcours)
/style.css
/script.js
/data/bosses.json    toutes les données des 50 boss + 11 chapitres
/images/bosses/       images des boss (placeholder.svg fourni par défaut)
/images/background/
/images/icons/
/admin/index.html     panneau d'administration
/admin/admin.css
/admin/admin.js
```

Aucune donnée n'est écrite en dur dans le HTML/JS : tout vient de `data/bosses.json`.

## Voir le site en local

Les navigateurs bloquent `fetch()` sur des fichiers ouverts directement (`file://`).
Il faut donc servir le dossier avec un petit serveur local, par exemple :

```
cd eldenring-journey
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000

## Modifier le contenu — `/admin`

Ouvrez `admin/index.html` (ou `/admin/` une fois déployé). Vous y trouverez la liste
des 50 boss ; cliquez sur une ligne pour éditer nom, chapitre, zone, difficulté,
description, image, PV, défense, faiblesse, résistances, récompenses, infos
supplémentaires, puis « Enregistrer ».

**Important — comment fonctionne la sauvegarde :**
Les modifications sont enregistrées dans le stockage local de votre navigateur
(`localStorage`), pas sur un serveur. C'est ce qui permet d'éditer le site sans backend
ni base de données, et ça fonctionne très bien pour un usage personnel ou en
prévisualisation.

Pour que les changements soient **définitifs et visibles par tous les visiteurs** du
site déployé :
1. Faites vos modifications dans `/admin`.
2. Cliquez sur **« Exporter bosses.json »** → un fichier `bosses.json` à jour est
   téléchargé.
3. Remplacez `data/bosses.json` dans votre projet par ce fichier.
4. Redéployez (push GitHub Pages, redeploy Vercel, etc.).

Le bouton **« Importer bosses.json »** fait l'inverse : il recharge un fichier exporté
dans le stockage local, pratique pour reprendre une édition sur un autre appareil.
**« Réinitialiser »** efface les modifications locales non exportées.

> Si vous voulez à terme que les modifications soient sauvegardées en ligne
> automatiquement (sans passer par export/import), il faudra un backend avec une vraie
> base de données (ex. Supabase, Firebase). L'architecture actuelle (JSON + admin
> statique) est volontairement pensée pour rester 100% déployable sur GitHub Pages /
> Vercel sans serveur ; ce serait une évolution possible si besoin.

## Images des boss

Aucune capture d'écran du jeu n'est fournie (droits d'auteur) : chaque boss utilise
par défaut une illustration de substitution (`images/bosses/placeholder.svg`), dans
l'esprit du site. Depuis `/admin`, remplacez l'image de chaque boss soit :
- en téléversant votre propre visuel (bouton « Changer l'image ») — pratique pour
  prévisualiser, mais alourdit le stockage local ;
- soit en déposant le fichier dans `images/bosses/` et en indiquant son chemin
  (ex. `images/bosses/margit.jpg`) — recommandé pour la version définitive du site.

## Déploiement

Le site est 100% statique (HTML/CSS/JS + JSON), donc déployable tel quel sur GitHub
Pages, Vercel, Netlify ou tout hébergement statique — il suffit de pousser le dossier.
