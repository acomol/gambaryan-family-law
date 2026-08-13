#!/usr/bin/env python3
"""PREVIEW-BROWSER-QA-RUNNER v1.3.1 | 2026-08-13

Reproduce the browser viewport matrix recorded in ``docs/FINAL-QA-CHECKLIST.md``.

Install and run::

    python -m pip install -r requirements-build.txt
    python -m playwright install chromium
    python scripts/qa-browser-matrix.py http://127.0.0.1:8000/

The default command checks one locally served Preview at the exact 10 main and
5 breakpoint/landscape viewports. The eleven-target aggregate is ``110/110 +
55/55 + 8/8``; serve the repository root and add ``--all-previews``::

    python scripts/qa-browser-matrix.py http://127.0.0.1:8000/ --all-previews

For live aliases, use a URL template (PowerShell users should quote it)::

    python scripts/qa-browser-matrix.py "https://{preview}.gambarian-landing.pages.dev/" --all-previews

Stdout is JSON Lines: every ``cell`` record is one target/viewport PASS or
FAIL, followed by one ``summary`` record with per-suite and total counts. A
PASS means the page loaded with the expected Preview markers, no horizontal
overflow, browser console/page errors or failed requests; Hero/photo, the real
Chromium platform font used for title/body/CTA glyphs, and Action Bar breakpoint
geometry also passed. Font coverage includes title, italic service heading,
body and CTA text. Short portrait cells additionally require all Hero
actions to end at least 8px above the viewport bottom. The process exits 0 only
when every emitted cell passes.

This machine runner does not replace visual review of heads/hair, text/photo
overlaps or microtext readability, and it does not execute the separate form
interaction smoke. It does toggle both business states for the final-dev3 Hero;
the remaining manual/browser interaction gates stay required by
``docs/tasks/2026-08-10-all-previews-browser-qa.md``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from urllib.parse import quote, urljoin, urlparse, urlunparse

from playwright.sync_api import Browser, Page, sync_playwright

from final_dev3_contract import (
    BODY_CLASS as FINAL_DEV3_BODY_CLASS,
    MARKER as FINAL_DEV3_MARKER,
)


RUNNER_VERSION = "1.3.1"
ACTION_BAR_VERSION = "2.3.3"
CLIENT_PREVIEW_MOBILE_VERSION = "1.1.0"

MAIN_VIEWPORTS = (
    (360, 600),
    (360, 668),
    (390, 724),
    (390, 844),
    (720, 760),
    (860, 760),
    (861, 760),
    (1024, 768),
    (1280, 720),
    (1440, 900),
)
BREAKPOINT_VIEWPORTS = (
    (960, 760),
    (961, 760),
    (960, 400),
    (960, 401),
    (844, 390),
)
LARGE_VIEWPORTS = ((1920, 1080), (2560, 1440))
SHORT_PORTRAIT_VIEWPORTS = {(360, 600), (360, 668), (390, 724)}
SOURCE_COPY_IDS = tuple(
    re.findall(
        r'data-copy-id="([^"]+)"',
        (Path(__file__).resolve().parent.parent / "site" / "index.html").read_text(
            encoding="utf-8"
        ),
    )
)


@dataclass(frozen=True)
class Target:
    name: str
    path: str
    large_desktop: bool = False


PREVIEWS = (
    Target("final-dev", "build/variants/action-bar", True),
    Target("final-dev1", "build/variants/final-dev1"),
    Target("final-dev3", "build/variants/final-dev3", True),
    Target("v1-playfair-onest", "build/font-variants/v1-playfair-onest"),
    Target("v2-lora-inter", "build/font-variants/v2-lora-inter"),
    Target("v3-literata-manrope", "build/font-variants/v3-literata-manrope"),
    Target("v4-ptserif-golos", "build/font-variants/v4-ptserif-golos"),
    Target("hero-a-actions-first", "build/variants/hero-a-actions-first", True),
    Target("hero-b-call-first", "build/variants/hero-b-call-first", True),
    Target("action-bar", "build/variants/action-bar"),
    Target("review-numbered", "build/variants/review-numbered"),
)

EXPECTED_FONTS = {target.name: ("Playfair Display", "Onest") for target in PREVIEWS}
EXPECTED_FONTS.update({
    "v1-playfair-onest": ("Playfair Display", "Onest"),
    "v2-lora-inter": ("Lora", "Inter"),
    "v3-literata-manrope": ("Literata", "Manrope"),
    "v4-ptserif-golos": ("PT Serif", "Golos Text"),
})


def emit(record: dict[str, Any]) -> None:
    """Write one deterministic machine-readable record."""

    # ASCII escapes keep JSONL writable under the legacy Windows code pages
    # used by PowerShell redirection and CI log collectors.
    print(json.dumps(record, ensure_ascii=True, sort_keys=True), flush=True)


def normalize_base_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("base URL must be an absolute http:// or https:// URL")
    return raw_url if raw_url.endswith("/") else f"{raw_url}/"


def infer_target_name(url: str) -> str:
    parsed = urlparse(url)
    host_label = (parsed.hostname or "").lower().split(".", 1)[0]
    path = parsed.path.rstrip("/").lower()
    path_label = PurePosixPath(path).name
    for target in sorted(PREVIEWS, key=lambda item: len(item.name), reverse=True):
        target_path = f"/{target.path.lower()}"
        if host_label == target.name or path_label == target.name or path.endswith(target_path):
            return target.name
    return "candidate"


def live_url(base_url: str, preview_name: str) -> str:
    """Resolve a stable Pages alias from a project or existing alias URL."""

    parsed = urlparse(base_url)
    host = parsed.hostname or ""
    suffix = ".gambarian-landing.pages.dev"
    if host == "gambarian-landing.pages.dev" or host.endswith(suffix):
        alias_host = f"{preview_name}{suffix}"
        if parsed.port:
            alias_host = f"{alias_host}:{parsed.port}"
        return urlunparse((parsed.scheme, alias_host, "/", "", "", ""))
    raise ValueError(
        "for non-local --all-previews use a URL containing {preview}, "
        "or a gambarian-landing.pages.dev project URL"
    )


def resolve_targets(base_url: str, all_previews: bool, target_name: str | None) -> list[tuple[Target, str]]:
    if not all_previews:
        name = target_name or infer_target_name(base_url)
        known = next((target for target in PREVIEWS if target.name == name), None)
        return [(known or Target(name, ""), base_url)]

    if "{preview}" in base_url or "{path}" in base_url:
        return [
            (
                target,
                base_url.replace("{preview}", quote(target.name)).replace(
                    "{path}", quote(target.path, safe="/")
                ),
            )
            for target in PREVIEWS
        ]

    host = (urlparse(base_url).hostname or "").lower()
    if host in {"127.0.0.1", "localhost", "::1"}:
        return [
            (target, urljoin(base_url, f"{PurePosixPath(target.path).as_posix()}/"))
            for target in PREVIEWS
        ]
    return [(target, live_url(base_url, target.name)) for target in PREVIEWS]


def iter_cells(
    targets: Iterable[tuple[Target, str]], include_large: bool
) -> Iterable[tuple[Target, str, str, int, int]]:
    target_list = list(targets)
    for target, url in target_list:
        for width, height in MAIN_VIEWPORTS:
            yield target, url, "main", width, height
    for target, url in target_list:
        for width, height in BREAKPOINT_VIEWPORTS:
            yield target, url, "breakpoint", width, height
    if include_large:
        for target, url in target_list:
            if target.large_desktop:
                for width, height in LARGE_VIEWPORTS:
                    yield target, url, "large", width, height


def platform_font_metrics(page: Page) -> list[dict[str, Any]]:
    """Read the actual glyph fonts rendered by Chromium for key text nodes."""

    session = page.context.new_cdp_session(page)
    try:
        session.send("DOM.enable")
        session.send("CSS.enable")
        document = session.send("DOM.getDocument", {"depth": -1, "pierce": True})
        root_id = document["root"]["nodeId"]
        samples: list[dict[str, Any]] = []
        for role, selector in (
            ("title", ".hero__title"),
            ("italic", ".svc-title"),
            ("body", ".hero__lede"),
            ("cta", ".hero .btn"),
        ):
            node_id = session.send(
                "DOM.querySelector", {"nodeId": root_id, "selector": selector}
            )["nodeId"]
            if not node_id:
                samples.append({"role": role, "fonts": []})
                continue
            fonts = session.send("CSS.getPlatformFontsForNode", {"nodeId": node_id})[
                "fonts"
            ]
            samples.append(
                {
                    "role": role,
                    "fonts": [
                        {
                            "family": font["familyName"],
                            "postscript": font["postScriptName"],
                            "custom": font["isCustomFont"],
                            "glyphs": font["glyphCount"],
                        }
                        for font in fonts
                    ],
                }
            )
        return samples
    finally:
        session.detach()


def browser_metrics(page: Page, short_portrait: bool, timeout_ms: int) -> dict[str, Any]:
    return page.evaluate(
        """async ({ shortPortrait, actionVersion, mobileVersion, finalDev3Marker, finalDev3BodyClass, timeoutMs }) => {
          const boundedWait = (promise) => Promise.race([
            promise,
            new Promise((resolve) => setTimeout(resolve, timeoutMs)),
          ]);
          await boundedWait(document.fonts.ready);
          const heroPhoto = document.querySelector('.hero-photo');
          if (heroPhoto && !heroPhoto.complete) {
            await boundedWait(new Promise((resolve) => {
              heroPhoto.addEventListener('load', resolve, { once: true });
              heroPhoto.addEventListener('error', resolve, { once: true });
            }));
          }

          const root = document.documentElement;
          const hero = document.querySelector('.hero');
          const heroMedia = document.querySelector('.hero-media');
          const bar = document.querySelector('.mobile-bar');
          const leadForm = document.querySelector('.lead-form');
          const visible = (element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0;
          };
          const firstFamily = (element) => element
            ? getComputedStyle(element).fontFamily.split(',')[0].trim().replace(/^['\"]|['\"]$/g, '')
            : '';
          const fontSamples = [
            ['title', document.querySelector('.hero__title')],
            ['italic', document.querySelector('.svc-title')],
            ['body', document.querySelector('.hero__lede')],
            ['cta', document.querySelector('.hero .btn')],
          ].filter(([, element]) => element).map(([role, element]) => {
            const style = getComputedStyle(element);
            const family = firstFamily(element);
            const specimen = (element.textContent || 'Адвокат').trim().slice(0, 80) || 'Адвокат';
            const descriptor = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} \"${family}\"`;
            return { role, family, loaded: document.fonts.check(descriptor, specimen) };
          });

          const actionRects = [...document.querySelectorAll(
            '.hero a[href="#contact"], .hero a[href^="tel:"], .hero a[data-action="whatsapp_click"]'
          )].filter(visible).map((element) => {
            const rect = element.getBoundingClientRect();
            return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
          });
          const lastActionBottom = actionRects.length
            ? Math.max(...actionRects.map((rect) => rect.bottom))
            : null;

          const heroBusinessAction = document.querySelector(
            '.hero--final-dev1 .hero__call--expanded'
          );
          const whatsappAction = bar?.querySelector('[data-business-action="whatsapp"]');
          const demoToggle = document.querySelector('[data-business-demo]');
          const businessSnapshot = () => {
            const heroSvg = heroBusinessAction?.querySelector('svg');
            const whatsappSvg = whatsappAction?.querySelector('svg');
            return {
              barState: bar?.dataset.businessState || null,
              href: heroBusinessAction?.getAttribute('href') || null,
              target: heroBusinessAction?.getAttribute('target') || null,
              rel: heroBusinessAction?.getAttribute('rel') || null,
              dataAction: heroBusinessAction?.getAttribute('data-action') || null,
              ariaLabel: heroBusinessAction?.getAttribute('aria-label') || null,
              visibleText: (heroBusinessAction?.innerText || '').replace(/\\s+/g, ' ').trim(),
              rawText: (heroBusinessAction?.textContent || '').replace(/\\s+/g, ' ').trim(),
              whatsappHref: whatsappAction?.getAttribute('href') || null,
              whatsappTarget: whatsappAction?.getAttribute('target') || null,
              whatsappRel: whatsappAction?.getAttribute('rel') || null,
              iconMatchesWhatsApp: Boolean(
                heroSvg && whatsappSvg && heroSvg.innerHTML === whatsappSvg.innerHTML
              ),
              heroContactActionCount: document.querySelectorAll(
                '.hero--final-dev1 .hero__phone > a'
              ).length,
            };
          };
          const heroBusinessSync = [];
          if (
            document.body?.classList.contains(finalDev3BodyClass) &&
            heroBusinessAction && bar && demoToggle
          ) {
            heroBusinessSync.push(businessSnapshot());
            demoToggle.click();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            heroBusinessSync.push(businessSnapshot());
            demoToggle.click();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            heroBusinessSync.push(businessSnapshot());
          }

          const clientPreviewStylesheet = [...document.querySelectorAll(
            'link[rel="stylesheet"][href]'
          )].map((link) => link.href).find((url) => {
            try {
              return new URL(url).pathname.endsWith('/client-preview.css');
            } catch (_) {
              return false;
            }
          });
          let clientPreviewCss = '';
          if (clientPreviewStylesheet) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
              const response = await fetch(clientPreviewStylesheet, {
                cache: 'no-store',
                signal: controller.signal,
              });
              clientPreviewCss = response.ok ? await response.text() : '';
            } catch (_) {
              clientPreviewCss = '';
            } finally {
              clearTimeout(timer);
            }
          }
          const source = document.documentElement.outerHTML;
          const leadFormRect = leadForm ? leadForm.getBoundingClientRect() : null;
          const barStyle = bar ? getComputedStyle(bar) : null;
          const barRect = bar ? bar.getBoundingClientRect() : null;
          const visibleBarItems = bar
            ? [...bar.querySelectorAll('.mobile-bar__item')].filter((item) =>
                getComputedStyle(item).display !== 'none'
              )
            : [];
          const barItemWidths = visibleBarItems.map((item) => item.getBoundingClientRect().width);

          return {
            viewport: { width: innerWidth, height: innerHeight },
            layout: {
              clientWidth: root.clientWidth,
              scrollWidth: root.scrollWidth,
              overflow: root.scrollWidth - root.clientWidth,
            },
            hero: {
              present: Boolean(hero),
              width: hero ? hero.getBoundingClientRect().width : 0,
              height: hero ? hero.getBoundingClientRect().height : 0,
              photoComplete: Boolean(heroPhoto && heroPhoto.complete && heroPhoto.naturalWidth > 0),
              photoWidth: heroPhoto ? heroPhoto.getBoundingClientRect().width : 0,
              photoHeight: heroPhoto ? heroPhoto.getBoundingClientRect().height : 0,
              actionCount: actionRects.length,
              lastActionBottom,
              shortPortrait,
              heroCount: document.querySelectorAll('.hero').length,
              mediaCount: document.querySelectorAll('.hero-media').length,
              mediaTransform: heroMedia ? getComputedStyle(heroMedia).transform : null,
              businessSync: heroBusinessSync,
            },
            fonts: fontSamples,
            form: leadFormRect ? {
              present: true,
              leftGap: leadFormRect.left,
              rightGap: innerWidth - leadFormRect.right,
              width: leadFormRect.width,
              withinViewport: leadFormRect.left >= -0.5 && leadFormRect.right <= innerWidth + 0.5,
            } : { present: false },
            markers: {
              actionBar: source.includes(`ACTION-BAR-SPEC v${actionVersion}`),
              clientPreviewMobile: clientPreviewCss.includes(
                `CLIENT-PREVIEW-MOBILE v${mobileVersion}`
              ),
              finalDev3: source.includes(finalDev3Marker),
            },
            actionBar: bar ? {
              present: true,
              display: barStyle.display,
              position: barStyle.position,
              height: barRect.height,
              overflow: bar.scrollWidth - bar.clientWidth,
              businessState: bar.dataset.businessState || null,
              visibleItemCount: visibleBarItems.length,
              itemWidths: barItemWidths,
            } : { present: false },
            reviewNumbers: [...document.querySelectorAll('[data-copy-id]')].map(
              (node) => node.dataset.copyId
            ),
            variant: {
              finalDev1: Boolean(document.querySelector('.hero--final-dev1')),
              finalDev3: Boolean(document.body?.classList.contains(finalDev3BodyClass)),
              actionsFirst: Boolean(document.querySelector('.hero--actions-first')),
              callFirst: Boolean(document.querySelector('.hero--call-first')),
            },
          };
        }""",
        {
            "shortPortrait": short_portrait,
            "actionVersion": ACTION_BAR_VERSION,
            "mobileVersion": CLIENT_PREVIEW_MOBILE_VERSION,
            "finalDev3Marker": FINAL_DEV3_MARKER,
            "finalDev3BodyClass": FINAL_DEV3_BODY_CLASS,
            "timeoutMs": timeout_ms,
        },
    )


def final_dev3_bar_visibility_metrics(page: Page) -> dict[str, Any]:
    """Проверяет scoped правило Action Bar при возврате вверх в Hero."""

    return page.evaluate(
        """async () => {
          const bar = document.querySelector('.mobile-bar');
          const demo = document.querySelector('[data-business-demo]');
          const form = document.getElementById('contact');
          const heroPhone = document.querySelector('.hero__phone');
          const read = () => ({
            scrollY: window.scrollY,
            barHidden: bar.classList.contains('is-hidden'),
            barVisible: getComputedStyle(bar).visibility === 'visible' &&
              getComputedStyle(bar).opacity === '1',
            demoHidden: Boolean(demo && demo.hidden),
            heroPhoneInViewport: Boolean(heroPhone && (() => {
              const rect = heroPhone.getBoundingClientRect();
              return rect.bottom > 0 && rect.top < innerHeight;
            })()),
          });
          const settle = async () => {
            document.dispatchEvent(new Event('scrollend'));
            await new Promise((resolve) => requestAnimationFrame(() =>
              requestAnimationFrame(resolve)
            ));
            await new Promise((resolve) => setTimeout(resolve, 300));
          };
          const scrollTo = async (top) => {
            window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
            await settle();
          };

          await scrollTo(0);
          const top = read();

          const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
          await scrollTo(Math.min(900, maxScroll));
          await scrollTo(Math.min(320, maxScroll));
          const returnedToHero = read();

          const formTop = form ? window.scrollY + form.getBoundingClientRect().top : 0;
          await scrollTo(Math.min(formTop, maxScroll));
          const formVisible = read();

          await scrollTo(0);
          return { top, returnedToHero, formVisible, heroPhonePresent: Boolean(heroPhone) };
        }"""
    )


def validate_metrics(
    target: Target,
    width: int,
    height: int,
    metrics: dict[str, Any],
    console_messages: list[dict[str, str]],
    page_errors: list[str],
    failed_requests: list[str],
    external_font_urls: list[str],
) -> list[str]:
    failures: list[str] = []
    layout = metrics["layout"]
    hero = metrics["hero"]
    form = metrics["form"]
    bar = metrics["actionBar"]

    if layout["scrollWidth"] != layout["clientWidth"] or layout["clientWidth"] != width:
        failures.append(
            f"horizontal-overflow scroll={layout['scrollWidth']} client={layout['clientWidth']} expected={width}"
        )
    if not hero["present"] or hero["width"] <= 0 or hero["height"] <= 0:
        failures.append("hero-missing-or-empty")
    if not hero["photoComplete"] or hero["photoWidth"] <= 0 or hero["photoHeight"] <= 0:
        failures.append("hero-photo-not-rendered")
    if hero["actionCount"] == 0:
        failures.append("hero-actions-missing")
    if width == 861:
        if hero["heroCount"] != 1 or hero["mediaCount"] != 1:
            failures.append(
                f"hero-861-composition={hero['heroCount']}/{hero['mediaCount']} expected=1/1"
            )
        if hero["mediaTransform"] not in {"none", "matrix(1, 0, 0, 1, 0, 0)"}:
            failures.append(f"hero-861-mobile-transform={hero['mediaTransform']}")
    if hero["shortPortrait"]:
        bottom = hero["lastActionBottom"]
        if bottom is None or bottom > height - 8:
            failures.append(f"hero-action-bottom={bottom} required<={height - 8}")

    if target.name == "final-dev3":
        if width <= 860:
            if not form["present"]:
                failures.append("final-dev3-mobile-form-missing")
            else:
                if not form["withinViewport"]:
                    failures.append(
                        "final-dev3-mobile-form-outside-viewport="
                        f"{form['leftGap']}/{form['rightGap']}"
                    )
                if abs(form["leftGap"] - form["rightGap"]) > 1:
                    failures.append(
                        "final-dev3-mobile-form-not-centered="
                        f"{form['leftGap']}/{form['rightGap']}"
                    )
        business_sync = hero["businessSync"]
        if len(business_sync) != 3:
            failures.append(f"final-dev3-hero-business-snapshots={len(business_sync)} expected=3")
        else:
            states = [snapshot["barState"] for snapshot in business_sync]
            expected_states = [states[0], "closed" if states[0] == "open" else "open", states[0]]
            if states[0] not in {"open", "closed"} or states != expected_states:
                failures.append(
                    f"final-dev3-hero-business-sequence={states} expected={expected_states}"
                )
            for snapshot in business_sync:
                state = snapshot["barState"]
                if snapshot["heroContactActionCount"] != 1:
                    failures.append(
                        "final-dev3-hero-contact-actions="
                        f"{snapshot['heroContactActionCount']} expected=1"
                    )
                if state == "open":
                    if snapshot["href"] != "tel:+972545490623":
                        failures.append(f"final-dev3-hero-open-href={snapshot['href']}")
                    if snapshot["target"] is not None or snapshot["rel"] is not None:
                        failures.append(
                            "final-dev3-hero-open-external-attrs="
                            f"{snapshot['target']}/{snapshot['rel']}"
                        )
                    if snapshot["dataAction"] != "phone_click":
                        failures.append(
                            f"final-dev3-hero-open-action={snapshot['dataAction']}"
                        )
                    if snapshot["ariaLabel"] != "Позвонить: 054-549-0623":
                        failures.append(
                            f"final-dev3-hero-open-label={snapshot['ariaLabel']}"
                        )
                    if "054-549-0623" not in snapshot["rawText"]:
                        failures.append("final-dev3-hero-open-phone-copy-missing")
                    if snapshot["iconMatchesWhatsApp"]:
                        failures.append("final-dev3-hero-open-icon-is-whatsapp")
                elif state == "closed":
                    if snapshot["href"] != snapshot["whatsappHref"]:
                        failures.append("final-dev3-hero-closed-whatsapp-href-mismatch")
                    if snapshot["target"] != snapshot["whatsappTarget"]:
                        failures.append("final-dev3-hero-closed-whatsapp-target-mismatch")
                    if snapshot["rel"] != snapshot["whatsappRel"]:
                        failures.append("final-dev3-hero-closed-whatsapp-rel-mismatch")
                    if snapshot["dataAction"] != "whatsapp_click":
                        failures.append(
                            f"final-dev3-hero-closed-action={snapshot['dataAction']}"
                        )
                    if snapshot["ariaLabel"] != "Написать в WhatsApp":
                        failures.append(
                            f"final-dev3-hero-closed-label={snapshot['ariaLabel']}"
                        )
                    if snapshot["visibleText"] != "Написать в WhatsApp":
                        failures.append(
                            f"final-dev3-hero-closed-copy={snapshot['visibleText']}"
                        )
                    if "054-549-0623" in snapshot["rawText"] or "Позвон" in snapshot["rawText"]:
                        failures.append("final-dev3-hero-closed-phone-copy-visible")
                    if not snapshot["iconMatchesWhatsApp"]:
                        failures.append("final-dev3-hero-closed-icon-not-whatsapp")
        visibility = metrics.get("finalDev3BarVisibility")
        if width <= 960 and height > 400:
            if not visibility or not visibility["heroPhonePresent"]:
                failures.append("final-dev3-action-bar-visibility-metrics-missing")
            else:
                if (
                    visibility["top"]["scrollY"] > 1
                    or not visibility["top"]["barHidden"]
                    or not visibility["top"]["demoHidden"]
                ):
                    failures.append("final-dev3-action-bar-must-hide-only-at-page-top")
                if (
                    visibility["returnedToHero"]["scrollY"] <= 1
                    or visibility["returnedToHero"]["barHidden"]
                    or not visibility["returnedToHero"]["barVisible"]
                    or visibility["returnedToHero"]["demoHidden"]
                    or not visibility["returnedToHero"]["heroPhoneInViewport"]
                ):
                    failures.append("final-dev3-action-bar-must-stay-visible-on-return-up")
                if (
                    not visibility["formVisible"]["barHidden"]
                    or not visibility["formVisible"]["demoHidden"]
                ):
                    failures.append("final-dev3-action-bar-must-hide-at-form")

    if not metrics["markers"]["actionBar"]:
        failures.append(f"missing-action-bar-marker-v{ACTION_BAR_VERSION}")
    if not metrics["markers"]["clientPreviewMobile"]:
        failures.append(f"missing-client-preview-mobile-marker-v{CLIENT_PREVIEW_MOBILE_VERSION}")

    for sample in metrics["fonts"]:
        if not sample["loaded"]:
            failures.append(f"font-not-loaded:{sample['role']}:{sample['family']}")
    actual_fonts: dict[str, dict[str, Any]] = {}
    for sample in metrics["platformFonts"]:
        rendered = [font for font in sample["fonts"] if font["glyphs"] > 0]
        if not rendered:
            failures.append(f"platform-font-missing:{sample['role']}")
            continue
        dominant = max(rendered, key=lambda font: font["glyphs"])
        actual_fonts[sample["role"]] = dominant
        if not dominant["custom"]:
            failures.append(
                f"platform-font-not-custom:{sample['role']}:{dominant['family']}"
            )
        fallback = [font["family"] for font in rendered if not font["custom"]]
        if fallback:
            failures.append(
                f"platform-font-fallback:{sample['role']}:{','.join(sorted(set(fallback)))}"
            )
    expected_fonts = EXPECTED_FONTS.get(target.name)
    if expected_fonts:
        actual = {sample["role"]: sample["family"] for sample in metrics["fonts"]}
        role_expectations = (
            ("title", expected_fonts[0]),
            ("italic", expected_fonts[0]),
            ("body", expected_fonts[1]),
            ("cta", expected_fonts[1]),
        )
        for role, expected in role_expectations:
            if actual.get(role) != expected:
                failures.append(f"{role}-font={actual.get(role)} expected={expected}")
            platform_family = actual_fonts.get(role, {}).get("family", "")
            if expected.casefold() not in platform_family.casefold():
                failures.append(
                    f"platform-font={role}:{platform_family} expected-family={expected}"
                )
    if external_font_urls:
        failures.append(f"external-font-requests:{','.join(sorted(set(external_font_urls)))}")

    if not bar["present"]:
        failures.append("action-bar-missing")
    elif width <= 960:
        expected_position = "static" if height <= 400 else "fixed"
        if bar["display"] != "grid":
            failures.append(f"action-bar-display={bar['display']} expected=grid")
        if bar["position"] != expected_position:
            failures.append(f"action-bar-position={bar['position']} expected={expected_position}")
        if abs(bar["height"] - 60) > 0.5:
            failures.append(f"action-bar-height={bar['height']} expected=60")
        if bar["overflow"] > 0:
            failures.append(f"action-bar-overflow={bar['overflow']}")
        expected_items = {"open": 3, "closed": 2}.get(bar["businessState"])
        if expected_items is None:
            failures.append(f"action-bar-business-state={bar['businessState']}")
        elif bar["visibleItemCount"] != expected_items:
            failures.append(
                f"action-bar-items={bar['visibleItemCount']} expected={expected_items}"
            )
        widths = bar["itemWidths"]
        if widths and max(widths) - min(widths) > 0.5:
            failures.append(f"action-bar-unequal-columns={widths}")
    elif bar["display"] != "none":
        failures.append(f"action-bar-display={bar['display']} expected=none")

    if target.name == "final-dev1" and not metrics["variant"]["finalDev1"]:
        failures.append("final-dev1-marker-missing")
    if target.name == "final-dev3":
        if not metrics["variant"]["finalDev1"]:
            failures.append("final-dev3-inherited-final-dev1-class-missing")
        if not metrics["markers"]["finalDev3"]:
            failures.append("final-dev3-design-marker-missing")
        if not metrics["variant"]["finalDev3"]:
            failures.append("final-dev3-body-class-missing")
    if target.name == "hero-a-actions-first" and not metrics["variant"]["actionsFirst"]:
        failures.append("hero-a-marker-missing")
    if target.name == "hero-b-call-first" and not metrics["variant"]["callFirst"]:
        failures.append("hero-b-marker-missing")
    if target.name == "review-numbered":
        numbers = metrics["reviewNumbers"]
        if numbers != list(SOURCE_COPY_IDS):
            failures.append(
                f"review-numbers={len(numbers)}/{len(set(numbers))} "
                f"expected-source={len(SOURCE_COPY_IDS)}"
            )

    failures.extend(f"console-{message['type']}:{message['text']}" for message in console_messages)
    failures.extend(f"page-error:{message}" for message in page_errors)
    failures.extend(f"request-failed:{url}" for url in failed_requests)
    return failures


def run_cell(
    browser: Browser,
    target: Target,
    url: str,
    suite: str,
    width: int,
    height: int,
    timeout_ms: int,
) -> dict[str, Any]:
    page = browser.new_page(viewport={"width": width, "height": height})
    console_messages: list[dict[str, str]] = []
    page_errors: list[str] = []
    failed_requests: list[str] = []
    external_font_urls: list[str] = []
    base_origin = urlparse(url)

    def on_console(message: Any) -> None:
        if message.type in {"warning", "error"}:
            console_messages.append({"type": message.type, "text": message.text})

    def on_request(request: Any) -> None:
        if request.resource_type != "font":
            return
        request_origin = urlparse(request.url)
        if (request_origin.scheme, request_origin.netloc) != (base_origin.scheme, base_origin.netloc):
            external_font_urls.append(request.url)

    page.on("console", on_console)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("requestfailed", lambda request: failed_requests.append(request.url))
    page.on("request", on_request)
    page.set_default_timeout(timeout_ms)
    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        status_code = response.status if response else None
        if status_code != 200:
            failures = [f"http-status={status_code} expected=200"]
            metrics: dict[str, Any] = {}
        else:
            page.locator(".hero").wait_for(state="attached", timeout=timeout_ms)
            metrics = browser_metrics(
                page, (width, height) in SHORT_PORTRAIT_VIEWPORTS, timeout_ms
            )
            if target.name == "final-dev3" and width <= 960 and height > 400:
                metrics["finalDev3BarVisibility"] = final_dev3_bar_visibility_metrics(page)
            metrics["platformFonts"] = platform_font_metrics(page)
            failures = validate_metrics(
                target,
                width,
                height,
                metrics,
                console_messages,
                page_errors,
                failed_requests,
                external_font_urls,
            )
    except Exception as exc:  # A failed cell stays machine-readable.
        status_code = None
        metrics = {}
        failures = [f"exception:{type(exc).__name__}:{exc}"]
    finally:
        page.close()

    return {
        "type": "cell",
        "runner_version": RUNNER_VERSION,
        "target": target.name,
        "url": url,
        "suite": suite,
        "viewport": {"width": width, "height": height},
        "status": "PASS" if not failures else "FAIL",
        "http_status": status_code,
        "failures": failures,
        "metrics": metrics,
    }


def positive_timeout(value: str) -> int:
    timeout_ms = int(value)
    if timeout_ms <= 0:
        raise argparse.ArgumentTypeError("timeout must be a positive number of milliseconds")
    return timeout_ms


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Gambarian Preview browser viewport matrix and emit JSON Lines."
    )
    parser.add_argument("base_url", help="Preview URL, repository-root URL, or {preview}/{path} URL template")
    parser.add_argument(
        "--all-previews",
        action="store_true",
        help="run 11 Preview targets plus the 8-cell large-desktop subset",
    )
    parser.add_argument(
        "--target-name",
        choices=[target.name for target in PREVIEWS],
        help="identify a single locally served variant for variant-specific checks",
    )
    parser.add_argument(
        "--timeout-ms",
        type=positive_timeout,
        default=12_000,
        help="per-navigation/resource timeout (default: 12000)",
    )
    parser.add_argument("--headed", action="store_true", help="show Chromium while running")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        base_url = normalize_base_url(args.base_url)
        targets = resolve_targets(base_url, args.all_previews, args.target_name)
    except ValueError as exc:
        emit({"type": "fatal", "status": "FAIL", "error": str(exc), "runner_version": RUNNER_VERSION})
        return 2

    results: list[dict[str, Any]] = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=not args.headed)
            try:
                for target, url, suite, width, height in iter_cells(
                    targets, include_large=args.all_previews
                ):
                    result = run_cell(browser, target, url, suite, width, height, args.timeout_ms)
                    results.append(result)
                    emit(result)
            finally:
                browser.close()
    except Exception as exc:
        emit(
            {
                "type": "fatal",
                "status": "FAIL",
                "error": f"{type(exc).__name__}:{exc}",
                "runner_version": RUNNER_VERSION,
            }
        )
        return 2

    suites: dict[str, dict[str, int]] = {}
    for result in results:
        suite = suites.setdefault(result["suite"], {"pass": 0, "fail": 0, "total": 0})
        suite["total"] += 1
        suite["pass" if result["status"] == "PASS" else "fail"] += 1
    passed = sum(1 for result in results if result["status"] == "PASS")
    failed = len(results) - passed
    emit(
        {
            "type": "summary",
            "runner_version": RUNNER_VERSION,
            "status": "PASS" if failed == 0 else "FAIL",
            "mode": "all-previews" if args.all_previews else "single-preview",
            "targets": len(targets),
            "limitations": [
                "visual review is still required for heads/hair, overlaps, and microtext",
                "general Action Bar and form interaction smoke is not included beyond final-dev3 Hero state sync",
            ],
            "suites": suites,
            "totals": {"pass": passed, "fail": failed, "total": len(results)},
        }
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
