/* FINAL-DEV3-DESIGN v2.0.2 | 2026-08-13
   final-dev3 only: Hero follows the business state already calculated by
   Action Bar 2.4.0. This adapter has no clock, timer, storage or URL state. */

(function () {
  'use strict';

  var CLOSED_LABEL = 'Написать в WhatsApp';
  var bar = document.querySelector('.mobile-bar[data-business-state]');
  var heroAction = document.querySelector('.hero--final-dev1 .hero__call--expanded');
  var heroContact = heroAction && heroAction.closest('.hero__phone');
  var whatsappAction = bar && bar.querySelector('[data-business-action="whatsapp"]');

  if (!bar || !heroAction || !heroContact || !whatsappAction) return;

  var originalMarkup = heroAction.innerHTML;
  var originalAttributes = {};
  var controlledAttributes = ['href', 'target', 'rel', 'data-action', 'aria-label'];
  var closed = false;

  controlledAttributes.forEach(function (name) {
    originalAttributes[name] = heroAction.hasAttribute(name)
      ? heroAction.getAttribute(name)
      : null;
  });

  function copyAttribute(name, source) {
    var value = source.getAttribute(name);
    if (value === null) {
      heroAction.removeAttribute(name);
    } else {
      heroAction.setAttribute(name, value);
    }
  }

  function restoreAttribute(name) {
    var value = originalAttributes[name];
    if (value === null) {
      heroAction.removeAttribute(name);
    } else {
      heroAction.setAttribute(name, value);
    }
  }

  function renderClosed() {
    if (closed) return;

    copyAttribute('href', whatsappAction);
    copyAttribute('target', whatsappAction);
    copyAttribute('rel', whatsappAction);
    heroAction.setAttribute('data-action', 'whatsapp_click');
    heroAction.setAttribute('aria-label', CLOSED_LABEL);

    var icon = document.createElement('span');
    icon.className = 'hero__call-icon';
    icon.setAttribute('aria-hidden', 'true');
    var whatsappSvg = whatsappAction.querySelector('svg');
    if (whatsappSvg) icon.appendChild(whatsappSvg.cloneNode(true));

    var label = document.createElement('span');
    label.className = 'hero__call-num';
    label.textContent = CLOSED_LABEL;

    heroAction.replaceChildren(icon, label);
    heroContact.setAttribute('data-hero-business-state', 'closed');
    closed = true;
  }

  function renderOpen() {
    if (!closed) return;

    controlledAttributes.forEach(restoreAttribute);
    heroAction.innerHTML = originalMarkup;
    heroContact.removeAttribute('data-hero-business-state');
    closed = false;
  }

  function syncFromActionBar() {
    var businessState = bar.getAttribute('data-business-state');
    if (businessState === 'closed') {
      renderClosed();
    } else if (businessState === 'open') {
      renderOpen();
    }
  }

  new MutationObserver(syncFromActionBar).observe(bar, {
    attributes: true,
    attributeFilter: ['data-business-state']
  });
  syncFromActionBar();
})();
