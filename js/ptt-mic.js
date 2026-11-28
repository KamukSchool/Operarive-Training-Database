/**
 * Push-to-Talk mic — hold to speak, release to send.
 * Waits for speech recognition to finish before sending (no half words).
 * Auto-restarts recognition while the button is held so long answers are not lost.
 *
 * Server STT (MediaRecorder → /alice/stt) is used instead of the browser recognizer when
 * the recognizer is missing or unreliable: iPhone/iPad (all iOS browsers + home-screen app),
 * Firefox, in-app browsers, or after the recognizer fails on this device.
 * opts.stt: 'auto' (default) | 'browser' | 'server'. opts.sttTutor: access scope for /alice/stt.
 */
var PttMic = (function () {
  'use strict';

  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var fallbackInstances = {};
  var RESTART_MS = 80;
  var SEND_WAIT_MS = 320;
  var STOP_LOCK_MS = 2800;
  var MAX_RESTART_FAILS = 4;
  var RECOVERABLE_ERRORS = { 'no-speech': 1, network: 1, aborted: 1 };
  var FATAL_ERRORS = { 'not-allowed': 1, 'service-not-allowed': 1, 'audio-capture': 1 };
  var SWITCH_TO_SERVER_ERRORS = { 'no-sr': 1, 'service-not-allowed': 1, network: 1, 'restart-failed': 1, 'start-failed': 1, 'language-not-supported': 1 };

  var UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  var IS_IOS = /iP(hone|ad|od)/i.test(UA) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IS_PHONE = IS_IOS || /Android|Mobile/i.test(UA);
  var serverPreferred = false;

  function serverSttCapable() {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      typeof infinityFetch === 'function' &&
      typeof getAuthToken === 'function' && getAuthToken()
    );
  }

  function pickRecorderMime() {
    var list = IS_IOS
      ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (var i = 0; i < list.length; i++) {
      try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {}
    }
    return '';
  }

  function sttLang(lang) {
    var l = String(lang || 'en-US').toLowerCase();
    return l.indexOf('es') === 0 ? 'es' : 'en';
  }

  function getInst(btn) {
    if (!btn) return null;
    if (instances) return instances.get(btn) || null;
    return fallbackInstances[btn.id || btn] || null;
  }

  function setInst(btn, inst) {
    if (instances) instances.set(btn, inst);
    else fallbackInstances[btn.id || 'btn'] = inst;
  }

  function delInst(btn) {
    if (instances) instances.delete(btn);
    else delete fallbackInstances[btn.id || 'btn'];
  }

  function isTouchPointer(e) {
    return !!(e && (e.pointerType === 'touch' || e.pointerType === 'pen'));
  }

  function bind(opts) {
    var btn = typeof opts.btn === 'string' ? document.getElementById(opts.btn) : opts.btn;
    if (!btn) return null;

    var prev = getInst(btn);
    if (prev && prev.destroy) prev.destroy();

    var rec = null;
    var transcript = '';
    var committed = [];
    var lastFinalCount = 0;
    var holding = false;
    var active = false;
    var sent = false;
    var stopLock = false;
    var wantSend = false;
    var sendTimer = null;
    var restartTimer = null;
    var stopLockTimer = null;
    var lastResults = null;
    var sessionId = 0;
    var restartFails = 0;
    var downPointerId = null;
    var micLive = false;
    var micLiveAt = 0;
    var pressAt = 0;
    var srSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    btn.style.touchAction = 'none';
    btn.style.webkitTouchCallout = 'none';
    btn.style.webkitUserSelect = 'none';
    btn.style.userSelect = 'none';

    function ui(listening) {
      if (typeof opts.onUi === 'function') opts.onUi(listening, btn);
    }

    // ── Server STT path ───────────────────────────────────────
    var srv = { holding: false, sending: false, rec: null, stream: null, chunks: [], mime: '', sid: 0, timer: null, startedAt: 0 };

    function useServer() {
      if (opts.stt === 'browser' || !serverSttCapable()) return false;
      if (opts.stt === 'server') return true;
      return !srSupported || IS_PHONE || serverPreferred;
    }

    function srvStopTracks() {
      if (srv.stream) {
        try { srv.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      }
      srv.stream = null;
    }

    function srvKill() {
      clearTimeout(srv.timer);
      srv.timer = null;
      var r = srv.rec;
      srv.rec = null;
      if (r) {
        try {
          r.ondataavailable = null;
          r.onstop = null;
          r.onerror = null;
          if (r.state !== 'inactive') r.stop();
        } catch (e) {}
      }
      srvStopTracks();
      srv.chunks = [];
      if (srv.holding) {
        srv.holding = false;
        ui(false);
      }
      try { btn.classList.remove('ptt-active'); } catch (e2) {}
    }

    function srvDone() {
      srv.sending = false;
      try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (e) {}
      if (typeof opts.onBusy === 'function') opts.onBusy(false);
    }

    function srvFail(code) {
      srv.sid++;
      srvKill();
      srvDone();
      ui(false);
      if (typeof opts.onError === 'function') opts.onError(code);
    }

    function srvStart() {
      if (srv.holding || srv.sending) return;
      srv.holding = true;
      srv.chunks = [];
      var sid = ++srv.sid;
      ui(true);
      try { btn.classList.add('ptt-active'); } catch (e) {}
      srvOpenMic(sid, 0);
    }

    function srvOpenMic(sid, attempt) {
      if (sid !== srv.sid || !srv.holding) return;
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      }).then(function (stream) {
        if (sid !== srv.sid || !srv.holding) {
          try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
          return;
        }
        srv.stream = stream;
        var mime = pickRecorderMime();
        var r;
        try { r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e2) {
          srvFail('start-failed');
          return;
        }
        srv.mime = r.mimeType || mime || 'audio/webm';
        r.ondataavailable = function (ev) { if (ev.data && ev.data.size) srv.chunks.push(ev.data); };
        r.onerror = function () { if (sid === srv.sid) srvFail('start-failed'); };
        srv.rec = r;
        try { r.start(); } catch (e3) {
          srvFail('start-failed');
          return;
        }
        srv.startedAt = Date.now();
        var stOpen = document.getElementById(opts.statusId || 'alice-status');
        if (stOpen) stOpen.textContent = 'Grabando… tocá otra vez para enviar.';
      }).catch(function (err) {
        if (sid !== srv.sid || !srv.holding) return;
        var name = err && err.name;
        var denied = name === 'NotAllowedError' || name === 'SecurityError';
        if (!denied && attempt < 3) {
          clearTimeout(srv.timer);
          srv.timer = setTimeout(function () { srvOpenMic(sid, attempt + 1); }, 200);
          return;
        }
        srvFail(denied ? 'not-allowed' : 'audio-capture');
      });
    }

    function srvStop(send) {
      if (!srv.holding) return;
      var r = srv.rec;
      // Tap or the permission sheet lifts the finger before the recorder exists.
      if (send && !r) return;
      var heldMs = r ? (Date.now() - srv.startedAt) : 0;
      if (send && r && heldMs < 450) {
        var stEarly = document.getElementById(opts.statusId || 'alice-status');
        if (stEarly) stEarly.textContent = 'Grabando… tocá otra vez para enviar.';
        return;
      }
      srv.holding = false;
      clearTimeout(srv.timer);
      srv.timer = null;
      ui(false);
      try { btn.classList.remove('ptt-active'); } catch (e) {}
      srv.rec = null;
      if (!r) {
        srv.sid++;
        srvStopTracks();
        return;
      }
      if (!send) {
        try {
          r.ondataavailable = null;
          r.onstop = null;
          if (r.state !== 'inactive') r.stop();
        } catch (e2) {}
        srvStopTracks();
        srv.chunks = [];
        return;
      }
      srv.sending = true;
      try { btn.classList.add('ptt-busy'); } catch (e3) {}
      if (typeof opts.onBusy === 'function') opts.onBusy(true);
      r.onstop = function () {
        setTimeout(function () {
          var blob = new Blob(srv.chunks, { type: srv.mime || 'audio/webm' });
          srv.chunks = [];
          srvStopTracks();
          if (!blob.size || (blob.size < 800 && heldMs < 350)) {
            srvDone();
            if (typeof opts.onEmpty === 'function') opts.onEmpty();
            return;
          }
          srvUpload(blob);
        }, IS_PHONE ? 180 : 0);
      };
      try {
        if (r.state !== 'inactive') {
          try { if (typeof r.requestData === 'function') r.requestData(); } catch (eReq) {}
          r.stop();
        }
        else r.onstop();
      } catch (e4) {
        srvFail('start-failed');
      }
    }

    function srvUpload(blob) {
      var fd = new FormData();
      var m = srv.mime || '';
      var ext = m.indexOf('mp4') >= 0 ? 'm4a' : (m.indexOf('ogg') >= 0 ? 'ogg' : 'webm');
      fd.append('audio', blob, 'ptt.' + ext);
      fd.append('lang', sttLang(typeof opts.lang === 'function' ? opts.lang() : opts.lang));
      fd.append('tutor', String(opts.sttTutor || 'any'));
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
      infinityFetch('/alice/stt', { method: 'POST', body: fd, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) {
          if (!r.ok) {
            var e = new Error('stt_' + r.status);
            e.status = r.status;
            throw e;
          }
          return r.json();
        })
        .then(function (j) {
          clearTimeout(to);
          srvDone();
          var text = collapseCommittedText(String((j && j.text) || ''));
          if (text && typeof opts.normalizeTranscript === 'function') {
            try {
              var normed = opts.normalizeTranscript(text);
              text = normed == null ? '' : String(normed).trim();
            } catch (eNorm) { /* keep raw */ }
          }
          if (text && typeof opts.onSend === 'function') opts.onSend(text);
          else if (!text && typeof opts.onEmpty === 'function') opts.onEmpty();
        })
        .catch(function (err) {
          clearTimeout(to);
          srvDone();
          if (err && err.status === 422) {
            if (typeof opts.onEmpty === 'function') opts.onEmpty();
            return;
          }
          if (typeof opts.onError === 'function') opts.onError('interrupted');
        });
    }

    function clearRestartTimer() {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    function clearSendTimer() {
      clearTimeout(sendTimer);
      sendTimer = null;
    }

    function clearStopLockTimer() {
      clearTimeout(stopLockTimer);
      stopLockTimer = null;
    }

    function unlockStop() {
      stopLock = false;
      wantSend = false;
      clearStopLockTimer();
    }

    function armStopLockTimeout() {
      clearStopLockTimer();
      stopLockTimer = setTimeout(function () {
        syncTranscript();
        if (wantSend) flushSend();
        else {
          unlockStop();
          killRec(true);
          active = false;
          holding = false;
          ui(false);
        }
      }, STOP_LOCK_MS);
    }

    function failStartPermanent(code) {
      var wasHolding = holding;
      var switchToServer = SWITCH_TO_SERVER_ERRORS[code] && opts.stt !== 'browser' && serverSttCapable();
      clearRestartTimer();
      clearSendTimer();
      clearMaxHold();
      killRec(true);
      holding = false;
      active = false;
      wantSend = false;
      stopLock = false;
      restartFails = 0;
      clearStopLockTimer();
      ui(false);
      try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (e) {}
      if (switchToServer) {
        // The browser recognizer is unusable on this device — keep this same hold going on server STT.
        serverPreferred = true;
        committed = [];
        transcript = '';
        if (wasHolding) { srvStart(); return; }
        if (typeof opts.onError === 'function') opts.onError('interrupted');
        return;
      }
      if (typeof opts.onError === 'function') opts.onError(code || 'start-failed');
    }

    function commitFromEvent(ev) {
      if (!ev || !ev.results || !ev.results.length) return;
      for (var i = lastFinalCount; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          var part = String(ev.results[i][0].transcript || '').trim();
          if (part) commitPart(part);
          lastFinalCount = i + 1;
        }
      }
    }

    function normPart(s) {
      return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function commitPart(part) {
      var a = normPart(part);
      if (!a) return;
      var last = committed[committed.length - 1] || '';
      var b = normPart(last);
      if (!b) {
        committed.push(part);
        return;
      }
      // Exact duplicate across Chrome restart
      if (a === b) return;
      // New final already contained in previous final
      if (b.indexOf(a) >= 0 && a.length >= 2) return;
      // New final extends previous — keep the longer one
      if (a.indexOf(b) >= 0 && b.length >= 2) {
        committed[committed.length - 1] = part;
        return;
      }
      // Overlapping tail/head (common after continuous restart)
      var wordsA = a.split(' ');
      var wordsB = b.split(' ');
      var maxOverlap = Math.min(wordsA.length, wordsB.length, 6);
      for (var o = maxOverlap; o >= 2; o--) {
        var tail = wordsB.slice(-o).join(' ');
        var head = wordsA.slice(0, o).join(' ');
        if (tail === head) {
          var rest = wordsA.slice(o).join(' ');
          if (rest) committed.push(rest);
          return;
        }
      }
      committed.push(part);
    }

    function collapseCommittedText(text) {
      var t = String(text || '').replace(/\s+/g, ' ').trim();
      if (!t) return '';
      t = t.replace(/\b([\w']+)(?:\s+\1\b){2,}/gi, '$1');
      t = t.replace(/\b((?:[\w']+\s+){0,5}[\w']+)(?:\s+\1\b){2,}/gi, '$1');
      return t.replace(/\s+/g, ' ').trim();
    }

    function rebuildTranscript(ev) {
      commitFromEvent(ev);
      var base = committed.join(' ').replace(/\s+/g, ' ').trim();
      if (!ev || !ev.results || !ev.results.length) return base || transcript;
      var last = ev.results[ev.results.length - 1];
      if (last && !last.isFinal && last[0] && last[0].transcript) {
        var interim = String(last[0].transcript).trim();
        if (interim) return base ? (base + ' ' + interim).trim() : interim;
      }
      if (base) return base;
      for (var i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          var t = String(ev.results[i][0].transcript || '').trim();
          if (t) return t;
        }
      }
      return (last && last[0] && last[0].transcript) ? String(last[0].transcript).trim() : transcript;
    }

    function syncTranscript() {
      if (lastResults) transcript = rebuildTranscript(lastResults);
      else transcript = committed.join(' ').replace(/\s+/g, ' ').trim();
      return transcript;
    }

    function flushSend() {
      clearSendTimer();
      clearStopLockTimer();
      if (sent || !wantSend) {
        unlockStop();
        holding = false;
        active = false;
        ui(false);
        return;
      }
      var text = collapseCommittedText(syncTranscript().trim());
      transcript = '';
      committed = [];
      lastFinalCount = 0;
      lastResults = null;
      unlockStop();
      sent = true;
      holding = false;
      active = false;
      ui(false);
      if (text && typeof opts.normalizeTranscript === 'function') {
        try {
          var normed = opts.normalizeTranscript(text);
          if (normed == null) text = '';
          else if (String(normed).trim()) text = String(normed).trim();
          else text = '';
        } catch (eNorm) { /* keep raw */ }
      }
      if (text && typeof opts.onSend === 'function') opts.onSend(text);
      else if (!text && typeof opts.onEmpty === 'function') opts.onEmpty();
      setTimeout(function () { sent = false; }, 120);
    }

    function scheduleSend() {
      clearSendTimer();
      syncTranscript();
      var wait = SEND_WAIT_MS;
      if (transcript.length > 120) wait += 120;
      if (transcript.length > 400) wait += 180;
      sendTimer = setTimeout(flushSend, wait);
    }

    function killRec(abortOnly) {
      if (!rec) return;
      var r = rec;
      rec = null;
      try {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        if (abortOnly && typeof r.abort === 'function') r.abort();
        else if (typeof r.abort === 'function') r.abort();
        else r.stop();
      } catch (e) {}
    }

    function resetSession(cancelSend) {
      clearRestartTimer();
      clearSendTimer();
      clearStopLockTimer();
      clearMaxHold();
      killRec(true);
      active = false;
      holding = false;
      micLive = false;
      stopLock = false;
      restartFails = 0;
      if (cancelSend) wantSend = false;
      committed = [];
      lastFinalCount = 0;
      transcript = '';
      lastResults = null;
      ui(false);
    }

    function shouldKeepListening() {
      return holding && !wantSend;
    }

    function scheduleRestart(sid) {
      clearRestartTimer();
      var delay = Math.min(450, 160 + restartFails * 60);
      restartTimer = setTimeout(function () {
        restartTimer = null;
        if (sid !== sessionId || !shouldKeepListening()) return;
        if (!spawnRec(sid) && shouldKeepListening()) {
          restartFails++;
          scheduleRestart(sid);
        }
      }, delay);
    }

    function handleRecFinished(sid) {
      syncTranscript();
      rec = null;
      if (shouldKeepListening()) {
        restartFails = 0;
        scheduleRestart(sid);
        return;
      }
      if (wantSend) scheduleSend();
      else unlockStop();
    }

    function spawnRec(sid) {
      if (sid !== sessionId || !shouldKeepListening()) return false;

      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        failStartPermanent('no-sr');
        return false;
      }

      killRec(true);
      lastFinalCount = 0;
      lastResults = null;
      active = true;
      ui(true);

      var r = new SR();
      rec = r;
      r.lang = (typeof opts.lang === 'function') ? (opts.lang() || 'en-US') : (opts.lang || 'en-US');
      r.interimResults = true;
      r.continuous = true;
      r.onstart = function () {
        if (sid !== sessionId) return;
        micLive = true;
        micLiveAt = Date.now();
        var stOpen = document.getElementById(opts.statusId || 'alice-status');
        if (stOpen) stOpen.textContent = 'Grabando… tocá otra vez para enviar.';
      };
      r.onresult = function (ev) {
        if (sid !== sessionId) return;
        lastResults = ev;
        transcript = rebuildTranscript(ev);
      };
      r.onend = function () {
        if (sid !== sessionId) return;
        handleRecFinished(sid);
      };
      r.onerror = function (ev) {
        if (sid !== sessionId) return;
        if (ev && ev.error === 'aborted') return;
        var code = ev && ev.error;
        if (code === 'not-allowed') {
          failStartPermanent('not-allowed');
          return;
        }
        if (code === 'service-not-allowed') {
          failStartPermanent('service-not-allowed');
          return;
        }
        // no-speech, network, audio-capture: the finger is still down. Keep the take.
        if (shouldKeepListening()) {
          handleRecFinished(sid);
          return;
        }
        resetSession(false);
      };
      try {
        r.start();
        restartFails = 0;
        return true;
      } catch (err) {
        rec = null;
        active = false;
        if (shouldKeepListening()) return false;
        ui(false);
        if (typeof opts.onError === 'function') opts.onError('start-failed');
        return false;
      }
    }

    var maxHoldTimer = null;

    function clearMaxHold() {
      clearTimeout(maxHoldTimer);
      maxHoldTimer = null;
    }

    function stop(send) {
      if (!holding && !active && !rec && !wantSend && !sendTimer && !restartTimer && !stopLock) return;
      // Tap, or the permission sheet, lifts the finger before the mic is open.
      // Do not throw the take away. The next tap sends.
      if (send && holding && !stopLock) {
        if (!micLive && (Date.now() - pressAt) < 1500) return;
        if (micLive && (Date.now() - micLiveAt) < 450) return;
      }
      // Second release while finishing STT: force complete instead of ignoring (fixes frozen mic)
      if (send && stopLock) {
        clearRestartTimer();
        killRec(false);
        syncTranscript();
        flushSend();
        return;
      }

      holding = false;
      micLive = false;
      clearMaxHold();

      if (send) {
        stopLock = true;
        wantSend = true;
        armStopLockTimeout();
      } else {
        wantSend = false;
        clearSendTimer();
        clearStopLockTimer();
      }

      clearRestartTimer();
      active = false;
      ui(false);

      if (rec) {
        var r = rec;
        var sid = sessionId;
        r.onend = function () {
          if (sid !== sessionId) return;
          handleRecFinished(sid);
        };
        r.onerror = function (ev) {
          if (sid !== sessionId) return;
          if (ev && ev.error === 'aborted') {
            if (wantSend) scheduleSend();
            return;
          }
          handleRecFinished(sid);
        };
        try { r.stop(); } catch (e) {
          rec = null;
          handleRecFinished(sid);
        }
      } else if (send) {
        scheduleSend();
      } else {
        unlockStop();
      }
    }

    function start(e) {
      if (e) e.preventDefault();
      if (typeof opts.canStart === 'function' && !opts.canStart()) return;
      if (!srSupported) {
        failStartPermanent('no-sr');
        return;
      }

      sessionId++;
      clearMaxHold();
      pressAt = Date.now();
      micLive = false;
      resetSession(true);
      clearSendTimer();
      unlockStop();
      sent = false;
      holding = true;
      restartFails = 0;

      if (typeof opts.onBeforeStart === 'function') opts.onBeforeStart();

      var sid = sessionId;
      var settle = IS_PHONE ? 0 : (Number(opts.settleMs) || 0);
      if (settle > 0) {
        setTimeout(function () {
          if (sid !== sessionId || !shouldKeepListening()) return;
          if (!spawnRec(sid) && !shouldKeepListening()) holding = false;
        }, settle);
      } else if (!spawnRec(sid) && !shouldKeepListening()) {
        holding = false;
      }
    }

    function endPress(e) {
      // On a phone the finger lifts as soon as the tap ends. That lift must not
      // stop the take. The next tap sends.
      if (IS_PHONE) return;
      if (downPointerId == null) return;
      if (e && e.pointerId != null && e.type !== 'touchend' && e.pointerId !== downPointerId) return;
      if (e && e.type === 'touchend' && e.touches && e.touches.length > 0) return;
      downPointerId = null;
      if (srv.holding) { srvStop(true); return; }
      stop(true);
    }

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.cancelable) e.preventDefault();
      downPointerId = e.pointerId;
      try { btn.setPointerCapture(e.pointerId); } catch (e2) {}
      if (useServer()) {
        if (srv.sending) { downPointerId = null; return; }
        if (srv.holding && srv.rec && (Date.now() - srv.startedAt) >= 450) {
          srvStop(true);
          return;
        }
        if (srv.holding) return;
        if (typeof opts.canStart === 'function' && !opts.canStart()) { downPointerId = null; return; }
        if (typeof opts.onBeforeStart === 'function') opts.onBeforeStart();
        srvStart();
        return;
      }
      if (holding && micLive && (Date.now() - micLiveAt) >= 450) {
        stop(true);
        return;
      }
      start(e);
      if (!holding && !srv.holding) downPointerId = null;
    }

    function onPointerUp(e) {
      try { btn.releasePointerCapture(e.pointerId); } catch (e2) {}
      endPress(e);
    }

    function onWindowPointerUp(e) { endPress(e); }
    function onWindowTouchEnd(e) { endPress(e); }

    // Long-press fires pointercancel / lostpointercapture while the finger is still down.
    // Those must not end PTT. Release is pointerup or touchend only.

    function blockBrowserHoldGesture(e) { e.preventDefault(); }

    btn.setAttribute('draggable', 'false');
    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('pointerup', onPointerUp);
    btn.addEventListener('contextmenu', blockBrowserHoldGesture);
    btn.addEventListener('dragstart', blockBrowserHoldGesture);
    document.addEventListener('pointerup', onWindowPointerUp, true);
    document.addEventListener('touchend', onWindowTouchEnd, true);

    var inst = {
      stop: function (send) {
        if (srv.holding) { srvStop(!!send); return; }
        stop(!!send);
      },
      reset: function () {
        sessionId++;
        downPointerId = null;
        clearMaxHold();
        resetSession(true);
        unlockStop();
        sent = false;
        if (srv.holding) { srv.sid++; srvKill(); }
        try { btn.classList.remove('ptt-active'); } catch (eCls) {}
        if (!srv.sending) {
          try { btn.classList.remove('ptt-busy'); } catch (eCls1) {}
        }
      },
      destroy: function () {
        sessionId++;
        downPointerId = null;
        clearMaxHold();
        resetSession(true);
        srv.sid++;
        srvKill();
        document.removeEventListener('pointerup', onWindowPointerUp, true);
        document.removeEventListener('touchend', onWindowTouchEnd, true);
        btn.removeEventListener('pointerdown', onPointerDown);
        btn.removeEventListener('pointerup', onPointerUp);
        btn.removeEventListener('contextmenu', blockBrowserHoldGesture);
        btn.removeEventListener('dragstart', blockBrowserHoldGesture);
        delInst(btn);
        btn._pttBound = false;
        try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (eCls2) {}
      }
    };
    setInst(btn, inst);
    btn._pttBound = true;
    return inst;
  }

  function stop(btn) {
    var b = typeof btn === 'string' ? document.getElementById(btn) : btn;
    var inst = b && getInst(b);
    if (inst) inst.stop(false);
  }

  function reset(btn) {
    var b = typeof btn === 'string' ? document.getElementById(btn) : btn;
    var inst = b && getInst(b);
    if (inst && inst.reset) inst.reset();
  }

  function destroy(btn) {
    var b = typeof btn === 'string' ? document.getElementById(btn) : btn;
    var inst = b && getInst(b);
    if (inst && inst.destroy) inst.destroy();
    else if (b) {
      try { b.classList.remove('ptt-busy', 'ptt-active'); } catch (e) {}
      b._pttBound = false;
    }
  }

  function stopAll() {
    document.querySelectorAll('[data-ptt-mic], [id$="-mic-btn"]').forEach(function (b) {
      var inst = getInst(b);
      if (inst) inst.stop(false);
    });
  }

  function resetAll() {
    document.querySelectorAll('[data-ptt-mic], [id$="-mic-btn"]').forEach(function (b) {
      var inst = getInst(b);
      if (inst && inst.reset) inst.reset();
    });
  }

  function destroyAll() {
    document.querySelectorAll('[data-ptt-mic], [id$="-mic-btn"]').forEach(function (b) {
      destroy(b);
    });
  }

  return { bind: bind, stop: stop, reset: reset, destroy: destroy, stopAll: stopAll, resetAll: resetAll, destroyAll: destroyAll };
})();
