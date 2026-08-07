// Weekly lesson organizer: notes, links, and imported sheet music
// (photos/PDFs) stored privately on-device in IndexedDB.
const Lessons = (() => {
  const DB_NAME = "guitar-trainer";
  const STORE = "lessons";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function store(mode) {
    return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function reqAsPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  const getAll = () => store("readonly").then((s) => reqAsPromise(s.getAll()));
  const put = (lesson) => store("readwrite").then((s) => reqAsPromise(s.put(lesson)));
  const remove = (id) => store("readwrite").then((s) => reqAsPromise(s.delete(id)));

  // --- DOM ---
  const listEl = document.getElementById("ls-list");
  const formEl = document.getElementById("ls-form");
  const newBtn = document.getElementById("ls-new");
  const dateIn = document.getElementById("ls-date");
  const titleIn = document.getElementById("ls-title");
  const notesIn = document.getElementById("ls-notes");
  const linksIn = document.getElementById("ls-links");
  const filesIn = document.getElementById("ls-files");
  const existingEl = document.getElementById("ls-existing");
  const saveBtn = document.getElementById("ls-save");
  const cancelBtn = document.getElementById("ls-cancel");
  const exportBtn = document.getElementById("ls-export");
  const importIn = document.getElementById("ls-import");
  const overlay = document.getElementById("ls-overlay");
  const overlayImg = document.getElementById("ls-overlay-img");

  let editing = null; // lesson being edited, or null for new

  // Local-timezone date (toISOString is UTC and rolls over at 7pm Central).
  function localDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function showForm(lesson) {
    editing = lesson || null;
    dateIn.value = lesson ? lesson.date : localDate();
    titleIn.value = lesson ? lesson.title : "";
    notesIn.value = lesson ? lesson.notes : "";
    linksIn.value = lesson ? (lesson.links || []).join("\n") : "";
    filesIn.value = "";
    renderExisting();
    formEl.hidden = false;
    newBtn.hidden = true;
    titleIn.focus();
  }

  function hideForm() {
    formEl.hidden = true;
    newBtn.hidden = false;
    editing = null;
  }

  function renderExisting() {
    existingEl.innerHTML = "";
    if (!editing || !editing.files.length) return;
    editing.files.forEach((f, i) => {
      const row = document.createElement("div");
      row.className = "ls-existing-row";
      const name = document.createElement("span");
      name.textContent = (f.type.startsWith("image/") ? "🖼️ " : "📄 ") + f.name;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "✕";
      del.title = "Remove attachment";
      del.addEventListener("click", () => {
        editing.files.splice(i, 1);
        renderExisting();
      });
      row.append(name, del);
      existingEl.appendChild(row);
    });
  }

  function parseLinks(text) {
    return text.split("\n").map((l) => l.trim())
      .filter((l) => /^https?:\/\//i.test(l));
  }

  async function save() {
    const lesson = editing || { files: [] };
    lesson.date = dateIn.value || localDate();
    lesson.title = titleIn.value.trim() || "Lesson";
    lesson.notes = notesIn.value;
    lesson.links = parseLinks(linksIn.value);
    for (const f of filesIn.files) {
      lesson.files.push({ name: f.name, type: f.type, data: f });
    }
    await put(lesson);
    hideForm();
    render();
  }

  function fileButton(f) {
    const url = URL.createObjectURL(f.data);
    if (f.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.className = "ls-thumb";
      img.src = url;
      img.alt = f.name;
      img.addEventListener("click", () => {
        overlayImg.src = url;
        overlay.hidden = false;
      });
      return img;
    }
    const a = document.createElement("a");
    a.className = "ls-file";
    a.textContent = "📄 " + f.name;
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  async function render() {
    const lessons = (await getAll()).sort((a, b) => b.date.localeCompare(a.date));
    listEl.innerHTML = "";

    if (!lessons.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "No lessons yet. After your next lesson, tap “New lesson” — type up what you covered, photograph any handouts, and attach them.";
      listEl.appendChild(p);
      return;
    }

    lessons.forEach((lesson) => {
      const card = document.createElement("div");
      card.className = "ls-card";

      const head = document.createElement("div");
      head.className = "ls-head";
      const title = document.createElement("h3");
      title.textContent = lesson.title;
      const date = document.createElement("span");
      date.className = "ls-date";
      date.textContent = lesson.date;
      head.append(title, date);
      card.appendChild(head);

      if (lesson.notes) {
        const notes = document.createElement("p");
        notes.className = "ls-notes";
        notes.textContent = lesson.notes;
        card.appendChild(notes);
      }

      if (lesson.links && lesson.links.length) {
        const links = document.createElement("div");
        links.className = "ls-links";
        lesson.links.forEach((url) => {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "🔗 " + url.replace(/^https?:\/\/(www\.)?/i, "").slice(0, 48);
          links.appendChild(a);
        });
        card.appendChild(links);
      }

      if (lesson.files.length) {
        const files = document.createElement("div");
        files.className = "ls-files";
        lesson.files.forEach((f) => files.appendChild(fileButton(f)));
        card.appendChild(files);
      }

      const actions = document.createElement("div");
      actions.className = "ls-actions";
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => showForm(lesson));
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (confirm(`Delete "${lesson.title}" (${lesson.date})?`)) {
          await remove(lesson.id);
          render();
        }
      });
      actions.append(editBtn, delBtn);
      card.appendChild(actions);

      listEl.appendChild(card);
    });
  }

  // --- Backup: export/import all lessons as a JSON file ---
  function blobToB64(blob) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.readAsDataURL(blob);
    });
  }

  async function exportAll() {
    const lessons = await getAll();
    const out = [];
    for (const l of lessons) {
      const files = [];
      for (const f of l.files) {
        files.push({ name: f.name, type: f.type, b64: await blobToB64(f.data) });
      }
      out.push({ date: l.date, title: l.title, notes: l.notes, links: l.links || [], files });
    }
    const blob = new Blob([JSON.stringify({ version: 1, lessons: out })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `guitar-lessons-backup-${localDate()}.json`;
    a.click();
  }

  function b64ToBlob(b64, type) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  async function importAll(file) {
    try {
      const data = JSON.parse(await file.text());
      for (const l of data.lessons) {
        await put({
          date: l.date,
          title: l.title,
          notes: l.notes,
          links: l.links || [],
          files: (l.files || []).map((f) => ({ name: f.name, type: f.type, data: b64ToBlob(f.b64, f.type) })),
        });
      }
      render();
    } catch {
      alert("Couldn't read that backup file.");
    }
  }

  newBtn.addEventListener("click", () => showForm(null));
  cancelBtn.addEventListener("click", hideForm);
  saveBtn.addEventListener("click", save);
  exportBtn.addEventListener("click", exportAll);
  importIn.addEventListener("change", () => {
    if (importIn.files[0]) importAll(importIn.files[0]);
    importIn.value = "";
  });
  overlay.addEventListener("click", () => {
    overlay.hidden = true;
    overlayImg.src = "";
  });

  render();
  return { render };
})();
