/**
 * Push-to-Talk mic — hold to speak, release to send.
 * Waits for speech recognition to finish before sending (no half words).
 * Auto-restarts recognition while the button is held so long answers are not lost.
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
    var srSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    btn.style.touchAction = 'none';
    btn.style.webkitTouchCallout = 'none';
    btn.style.webkitUserSelect = 'none';
    btn.style.userSelect = 'none';

    function ui(listening) {
      if (typeof opts.onUi === 'function') opts.onUi(listening, btn);
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
      restartTimer = setTimeout(function () {
        restartTimer = null;
        if (sid !== sessionId || !shouldKeepListening()) return;
        if (!spawnRec(sid)) {
          restartFails++;
          if (restartFails >= MAX_RESTART_FAILS) failStartPermanent('restart-failed');
        }
      }, RESTART_MS);
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
        if (ev && FATAL_ERRORS[ev.error]) {
          failStartPermanent(ev.error);
          return;
        }
        if (ev && RECOVERABLE_ERRORS[ev.error]) {
          handleRecFinished(sid);
          return;
        }
        if (!shouldKeepListening()) {
          resetSession(false);
          return;
        }
        restartFails++;
        if (restartFails >= MAX_RESTART_FAILS) failStartPermanent(ev && ev.error ? ev.error : 'recognition-error');
        else handleRecFinished(sid);
      };
      try {
        r.start();
        restartFails = 0;
        return true;
      } catch (err) {
        rec = null;
        active = false;
        if (shouldKeepListening()) {
          restartFails++;
          if (restartFails >= MAX_RESTART_FAILS) {
            failStartPermanent('start-failed');
            return false;
          }
          scheduleRestart(sid);
          return false;
        }
        ui(false);
        if (typeof opts.onError === 'function') opts.onError('start-failed');
        return false;
      }
    }

    var maxHoldTimer = null;
    var MAX_HOLD_MS = Number(opts.maxHoldMs) || 45000;

    function clearMaxHold() {
      clearTimeout(maxHoldTimer);
      maxHoldTimer = null;
    }

    function stop(send) {
      if (!holding && !active && !rec && !wantSend && !sendTimer && !restartTimer && !stopLock) return;
      // Second release while finishing STT: force complete instead of ignoring (fixes frozen mic)
      if (send && stopLock) {
        clearRestartTimer();
        killRec(false);
        syncTranscript();
        flushSend();
        return;
      }

      holding = false;
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
      resetSession(true);
      clearSendTimer();
      unlockStop();
      sent = false;
      holding = true;
      restartFails = 0;

      if (typeof opts.onBeforeStart === 'function') opts.onBeforeStart();

      var sid = sessionId;
      maxHoldTimer = setTimeout(function () {
        if (sid !== sessionId) return;
        if (holding || active || rec) stop(true);
      }, MAX_HOLD_MS);

      var settle = Number(opts.settleMs) || 0;
      if (settle > 0) {
        setTimeout(function () {
          if (sid !== sessionId || !shouldKeepListening()) return;
          if (!spawnRec(sid) && !shouldKeepListening()) holding = false;
        }, settle);
      } else if (!spawnRec(sid) && !shouldKeepListening()) {
        holding = false;
      }
    }

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { btn.setPointerCapture(e.pointerId); } catch (e2) {}
      start(e);
    }

    function onPointerUp(e) {
      try { btn.releasePointerCapture(e.pointerId); } catch (e2) {}
      stop(true);
    }

    function onPointerCancel() {
      stop(true);
    }

    function onLostPointerCapture() {
      if (holding || active || rec) stop(true);
    }

    function onPointerLeave(e) {
      // Touch: only pointerup ends the take — leaving the button must not cut off speech.
      if (isTouchPointer(e)) return;
      if (holding && e.pointerType === 'mouse') stop(true);
    }

    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('pointerup', onPointerUp);
    btn.addEventListener('pointercancel', onPointerCancel);
    btn.addEventListener('lostpointercapture', onLostPointerCapture);
    btn.addEventListener('pointerleave', onPointerLeave);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var inst = {
      stop: function (send) { stop(!!send); },
      reset: function () {
        sessionId++;
        clearMaxHold();
        resetSession(true);
        unlockStop();
        sent = false;
        try { btn.classList.remove('ptt-busy', 'ptt-active'); } catch (eCls) {}
      },
      destroy: function () {
        sessionId++;
        clearMaxHold();
        resetSession(true);
        btn.removeEventListener('pointerdown', onPointerDown);
        btn.removeEventListener('pointerup', onPointerUp);
        btn.removeEventListener('pointercancel', onPointerCancel);
        btn.removeEventListener('lostpointercapture', onLostPointerCapture);
        btn.removeEventListener('pointerleave', onPointerLeave);
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
