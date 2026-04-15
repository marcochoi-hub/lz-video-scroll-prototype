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

console.log("[scroll] boot", { gsap: !!window.gsap, ST: !!window.ScrollTrigger });

if (!window.gsap || !window.ScrollTrigger) {
  console.error("[scroll] GSAP / ScrollTrigger failed to load.");
} else {
  gsap.registerPlugin(ScrollTrigger);

  const card  = document.getElementById("videoCard");
  const video = document.getElementById("brandVideo");
  const slot  = document.querySelector(".hero__card-slot");

  /* ------------------------------------------------------------------ */
  /*  Geometry                                                          */
  /* ------------------------------------------------------------------ */

  function startRect() {
    const s = slot.getBoundingClientRect();
    return { top: s.top, left: s.left, width: s.width, height: s.height };
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

    return () => {
      gsap.set(card, { clearProps: "top,left,width,height,--media-pct,--text-op" });
    };
  });

  /* ------------------------------------------------------------------ */
  /*  Mobile / reduced-motion                                           */
  /* ------------------------------------------------------------------ */
  mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
    gsap.set(card, { clearProps: "top,left,width,height,--media-pct,--text-op" });
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
