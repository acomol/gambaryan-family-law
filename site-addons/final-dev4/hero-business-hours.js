/* FINAL-DEV4-DESIGN v1.1.1 | 2026-09-07
   final-dev4 only: Hero + all phone links outside Hero follow Action Bar.
   This adapter has no clock, timer, storage or URL state. */

(function () {
  'use strict';

  var CLOSED_LABEL = 'Написать в WhatsApp';
  var bar = document.querySelector('.mobile-bar[data-business-state]');
  var whatsappAction = bar && bar.querySelector('[data-business-action="whatsapp"]');
  if (!bar || !whatsappAction) return;

  var controlledAttributes = ['href', 'target', 'rel', 'data-action', 'aria-label'];
  var targets = Array.from(document.querySelectorAll('[data-business-closed]')).map(function (element) {
    var originalAttributes = {};
    controlledAttributes.forEach(function (name) {
      originalAttributes[name] = element.getAttribute(name);
    });
    var spans = element.querySelectorAll('span');
    var svg = element.querySelector('svg');
    return {
      element: element,
      originalMarkup: element.innerHTML,
      originalAttributes: originalAttributes,
      labelClass: spans.length ? spans[spans.length - 1].className : '',
      iconClass: svg && svg.parentElement.tagName === 'SPAN' ? svg.parentElement.className : '',
      width: svg && svg.getAttribute('width'),
      height: svg && svg.getAttribute('height'),
      heroContact: element.closest('.hero__phone')
    };
  });
  var variants = document.querySelectorAll('[data-business-variant]');
  var errorLinks = Array.from(document.querySelectorAll(
    '.lead-form__error-contact [data-business-variant="closed"] a'
  )).map(function (element) {
    return { element: element, originalMarkup: element.innerHTML };
  });
  document.querySelectorAll('.contact-list__row[data-business-variant="closed"][href="#contact"]').forEach(function (element) {
    element.addEventListener('click', function (event) {
      event.preventDefault();
      document.querySelector('#lead-name').focus();
    });
  });
  var closed = false;

  function setAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }

  function renderClosed() {
    if (closed) return;
    targets.forEach(function (target) {
      var element = target.element;
      if (element.getAttribute('data-business-closed') === 'hide') {
        element.hidden = true;
        return;
      }
      ['href', 'target', 'rel'].forEach(function (name) {
        setAttribute(element, name, whatsappAction.getAttribute(name));
      });
      element.setAttribute('data-action', 'whatsapp_click');
      element.setAttribute('aria-label', CLOSED_LABEL);

      var icon = cloneWhatsappIcon(target.width, target.height);
      if (target.iconClass) {
        var wrapper = document.createElement('span');
        wrapper.className = target.iconClass;
        wrapper.setAttribute('aria-hidden', 'true');
        wrapper.appendChild(icon);
        icon = wrapper;
      }
      var label = document.createElement('span');
      label.className = target.labelClass;
      label.textContent = CLOSED_LABEL;
      element.replaceChildren(icon, label);
      if (target.heroContact) target.heroContact.setAttribute('data-hero-business-state', 'closed');
    });
    errorLinks.forEach(function (link) {
      link.element.prepend(cloneWhatsappIcon('16', '16'));
    });
    closed = true;
  }

  function cloneWhatsappIcon(width, height) {
    var icon = whatsappAction.querySelector('svg').cloneNode(true);
    icon.setAttribute('aria-hidden', 'true');
    if (width) icon.setAttribute('width', width);
    if (height) icon.setAttribute('height', height);
    return icon;
  }

  function renderOpen() {
    if (!closed) return;
    targets.forEach(function (target) {
      var element = target.element;
      element.hidden = false;
      controlledAttributes.forEach(function (name) {
        setAttribute(element, name, target.originalAttributes[name]);
      });
      element.innerHTML = target.originalMarkup;
      if (target.heroContact) target.heroContact.removeAttribute('data-hero-business-state');
    });
    errorLinks.forEach(function (link) {
      link.element.innerHTML = link.originalMarkup;
    });
    closed = false;
  }

  function syncFromActionBar() {
    var businessState = bar.getAttribute('data-business-state');
    if (businessState !== 'open' && businessState !== 'closed') return;
    if (businessState === 'closed') renderClosed();
    else renderOpen();
    variants.forEach(function (variant) {
      variant.hidden = variant.getAttribute('data-business-variant') !== businessState;
    });
  }

  new MutationObserver(syncFromActionBar).observe(bar, {
    attributes: true,
    attributeFilter: ['data-business-state']
  });
  syncFromActionBar();
})();
