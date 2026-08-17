/**
 * Kamuk Holdings CRM — Call feature (separate from desk tabs).
 * Realtime simulated client call via one private ElevenLabs Agent.
 * Never dials a real telephone number. Never exposes ELEVENLABS_KEY.
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

  function setStatus(text) {
    const node = document.querySelector('#call-console .call-status');
    if (node) node.textContent = text;
  }

  function setMood(mood) {
    if ($('call-mood')) $('call-mood').textContent = mood || '—';
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
      await session.api('/infinity-holdings/crm/case/event', {
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
      },
      onModeChange: (mode) => {
        if (mode?.mode === 'speaking') setStatus('Client speaking');
        if (mode?.mode === 'listening') setStatus('Listening');
      }
    });
  }

  async function startPreviewFallback() {
    setStatus('Preview · simulated audio');
    startedAt = Date.now();
    timer = setInterval(tickDuration, 1000);
    const opening = session.client?.clientStatement
      || session.dynamicFirstMessage
      || 'I need this resolved today.';
    pushTurn('agent', opening);
    await postEvent('call-start', {
      conversationId: `PREVIEW-${Date.now()}`,
      mood: session.mood,
      at: new Date().toISOString()
    });
  }

  async function start(context) {
    await end(true);
    session = context || {};
    transcript = [];
    muted = false;
    conversation = null;
    renderTranscript();
    setMood(session.mood || session.personality?.baselineMood || 'neutral');
    if ($('call-client-name')) $('call-client-name').textContent = session.client?.name || 'Client';
    $('call-console')?.classList.add('open');
    setStatus('Connecting…');

    if (session.preview) {
      await startPreviewFallback();
      session.toast?.('Preview call open. Live ElevenLabs voice requires desk authentication and agent configuration.');
      return;
    }

    try {
      const token = await session.api('/infinity-holdings/crm/call/token', {
        method: 'POST',
        body: { caseId: session.caseId }
      });
      if (!token.voiceAvailable || !token.signedUrl) {
        throw Object.assign(new Error(token.error || 'Voice is not configured'), { code: token.code || 'VOICE_NOT_CONFIGURED' });
      }
      session.dynamicFirstMessage = token.firstMessage;
      setMood(token.client?.mood || session.mood);
      await postEvent('call-start', {
        conversationId: '',
        mood: token.client?.mood || session.mood,
        at: new Date().toISOString()
      });
      await startRealtime(token.signedUrl, token.dynamicVariables || {});
      session.toast?.('Client call connected.');
    } catch (error) {
      const code = error.code || '';
      if (code === 'VOICE_NOT_CONFIGURED' || /not configured/i.test(error.message || '')) {
        setStatus('Voice unavailable');
        $('call-transcript').innerHTML = '<p>Simulated voice is not configured on this desk. The case remains fully usable — notes, email and resolution still work.</p>';
        session.toast?.(error.message || 'Voice is not configured for this desk.', true);
        return;
      }
      if (error.message === 'VOICE_SDK_UNAVAILABLE') {
        setStatus('Voice client unavailable');
        await startPreviewFallback();
        session.toast?.('Live voice client could not load. Using desk transcript mode.', true);
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
        mood: $('call-mood')?.textContent || session.mood,
        outcome: 'ended',
        transcript,
        summary: transcript.slice(0, 4).map((t) => t.text).join(' · '),
        at: new Date().toISOString()
      });
      session.recordLocal?.('client-call', 'Client call completed', `Duration ${durationSec}s · ${transcript.length} turns`);
      session.toast?.('Call ended and logged to the case.');
    }
    setStatus('Ended');
    startedAt = null;
    $('call-console')?.classList.remove('open');
    session = null;
  }

  function toggleMute() {
    muted = !muted;
    try {
      if (conversation && typeof conversation.setMicMuted === 'function') conversation.setMicMuted(muted);
    } catch (_) { /* ignore */ }
    const btn = $('call-mute');
    if (btn) btn.innerHTML = muted
      ? '<i class="ti ti-microphone-off"></i> Unmute'
      : '<i class="ti ti-microphone"></i> Mute';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('call-hangup')?.addEventListener('click', (event) => {
      event.preventDefault();
      hangup();
    });
    $('call-mute')?.addEventListener('click', toggleMute);
  });

  window.KamukHoldingsCall = { start, hangup, end };
})();
