/**
 * Alice Stable Mic — hold-to-speak with MediaRecorder + server STT (Whisper/Scribe).
 * Replaces fragile browser SpeechRecognition for Alice (the product voice).
 * Falls back to PttMic (Web Speech) only if MediaRecorder/getUserMedia unavailable.
 */
var AliceStableMic = (function () {
  'use strict';

  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function pickMime() {
    var candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return '';
  }

  function canUse() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  function bind(opts) {
    var btn = typeof opts.btn === 'string' ? document.getElementById(opts.btn) : opts.btn;
    if (!btn) return null;
    if (!canUse()) return null;

    var prev = instances && instances.get(btn);
    if (prev && prev.destroy) prev.destroy();

    var media = null;
    var stream = null;
    var chunks = [];
    var mime = '';
    var holding = false;
    var sending = false;
    var pointerId = null;
    var maxHoldTimer = null;
    var sessionId = 0;
    var live = false;
    var liveAt = 0;
    var statusId = opts.statusId || 'alice-status';
    var MAX_HOLD_MS = Number(opts.maxHoldMs) || 90000;

    function setUi(listening) {
      try { btn.classList.toggle('ptt-active', !!listening); } catch (e) {}
      if (typeof opts.onUi === 'function') opts.onUi(!!listening, btn);
    }

    function clearMaxHold() {
      clearTimeout(maxHoldTimer);
      maxHoldTimer = null;
    }

    function stopTracks() {
      if (!stream) return;
      try {
        stream.getTracks().forEach(function (t) { t.stop(); });
      } catch (e) {}
      stream = null;
    }

    function killRecorder() {
      clearMaxHold();
      live = false;
      if (media) {
        try {
          media.ondataavailable = null;
          media.onstop = null;
          media.onerror = null;
          if (media.state === 'recording' || media.state === 'paused') media.stop();
        } catch (e) {}
      }
      media = null;
      stopTracks();
    }

    function fail(code) {
      holding = false;
      live = false;
      sending = false;
      killRecorder();
      setUi(false);
      try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (e) {}
      if (typeof opts.onError === 'function') opts.onError(code || 'start-failed');
    }

    async function startHold(ev) {
      if (holding || sending) return;
      if (typeof opts.canStart === 'function' && !opts.canStart()) return;
      if (ev && ev.pointerId != null) {
        pointerId = ev.pointerId;
        try { btn.setPointerCapture(pointerId); } catch (eCap) {}
      }
      holding = true;
      live = false;
      liveAt = 0;
      chunks = [];
      sessionId += 1;
      var mySession = sessionId;
      setUi(true);
      if (typeof opts.onBeforeStart === 'function') opts.onBeforeStart();

      var micTries = 0;
      while (!stream && holding && mySession === sessionId && micTries < 4) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (eMic) {
          micTries++;
          var denied = eMic && (eMic.name === 'NotAllowedError' || eMic.name === 'SecurityError');
          if (!holding || mySession !== sessionId) return;
          if (denied || micTries >= 4) {
            fail(denied ? 'not-allowed' : 'audio-capture');
            return;
          }
          await new Promise(function (resume) { setTimeout(resume, 200); });
        }
      }
      if (!stream || !holding || mySession !== sessionId) {
        stopTracks();
        if (holding && mySession === sessionId) fail('audio-capture');
        return;
      }

      mime = pickMime();
      try {
        media = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch (eRec) {
        fail('start-failed');
        return;
      }
      mime = media.mimeType || mime || 'audio/webm';
      media.ondataavailable = function (ev2) {
        if (ev2.data && ev2.data.size) chunks.push(ev2.data);
      };
      media.onerror = function () { fail('start-failed'); };
      try {
        media.start();
      } catch (eStart) {
        fail('start-failed');
        return;
      }
      live = true;
      liveAt = Date.now();
      clearMaxHold();
      maxHoldTimer = setTimeout(function () {
        if (holding) endHold(true);
      }, MAX_HOLD_MS);
      var stOpen = document.getElementById(statusId);
      if (stOpen) stOpen.textContent = 'Grabando… tocá otra vez para enviar.';
    }

    function endHold(fromTimer) {
      if (!holding) return;
      // Finger up before the recorder exists (tap, or the permission sheet).
      // Keep the open going. A later tap sends.
      if (!live) return;
      if (!fromTimer && (Date.now() - liveAt) < 450) {
        var stEarly = document.getElementById(statusId);
        if (stEarly) stEarly.textContent = 'Grabando… tocá otra vez para enviar.';
        return;
      }
      var recordedMs = Date.now() - liveAt;
      holding = false;
      live = false;
      clearMaxHold();
      setUi(false);
      var rec = media;
      media = null;
      if (!rec) {
        stopTracks();
        return;
      }
      sending = true;
      try { btn.classList.add('ptt-busy'); } catch (eB) {}
      if (typeof opts.onUi === 'function') {
        opts.onUi(false, btn);
      }
      var st = document.getElementById(statusId);
      if (st) st.textContent = fromTimer
        ? (opts.timeoutText || 'Tope de tiempo — transcribiendo…')
        : (opts.busyText || 'Transcribiendo con Alice STT…');

      rec.onstop = function () {
        var blob = new Blob(chunks, { type: mime || 'audio/webm' });
        chunks = [];
        stopTracks();
        if (!blob.size || (blob.size < 800 && recordedMs < 350)) {
          sending = false;
          try { btn.classList.remove('ptt-busy'); } catch (e1) {}
          if (typeof opts.onEmpty === 'function') opts.onEmpty();
          else if (st) st.textContent = 'No se escuchó audio — mantené más tiempo o hablá más cerca.';
          return;
        }
        uploadBlob(blob);
      };
      try {
        if (rec.state === 'recording' || rec.state === 'paused') {
          try { if (typeof rec.requestData === 'function') rec.requestData(); } catch (eReq) {}
          rec.stop();
        } else rec.onstop();
      } catch (eStop) {
        sending = false;
        try { btn.classList.remove('ptt-busy'); } catch (e2) {}
        fail('start-failed');
      }
    }

    function uploadBlob(blob) {
      var fd = new FormData();
      var ext = (mime || '').indexOf('mp4') >= 0 ? 'm4a' : 'webm';
      fd.append('audio', blob, 'alice-ptt.' + ext);
      fd.append('lang', 'en');
      if (opts.tutor) fd.append('tutor', String(opts.tutor));
      var fetchFn = typeof infinityFetch === 'function' ? infinityFetch : fetch;
      var headers = typeof authHeaders === 'function' ? authHeaders() : {};
      // FormData: do not set Content-Type (boundary)
      var hdr = {};
      Object.keys(headers || {}).forEach(function (k) {
        if (String(k).toLowerCase() !== 'content-type') hdr[k] = headers[k];
      });
      fetchFn('/alice/stt', { method: 'POST', headers: hdr, body: fd })
        .then(function (r) {
          if (!r.ok) throw new Error('stt_' + r.status);
          return r.json();
        })
        .then(function (j) {
          var text = String((j && j.text) || '').replace(/\s+/g, ' ').trim();
          if (typeof opts.normalizeTranscript === 'function') {
            try {
              var n = opts.normalizeTranscript(text);
              if (n == null) text = '';
              else text = String(n).trim();
            } catch (eN) { /* keep */ }
          }
          sending = false;
          try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (e3) {}
          var st2 = document.getElementById(statusId);
          if (st2) st2.textContent = '';
          if (text && typeof opts.onSend === 'function') opts.onSend(text);
          else if (!text && typeof opts.onEmpty === 'function') opts.onEmpty();
          else if (!text && st2) st2.textContent = opts.unclearText || 'No se entendió — intentá de nuevo o escribí.';
        })
        .catch(function (err) {
          sending = false;
          try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (e4) {}
          var code = 'network';
          var msg = String((err && err.message) || '');
          if (msg.indexOf('stt_401') >= 0) code = 'not-allowed';
          if (msg.indexOf('stt_403') >= 0) code = 'service-not-allowed';
          if (msg.indexOf('stt_503') >= 0 || msg.indexOf('stt_422') >= 0) code = 'start-failed';
          if (typeof opts.onError === 'function') opts.onError(code);
        });
    }

    function endPress(ev) {
      if (pointerId == null) return;
      if (ev && ev.pointerId != null && ev.type !== 'touchend' && ev.pointerId !== pointerId) return;
      if (ev && ev.type === 'touchend' && ev.touches && ev.touches.length > 0) return;
      pointerId = null;
      endHold(false);
    }

    function onPointerDown(ev) {
      if (ev.button != null && ev.button !== 0) return;
      if (holding && live && (Date.now() - liveAt) >= 450) {
        if (ev.cancelable) ev.preventDefault();
        endHold(false);
        return;
      }
      if (ev.cancelable) ev.preventDefault();
      startHold(ev);
    }
    function onPointerUp(ev) { endPress(ev); }
    function onWindowPointerUp(ev) { endPress(ev); }
    function onWindowTouchEnd(ev) { endPress(ev); }
    function blockBrowserHoldGesture(ev) { ev.preventDefault(); }

    btn.style.touchAction = 'none';
    btn.style.webkitTouchCallout = 'none';
    btn.style.webkitUserSelect = 'none';
    btn.style.userSelect = 'none';
    btn.setAttribute('draggable', 'false');
    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('pointerup', onPointerUp);
    btn.addEventListener('contextmenu', blockBrowserHoldGesture);
    btn.addEventListener('dragstart', blockBrowserHoldGesture);
    document.addEventListener('pointerup', onWindowPointerUp, true);
    document.addEventListener('touchend', onWindowTouchEnd, true);
    btn._aliceStableBound = true;

    var api = {
      destroy: function () {
        holding = false;
        pointerId = null;
        killRecorder();
        document.removeEventListener('pointerup', onWindowPointerUp, true);
        document.removeEventListener('touchend', onWindowTouchEnd, true);
        btn.removeEventListener('pointerdown', onPointerDown);
        btn.removeEventListener('pointerup', onPointerUp);
        btn.removeEventListener('contextmenu', blockBrowserHoldGesture);
        btn.removeEventListener('dragstart', blockBrowserHoldGesture);
        btn._aliceStableBound = false;
        if (instances) instances.delete(btn);
      },
      stop: function () {
        if (holding) endHold(false);
        else killRecorder();
      }
    };
    if (instances) instances.set(btn, api);
    return api;
  }

  return { bind: bind, canUse: canUse };
})();
