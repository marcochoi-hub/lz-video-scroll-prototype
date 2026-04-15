/* Scroll-driven Meet our people card — simplified timing.
 *
 * Both animations start at scroll=0 and run in parallel:
 *
 *   - Video fill + text fade  : finishes in the first 25% of scroll
 *   - Card travel + expand    : runs across the full 0 → 1 scroll range
 *
 * So as soon as the user scrolls, the card begins to grow + move toward
 * centre, and within a short distance the video has already covered the
 * text and is fully visible. The rest of the scroll is just the card
 * continuing to expand into its final centred 2/3-viewport rect.
 *
 * Fully scrubbed and reversible — every tween is a fromTo with function-
 * based values that re-resolve on ScrollTrigger.refresh().
 */

console.log("[scroll] boot", {
  gsap: !!window.gsap,
  ST: !!window.ScrollTrigger,
  scrollY: window.scrollY,
  vh: window.innerHeight,
});

// Disable browser scroll-restoration so a reload always starts at y=0.
// Without this, a mid-animation scroll position gets restored on refresh
// and the card renders mid-animation instead of at its bottom-left rest.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

if (!window.gsap || !window.ScrollTrigger) {
  console.error("[scroll] GSAP / ScrollTrigger failed to load.");
} else {
  gsap.registerPlugin(ScrollTrigger);

  const card  = document.getElementById("videoCard");
  const video = document.getElementById("brandVideo");

  /* ------------------------------------------------------------------ */
  /*  Geometry                                                          */
  /*  Computed from viewport directly — no DOM-measurement dependency.  */
  /*  Rest rect = bottom-left, 40px inset, 401×196 (shrinks on narrow   */
  /*  viewports so it never overflows).                                 */
  /* ------------------------------------------------------------------ */

  const INSET = 40;
  const REST_W = 401;
  const REST_H = 196;

  function startRect() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(REST_W, vw - INSET * 2);
    const h = w * (REST_H / REST_W);
    return {
      left: INSET,
      top:  vh - INSET - h,
      width:  w,
      height: h,
    };
  }

  function endRect() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const pct = vw >= 1024 ? (2 / 3) : 0.9;
    const w = vw * pct;
    const h = w * (196 / 401);
    return { top: (vh - h) / 2, left: (vw - w) / 2, width: w, height: h };
  }

  function restMediaPct() {
    const s = startRect();
    const innerW = s.width  - 16;
    const innerH = s.height - 16;
    return (innerH / innerW) * 100;
  }

  /* ------------------------------------------------------------------ */
  /*  Animation — desktop / tablet                                      */
  /* ------------------------------------------------------------------ */

  const mm = gsap.matchMedia();

  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {

    video.play?.().catch(() => {});

    /* Snap the card to its rest rect BEFORE any ScrollTrigger evaluates.
       Without this, the card's CSS defaults (top:0, left:0) remain on first
       paint because scrub tweens don't resolve function-based "from" values
       until the first scroll event. We also re-snap on every refresh so the
       rest state stays aligned through resizes and window-load events. */
    const snapToSlot = () => {
      const r = startRect();
      gsap.set(card, {
        top: r.top, left: r.left, width: r.width, height: r.height,
        bottom: "auto", right: "auto",
        "--media-pct": restMediaPct() + "%",
        "--text-op": 1,
      });
    };
    snapToSlot();
    // Reveal the card only after it's snapped to the rest slot — prevents
    // any flash of intermediate position on first paint.
    card.classList.add("is-ready");

    // After every ScrollTrigger refresh (including resizes), re-snap the card
    // to its rest slot IF we're at the top of the page. We listen on "refresh"
    // (not "refreshInit") so this runs AFTER the timeline has re-rendered —
    // otherwise the scrubbed timeline would overwrite our snap with stale
    // pixel values carried over from the previous viewport size.
    const snapIfAtRest = () => {
      if (window.scrollY < 2) snapToSlot();
    };
    ScrollTrigger.addEventListener("refresh", snapIfAtRest);
    // Also re-snap once the page is fully loaded (images / video metadata can
    // shift the slot's computed position after first paint).
    window.addEventListener("load", () => {
      snapToSlot();
      ScrollTrigger.refresh();
    });

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" }, // smooths acceleration slightly vs. linear
      scrollTrigger: {
        trigger: ".scroll-spacer",
        start: "top bottom",
        end:   "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });

    /* ------- Card travel + expand (full 0 → 1 of scroll) ------- */
    tl.fromTo(card,
      { top:    () => startRect().top,
        left:   () => startRect().left,
        width:  () => startRect().width,
        height: () => startRect().height },
      { top:    () => endRect().top,
        left:   () => endRect().left,
        width:  () => endRect().width,
        height: () => endRect().height,
        duration: 1 },
      0
    );

    /* ------- Video covers text (first 0.25 of scroll) ------- */
    tl.fromTo(card,
      { "--media-pct": () => restMediaPct() + "%" },
      { "--media-pct": "100%", duration: 0.25 },
      0
    );
    tl.fromTo(card,
      { "--text-op": 1 },
      { "--text-op": 0, duration: 0.25 },
      0
    );

    /* ------- Cream section pushes the card up ------- */
    /* Starts when .next's top edge reaches the card's bottom edge (so they
       visually "touch"), ends when .next's top reaches the top of the
       viewport (card fully off-screen above). Scrubbed + reversible. */
    const pushTween = gsap.fromTo(card,
      { top: () => endRect().top },
      {
        top: () => -endRect().height,
        ease: "none",
        immediateRender: false,   /* critical: do NOT snap to endRect on load */
        scrollTrigger: {
          trigger: ".next",
          start: () => `top ${endRect().top + endRect().height}px`,
          end: "top top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      }
    );

    return () => {
      pushTween.scrollTrigger?.kill();
      pushTween.kill();
      gsap.set(card, { clearProps: "top,left,width,height,--media-pct,--text-op" });
    };
  });

  /* ------------------------------------------------------------------ */
  /*  Mobile / reduced-motion                                           */
  /* ------------------------------------------------------------------ */
  mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
    gsap.set(card, { clearProps: "top,left,width,height,--media-pct,--text-op" });
    card.classList.add("is-ready");
    video.play?.().catch(() => {});
    return () => {};
  });

  /* ------------------------------------------------------------------ */
  /*  Click → fullscreen                                                */
  /* ------------------------------------------------------------------ */
  card.addEventListener("click", () => {
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      video.muted = false;
      video.requestFullscreen?.().catch(() => video.play?.().catch(() => {}));
    }
  });
}
