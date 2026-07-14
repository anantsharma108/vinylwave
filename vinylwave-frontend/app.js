/* ============================================================
   VINYLWAVE — app logic
   Talks to the Spotify-clone Express API:
     POST /api/auth/register   { username, email, password, role }
     POST /api/auth/login      { username|email, password }
     GET  /api/music           -> { musics }
     GET  /api/music/albums    -> { albums }
     GET  /api/music/album/:id -> { album }
     POST /api/music/upload/music  (multipart: title, music)  [artist]
     POST /api/music/upload/album  { title, musics: [ids] }   [artist]
   Auth is a cookie set by the server, so every call uses
   credentials: 'include'.
   ============================================================ */

(function(){
  "use strict";

  const state = {
    apiBase: localStorage.getItem("vw_apiBase") || "https://vinylwave.onrender.com",
    user: JSON.parse(localStorage.getItem("vw_user") || "null"),
    musics: [],
    albums: [],
    currentAlbum: null,
    nowPlaying: null, // { id, title, artistName, uri }
  };

  /* ---------------- helpers ---------------- */
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function icons(){ if(window.lucide) window.lucide.createIcons(); }

  function toast(msg, type="default"){
    const el = $("#toast");
    if(!el) return;
    el.textContent = msg;
    el.className = "toast is-visible" + (type==="error" ? " is-error" : type==="success" ? " is-success" : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> el.classList.remove("is-visible"), 3200);
  }

  async function api(path, opts={}){
    const url = state.apiBase.replace(/\/$/,"") + path;
    const config = {
      method: opts.method || "GET",
      credentials: "include",
      headers: {},
      ...opts,
    };
    if(opts.json){
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(opts.json);
    }
    let res;
    try{
      res = await fetch(url, config);
    }catch(err){
      throw new Error("Can't reach the server at " + state.apiBase + ". Check the connection settings and that the backend is running (with CORS + credentials enabled).");
    }
    let data = null;
    try{ data = await res.json(); }catch(e){ /* no body */ }
    if(!res.ok){
      throw new Error((data && data.message) || ("Request failed (" + res.status + ")"));
    }
    return data;
  }

  function setError(key, msg){
    const el = $(`.form-error[data-error-for="${key}"]`);
    if(el) el.textContent = msg || "";
  }

  function fmtTime(sec){
    if(!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec/60), s = Math.floor(sec%60);
    return m + ":" + String(s).padStart(2,"0");
  }

  function initials(name){
    return (name||"?").trim().slice(0,2).toUpperCase();
  }

  /* ============================================================
     AUTH GATE
     ============================================================ */
  function initAuthGate(){
    $("#apiBaseInput").value = state.apiBase;

    $$(".auth-tab").forEach(tab=>{
      tab.addEventListener("click", ()=>{
        $$(".auth-tab").forEach(t=>t.classList.remove("is-active"));
        tab.classList.add("is-active");
        $$(".auth-form").forEach(f=>f.classList.remove("is-active"));
        $(`#${tab.dataset.tab}Form`).classList.add("is-active");
      });
    });

    $$(".role-opt").forEach(opt=>{
      opt.addEventListener("click", ()=>{
        $$(".role-opt").forEach(o=>o.classList.remove("is-active"));
        opt.classList.add("is-active");
      });
    });

    $("#apiSettingsToggle").addEventListener("click", ()=>{
      $("#apiSettingsPanel").classList.toggle("is-open");
    });
    $("#apiBaseSave").addEventListener("click", ()=>{
      const v = $("#apiBaseInput").value.trim();
      if(v){
        state.apiBase = v.replace(/\/$/,"");
        localStorage.setItem("vw_apiBase", state.apiBase);
        toast("Server address saved", "success");
      }
    });

    $("#loginForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      setError("login","");
      const fd = new FormData(e.target);
      const identifier = fd.get("identifier").trim();
      const isEmail = identifier.includes("@");
      try{
        const data = await api("/api/auth/login", {
          method:"POST",
          json:{
            username: isEmail ? undefined : identifier,
            email: isEmail ? identifier : undefined,
            password: fd.get("password"),
          }
        });
        onAuthed(data.user);
      }catch(err){ setError("login", err.message); }
    });

    $("#registerForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      setError("register","");
      const fd = new FormData(e.target);
      try{
        const data = await api("/api/auth/register", {
          method:"POST",
          json:{
            username: fd.get("username").trim(),
            email: fd.get("email").trim(),
            password: fd.get("password"),
            role: fd.get("role") || "user",
          }
        });
        onAuthed(data.user);
      }catch(err){ setError("register", err.message); }
    });
  }

  function onAuthed(user){
    state.user = user;
    localStorage.setItem("vw_user", JSON.stringify(user));
    enterApp();
  }

  /* ============================================================
     APP SHELL
     ============================================================ */
  function enterApp(){
    $("#authGate").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#playerBar").classList.remove("hidden");

    $("#userName").textContent = state.user.username;
    $("#userRole").textContent = state.user.role;
    $("#userAvatar").textContent = initials(state.user.username);
    if(state.user.role === "artist"){
      $("#uploadNavItem").style.display = "flex";
    }

    icons();
    loadAll();
  }

  function initNav(){
    $$(".nav-item").forEach(item=>{
      item.addEventListener("click", ()=> switchView(item.dataset.view));
    });
    $("#backToAlbums").addEventListener("click", ()=> switchView("albums"));
    $("#refreshBtn").addEventListener("click", loadAll);
    $("#logoutBtn").addEventListener("click", ()=>{
      localStorage.removeItem("vw_user");
      location.reload();
    });
  }

  const viewMeta = {
    home:   { title:"The Stack",     sub:"Fresh needle-drops from the whole label." },
    albums: { title:"Albums",        sub:"Full-length pressings, sleeve and all." },
    albumDetail: { title:"Album",    sub:"" },
    upload: { title:"Press a Record",sub:"Cut a new track or shelve a fresh album." },
  };

  function switchView(name){
    $$(".nav-item").forEach(n=> n.classList.toggle("is-active", n.dataset.view===name));
    $$(".view").forEach(v=> v.classList.remove("is-active"));
    const id = name === "albumDetail" ? "view-albumDetail" : `view-${name}`;
    $(`#${id}`)?.classList.add("is-active");
    const meta = viewMeta[name] || {title:"", sub:""};
    $("#viewTitle").textContent = meta.title;
    $("#viewSubtitle").textContent = meta.sub;
  }

  /* ---------------- data loading ---------------- */
  async function loadAll(){
    await Promise.all([loadMusics(), loadAlbums()]);
  }

  async function loadMusics(){
    try{
      const data = await api("/api/music");
      state.musics = data.musics || [];
      renderTracks();
      renderTrackPicker();
    }catch(err){ toast(err.message, "error"); }
  }

  async function loadAlbums(){
    try{
      const data = await api("/api/music/albums");
      state.albums = data.albums || [];
      renderAlbums();
    }catch(err){ toast(err.message, "error"); }
  }

  async function openAlbum(id){
    try{
      const data = await api(`/api/music/album/${id}`);
      state.currentAlbum = data.album;
      renderAlbumDetail();
      switchView("albumDetail");
    }catch(err){ toast(err.message, "error"); }
  }

  /* ---------------- rendering ---------------- */
  function renderTracks(){
    const grid = $("#tracksGrid");
    grid.innerHTML = "";
    $("#tracksEmpty").classList.toggle("hidden", state.musics.length !== 0);
    state.musics.forEach(m=>{
      const card = document.createElement("div");
      card.className = "track-card";
      card.innerHTML = `
        <div class="track-cover">
          <i data-lucide="disc-3"></i>
          <div class="play-overlay"><i data-lucide="play"></i></div>
        </div>
        <div class="track-title">${escapeHtml(m.title)}</div>
        <div class="track-artist">${escapeHtml(m.artist?.username || "Unknown artist")}</div>
      `;
      card.addEventListener("click", ()=> playTrack(m));
      grid.appendChild(card);
    });
    icons();
  }

  function renderAlbums(){
    const grid = $("#albumsGrid");
    grid.innerHTML = "";
    $("#albumsEmpty").classList.toggle("hidden", state.albums.length !== 0);
    state.albums.forEach(a=>{
      const card = document.createElement("div");
      card.className = "album-card";
      card.innerHTML = `
        <div class="album-cover"><i data-lucide="library-big"></i></div>
        <div class="album-title">${escapeHtml(a.title)}</div>
        <div class="album-artist">${escapeHtml(a.artist?.username || "Unknown artist")}</div>
      `;
      card.addEventListener("click", ()=> openAlbum(a._id));
      grid.appendChild(card);
    });
    icons();
  }

  function renderAlbumDetail(){
    const album = state.currentAlbum;
    if(!album) return;
    $("#albumDetailTitle").textContent = album.title;
    $("#albumDetailArtist").textContent = album.artist?.username || "Unknown artist";
    const list = $("#albumTrackList");
    list.innerHTML = "";
    const tracks = album.musics || [];
    if(tracks.length === 0){
      list.innerHTML = `<p class="muted" style="padding:14px 4px;">This sleeve is empty — no tracks linked yet.</p>`;
      return;
    }
    tracks.forEach((m, i)=>{
      const row = document.createElement("div");
      row.className = "track-row";
      const title = typeof m === "object" ? m.title : `Track ${i+1}`;
      row.innerHTML = `
        <span class="idx">${String(i+1).padStart(2,"0")}</span>
        <div>
          <div class="row-title">${escapeHtml(title || "Untitled")}</div>
          <div class="row-artist">${escapeHtml(album.artist?.username || "")}</div>
        </div>
        <i data-lucide="play"></i>
      `;
      if(typeof m === "object"){
        row.addEventListener("click", ()=> playTrack(m, album.artist?.username));
      }
      list.appendChild(row);
    });
    icons();
  }

  function renderTrackPicker(){
    const picker = $("#albumTrackPicker");
    picker.innerHTML = "";
    if(state.musics.length === 0){
      picker.innerHTML = `<p class="picker-empty">Upload a track first — it'll show up here to add to an album.</p>`;
      return;
    }
    state.musics.forEach(m=>{
      const row = document.createElement("label");
      row.className = "picker-row";
      row.innerHTML = `<input type="checkbox" value="${m._id}" /> ${escapeHtml(m.title)}`;
      picker.appendChild(row);
    });
  }

  function escapeHtml(str){
    return String(str ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  /* ============================================================
     PLAYER
     ============================================================ */
  const audio = () => $("#audioEl");

  function playTrack(track, artistNameOverride){
    if(!track || !track.uri){
      toast("This track has no playable audio source.", "error");
      return;
    }
    state.nowPlaying = track;
    $("#playerTitle").textContent = track.title || "Untitled";
    $("#playerArtist").textContent = artistNameOverride || track.artist?.username || "Unknown artist";

    const a = audio();
    a.src = track.uri;
    a.play().then(()=> setPlayingUI(true)).catch(()=>{
      toast("Playback couldn't start — the audio URL may be unreachable.", "error");
    });
  }

  function setPlayingUI(isPlaying){
    const icon = isPlaying ? "pause" : "play";
    $("#playPauseBtn").innerHTML = `<i data-lucide="${icon}"></i>`;
    $("#turntableDisc").classList.toggle("is-spinning", isPlaying);
    $("#tonearm").classList.toggle("is-down", isPlaying);
    icons();
  }

  function initPlayer(){
    const a = audio();

    $("#playPauseBtn").addEventListener("click", ()=>{
      if(!state.nowPlaying) return;
      if(a.paused){ a.play(); setPlayingUI(true); }
      else { a.pause(); setPlayingUI(false); }
    });

    a.addEventListener("timeupdate", ()=>{
      if(!a.duration) return;
      $("#seekBar").value = (a.currentTime / a.duration) * 100;
      $("#timeCurrent").textContent = fmtTime(a.currentTime);
      $("#timeTotal").textContent = fmtTime(a.duration);
    });
    a.addEventListener("ended", ()=> setPlayingUI(false));
    a.addEventListener("pause", ()=> setPlayingUI(false));
    a.addEventListener("play", ()=> setPlayingUI(true));

    $("#seekBar").addEventListener("input", (e)=>{
      if(!a.duration) return;
      a.currentTime = (e.target.value/100) * a.duration;
    });
    $("#volumeBar").addEventListener("input", (e)=>{
      a.volume = e.target.value/100;
    });
    a.volume = 0.8;
  }

  /* ============================================================
     UPLOAD (artist only)
     ============================================================ */
  function initUpload(){
    $("#uploadTrackForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      setError("uploadTrack","");
      const form = e.target;
      const fd = new FormData(form);
      try{
        const res = await fetch(state.apiBase.replace(/\/$/,"") + "/api/music/upload/music", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = await res.json().catch(()=>null);
        if(!res.ok) throw new Error((data && data.message) || "Upload failed");
        toast("Track pressed successfully", "success");
        form.reset();
        loadMusics();
      }catch(err){ setError("uploadTrack", err.message); }
    });

    $("#uploadAlbumForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      setError("uploadAlbum","");
      const form = e.target;
      const title = new FormData(form).get("title").trim();
      const musics = $$('#albumTrackPicker input[type="checkbox"]:checked').map(cb=>cb.value);
      if(musics.length === 0){
        setError("uploadAlbum","Pick at least one track for the album.");
        return;
      }
      try{
        await api("/api/music/upload/album", { method:"POST", json:{ title, musics } });
        toast("Album assembled", "success");
        form.reset();
        loadAlbums();
      }catch(err){ setError("uploadAlbum", err.message); }
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot(){
    icons();
    initAuthGate();
    initNav();
    initPlayer();
    initUpload();
    if(state.user){ enterApp(); }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
