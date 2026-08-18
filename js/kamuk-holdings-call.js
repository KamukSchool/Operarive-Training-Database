/**
 * Kamuk Holdings CRM — scripted client calls.
 * ElevenLabs TTS with Nexora voice IDs. Mood follows service quality.
 * Never dials a real telephone. Never exposes ELEVENLABS_KEY.
 * Nexora Lab stays a separate product.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let session = null;
  let conversation = null;
  let muted = false;
  let startedAt = null;
  let transcript = [];
  let timer = null;
  let audio = null;
  let mood = 'neutral';
  let score = 40;
  let voiceId = '';

  function setStatus(text) {
    const node = document.querySelector('#call-console .call-status');
    if (node) node.textContent = text;
  }

  function setMood(next) {
    mood = next || mood;
    if ($('call-mood')) $('call-mood').textContent = mood || '—';
  }

  function setCoach(missing) {
    const node = $('call-coach');
    if (!node) return;
    if (!missing || !missing.length) {
      node.textContent = '';
      node.classList.add('hidden');
      return;
    }
    node.classList.remove('hidden');
    node.textContent = 'El cliente cambió: ' + missing.join(' · ');
  }

  function renderTranscript() {
    const root = $('call-transcript');
    if (!root) return;
    if (!transcript.length) {
      root.innerHTML = '<p>Waiting for the client to answer…</p>';
      return;
    }
    root.innerHTML = transcript.map((turn) => (
      `<div class="call-turn ${esc(turn.role)}"><strong>${esc(turn.role === 'agent' ? 'Client' : 'You')}</strong><p>${esc(turn.text)}</p></div>`
    )).join('');
    root.scrollTop = root.scrollHeight;
  }

  function pushTurn(role, text) {
    if (!text) return;
    transcript.push({ role, text, at: new Date().toISOString() });
    renderTranscript();
  }

  async function postEvent(type, payload) {
    if (!session || session.preview || typeof session.api !== 'function') return;
    try {
      await session.api(session.path('/case/event'), {
        method: 'POST',
        body: { caseId: session.caseId, type, payload }
      });
    } catch (_) { /* desk keeps working offline */ }
  }

  function tickDuration() {
    if (!startedAt) return;
    const sec = Math.floor((Date.now() - startedAt) / 1000);
    const node = document.querySelector('#call-console .call-status');
    if (node && session) node.textContent = `Connected · ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }

  function stopAudio() {
    if (!audio) return;
    try { audio.pause(); } catch (_) { /* ignore */ }
    if (audio.src && String(audio.src).indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(audio.src); } catch (_) { /* ignore */ }
    }
    audio = null;
  }

  async function playClientAudio(text) {
    if (!text || muted || session?.preview) return;
    const token = session.authToken || (typeof InfinityAuth !== 'undefined' && InfinityAuth.token);
    const apiRoot = session.apiRoot || (typeof INFINITY_API !== 'undefined' ? INFINITY_API : '');
    if (!token || !apiRoot) return;
    try {
      stopAudio();
      const res = await fetch(apiRoot + session.path('/call/tts'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: session.caseId, text, voiceId })
      });
      if (!res.ok) return;
      const blob = await res.blob();
      audio = new Audio(URL.createObjectURL(blob));
      await audio.play().catch(() => null);
    } catch (_) { /* keep the transcript */ }
  }

  async function loadSdk() {
    if (window.ElevenLabsClient?.Conversation) return window.ElevenLabsClient.Conversation;
    if (window.Conversation) return window.Conversation;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kh-eleven]');
      if (existing) {
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@0.1.7/dist/lib.umd.js';
      script.async = true;
      script.dataset.khEleven = '1';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }).catch(() => null);
    return window.ElevenLabsClient?.Conversation || window.Conversation || null;
  }

  async function startRealtime(signedUrl, dynamicVariables) {
    const Conversation = await loadSdk();
    if (!Conversation || typeof Conversation.startSession !== 'function') {
      throw new Error('VOICE_SDK_UNAVAILABLE');
    }
    conversation = await Conversation.startSession({
      signedUrl,
      dynamicVariables,
      onConnect: () => {
        setStatus('Connected');
        startedAt = Date.now();
        timer = setInterval(tickDuration, 1000);
      },
      onDisconnect: () => { setStatus('Ended'); },
      onError: (error) => {
        setStatus('Voice error');
        session?.toast?.(error?.message || 'Call audio interrupted', true);
      },
      onMessage: (message) => {
        const role = message?.source === 'user' || message?.role === 'user' ? 'user' : 'agent';
        const text = message?.message || message?.text || message?.content || '';
        pushTurn(role, text);
        if (role === 'user') sendScriptTurn(text, true);
      },
      onModeChange: (mode) => {
        if (mode?.mode === 'speaking') setStatus('Client speaking');
        if (mode?.mode === 'listening') setStatus('Listening');
      }
    });
  }

  function localOpening() {
    return session.firstMessage
      || session.client?.clientStatement
      || 'This is the third time I call. I need this resolved today.';
  }

  async function startPreviewFallback(opening) {
    setStatus('Preview · simulated audio');
    startedAt = Date.now();
    timer = setInterval(tickDuration, 1000);
    pushTurn('agent', opening || localOpening());
    await postEvent('call-start', {
      conversationId: `PREVIEW-${Date.now()}`,
      mood,
      at: new Date().toISOString()
    });
  }

  async function sendScriptTurn(text, fromVoice) {
    const spoken = String(text || '').trim();
    if (!spoken) return;
    if (!fromVoice) pushTurn('user', spoken);
    if (session.preview) {
      const lower = spoken.toLowerCase();
      const good = /understand|you mentioned|i will/.test(lower) && /(today|p\.m\.|a\.m\.)/.test(lower);
      const next = good ? 'calming' : (/\bpin\b/.test(lower) ? 'furious' : 'impatient');
      setMood(next);
      const reply = good
        ? 'That is the first useful update. Confirm the next step and do not miss the time.'
        : 'Who owns this, and when do I get a real update?';
      pushTurn('agent', reply);
      setCoach(good ? [] : ['AMR Acknowledge → Mirror → Respond with a clock time. Never ask for a PIN.']);
      return;
    }
    try {
      const turn = await session.api(session.path('/call/turn'), {
        method: 'POST',
        body: { caseId: session.caseId, text: spoken, mood, score }
      });
      setMood(turn.mood);
      score = Number(turn.score) || score;
      setCoach(turn.coaching);
      pushTurn('agent', turn.reply);
      await playClientAudio(turn.reply);
      if (turn.done) session.toast?.('Client calmed. Document the AMR note and Formato E email.');
    } catch (error) {
      session.toast?.(error.message || 'Could not continue the call.', true);
    }
  }

  async function start(context) {
    await end(true);
    session = context || {};
    session.path = session.path || ((suffix) => (session.product === 'kamuk' ? '/kamuk-holdings/crm' : '/infinity-holdings/crm') + suffix);
    transcript = [];
    muted = false;
    conversation = null;
    score = 40;
    voiceId = session.personality?.voiceId || '';
    renderTranscript();
    setMood(session.mood || session.personality?.baselineMood || 'neutral');
    setCoach([]);
    if ($('call-client-name')) $('call-client-name').textContent = session.client?.name || 'Client';
    if ($('call-reply-txt')) $('call-reply-txt').value = '';
    $('call-console')?.classList.add('open');
    setStatus('Connecting…');

    if (session.preview) {
      await startPreviewFallback();
      session.toast?.('Preview call. Live ElevenLabs / Nexora voices require desk login.');
      return;
    }

    try {
      const token = await session.api(session.path('/call/token'), {
        method: 'POST',
        body: { caseId: session.caseId }
      });
      session.firstMessage = token.firstMessage;
      voiceId = token.voiceId || voiceId;
      score = Number(token.score) || 40;
      setMood(token.mood || token.client?.mood || mood);
      await postEvent('call-start', {
        conversationId: '',
        mood,
        at: new Date().toISOString()
      });
      pushTurn('agent', token.firstMessage || localOpening());
      startedAt = Date.now();
      timer = setInterval(tickDuration, 1000);
      setStatus('Connected');
      await playClientAudio(token.firstMessage);
      if (token.convaiAvailable && token.signedUrl) {
        try { await startRealtime(token.signedUrl, token.dynamicVariables || {}); } catch (_) { /* scripted path stays up */ }
      }
      session.toast?.('Client on the line. AMR in English — mood follows your service.');
    } catch (error) {
      if (/Internal-only|NO_CLIENT_CALL/i.test(error.message || error.code || '')) {
        setStatus('No client call');
        $('call-transcript').innerHTML = '<p>Internal-only case. Do not contact the client. File the report and escalate.</p>';
        session.toast?.(error.message || 'Do not call this client.', true);
        return;
      }
      setStatus('Call failed');
      session.toast?.(error.message || 'Could not start the call.', true);
    }
  }

  async function hangup() {
    await end(false);
  }

  async function end(silent) {
    if (timer) { clearInterval(timer); timer = null; }
    stopAudio();
    const durationSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    try {
      if (conversation) {
        if (typeof conversation.endSession === 'function') await conversation.endSession();
        else if (typeof conversation.close === 'function') conversation.close();
      }
    } catch (_) { /* hang up anyway */ }
    conversation = null;

    if (session && !silent) {
      await postEvent('call-end', {
        conversationId: session.conversationId || '',
        durationSec,
        mood,
        outcome: 'ended',
        transcript,
        summary: transcript.slice(0, 4).map((t) => t.text).join(' · '),
        at: new Date().toISOString()
      });
      session.recordLocal?.('client-call', 'Client call completed', `Duration ${durationSec}s · mood ${mood} · ${transcript.length} turns`);
      session.toast?.('Call ended and logged to the case.');
    }
    setStatus('Ended');
    startedAt = null;
    $('call-console')?.classList.remove('open');
    session = null;
  }

  function toggleMute() {
    muted = !muted;
    stopAudio();
    try {
      if (conversation && typeof conversation.setMicMuted === 'function') conversation.setMicMuted(muted);
    } catch (_) { /* ignore */ }
    const btn = $('call-mute');
    if (btn) btn.innerHTML = muted
      ? '<i class="ti ti-microphone-off"></i> Unmute'
      : '<i class="ti ti-microphone"></i> Mute';
  }

  function bindReply() {
    $('call-send')?.addEventListener('click', (event) => {
      event.preventDefault();
      const box = $('call-reply-txt');
      const text = box ? box.value.trim() : '';
      if (!text) return;
      box.value = '';
      sendScriptTurn(text, false);
    });
    $('call-reply-txt')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        $('call-send')?.click();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('call-hangup')?.addEventListener('click', (event) => {
      event.preventDefault();
      hangup();
    });
    $('call-mute')?.addEventListener('click', toggleMute);
    bindReply();
  });

  window.KamukHoldingsCall = { start, hangup, end };
})();
