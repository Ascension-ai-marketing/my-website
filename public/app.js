// Booking form: loads open slots, books a call, and shows the result. SOP: architecture/site.md
(() => {
  const TZ = 'America/Toronto';
  const UNAVAILABLE = 'Booking is temporarily unavailable. Please try again in a few minutes.';
  const $ = (id) => document.getElementById(id);

  const dayLabel = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'short' });
  const dateLabel = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: 'short', day: 'numeric' });
  const timeLabel = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const dayName = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
  const fullLabel = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const state = { byDay: new Map(), day: null, slot: null };

  // The logo is optional: show it only once it has loaded.
  const logo = $('hero-logo');
  const logoImg = logo?.querySelector('img');
  if (logoImg) {
    const show = () => {
      logo.hidden = false;
      $('hero-grid').classList.remove('no-logo');
    };
    if (logoImg.complete && logoImg.naturalWidth > 0) show();
    else logoImg.addEventListener('load', show, { once: true });
  }

  function setPickerMessage(text) {
    $('picker-message').textContent = text;
    $('picker-message').hidden = !text;
  }

  // 404 means booking is switched off on the live site; anything else is a temporary problem.
  function showClosed(switchedOff) {
    if (!switchedOff) {
      $('closed-title').textContent = 'Online booking is taking a break';
      $('closed-text').firstChild.textContent = 'It should be back shortly. In the meantime, email ';
    }
    $('booking-panel').hidden = true;
    $('closed-panel').hidden = false;
  }

  function button(label, sublabel, pressed, onClick, ariaLabel) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'chip';
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
    el.setAttribute('aria-pressed', String(pressed));
    el.append(label);
    if (sublabel) {
      const small = document.createElement('small');
      small.textContent = sublabel;
      el.append(small);
    }
    el.addEventListener('click', onClick);
    return el;
  }

  function renderDays() {
    const days = $('days');
    days.replaceChildren();
    for (const [key, slots] of state.byDay) {
      const date = new Date(slots[0]);
      days.append(
        button(
          dayLabel.format(date),
          dateLabel.format(date),
          key === state.day,
          () => {
            state.day = key;
            state.slot = null;
            renderDays();
            renderTimes();
            renderSelection();
          },
          dayName.format(date),
        ),
      );
    }
  }

  function renderTimes() {
    const times = $('times');
    times.replaceChildren();
    for (const slot of state.byDay.get(state.day) ?? []) {
      times.append(
        button(
          timeLabel.format(new Date(slot)),
          null,
          slot === state.slot,
          () => {
            state.slot = slot;
            renderTimes();
            renderSelection();
            $('form-status').textContent = '';
          },
          `${timeLabel.format(new Date(slot))} Toronto time`,
        ),
      );
    }
  }

  function renderSelection() {
    const selection = $('selection');
    if (state.slot) {
      selection.textContent = `${fullLabel.format(new Date(state.slot))} (Toronto time), 30 minutes`;
      selection.classList.add('chosen');
    } else {
      selection.textContent = 'No time chosen yet. Pick a day and a time.';
      selection.classList.remove('chosen');
    }
  }

  async function loadSlots() {
    setPickerMessage('Loading open times…');
    let response;
    try {
      response = await fetch('/api/slots', { headers: { accept: 'application/json' } });
    } catch {
      return showClosed(false);
    }
    if (!response.ok) return showClosed(response.status === 404);
    let data;
    try {
      data = await response.json();
    } catch {
      return showClosed(false);
    }

    state.byDay = new Map();
    for (const slot of data.slots ?? []) {
      const key = slot.slice(0, 10); // the slot string carries its Toronto date
      if (!state.byDay.has(key)) state.byDay.set(key, []);
      state.byDay.get(key).push(slot);
    }
    if (state.byDay.size === 0) {
      $('days').replaceChildren();
      $('times').replaceChildren();
      setPickerMessage('No open times right now. Please check back soon, or email zack@ascension-marketing.ca.');
      return;
    }
    if (!state.byDay.has(state.day)) state.day = state.byDay.keys().next().value;
    if (state.slot && !state.byDay.get(state.day)?.includes(state.slot)) state.slot = null;
    setPickerMessage('');
    renderDays();
    renderTimes();
    renderSelection();
  }

  function setStatus(text, kind) {
    const status = $('form-status');
    status.textContent = text;
    status.className = `form-status ${kind ?? ''}`;
  }

  function showSuccess(result, email) {
    const start = new Date(result.slot.start);
    let when = `${fullLabel.format(start)} (Toronto time), 30 minutes on Google Meet.`;
    const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (visitorZone && visitorZone !== TZ) {
      const local = new Intl.DateTimeFormat('en-CA', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(start);
      when += ` That's ${local} where you are.`;
    }
    $('success-when').textContent = when;

    const meet = $('success-meet');
    if (typeof result.meet_link === 'string' && result.meet_link.startsWith('https://meet.google.com/')) {
      meet.href = result.meet_link;
      meet.parentElement.hidden = false;
    } else {
      meet.parentElement.hidden = true;
    }
    $('success-email').textContent = `We've emailed the details to ${email}.`;

    $('booking-panel').hidden = true;
    const panel = $('success-panel');
    panel.hidden = false;
    panel.focus();
    window.va?.('event', { name: 'booked' });
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!state.slot) {
      setStatus('Please pick a day and a time first.', 'error');
      return;
    }
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const payload = {
      slot_start: state.slot,
      name: fields.get('name'),
      email: fields.get('email'),
      phone: fields.get('phone'),
      company_or_website: fields.get('company_or_website'),
      message: fields.get('message'),
      homepage: fields.get('homepage'),
    };

    const submitButton = $('submit');
    submitButton.disabled = true;
    submitButton.textContent = 'Booking your call…';
    setStatus('Booking your call. This takes a few seconds.', 'busy');

    try {
      let response;
      let result = {};
      try {
        response = await fetch('/api/book', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        result = await response.json().catch(() => ({}));
      } catch {
        setStatus(UNAVAILABLE, 'error');
        return;
      }

      if (response.ok && result.status === 'booked') {
        showSuccess(result, String(payload.email).trim());
        return;
      }
      if (response.status >= 500 || !result.message) {
        setStatus(UNAVAILABLE, 'error');
        return;
      }
      setStatus(result.message, 'error');
      if (result.reason === 'slot_unavailable') {
        state.slot = null;
        await loadSlots();
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Book my free call';
    }
  }

  $('booking-form').addEventListener('submit', submit);
  renderSelection();
  loadSlots();
})();
