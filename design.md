# Design - CoreParseApp

A locked design system for the CoreParse marketing and support site. Every page should reuse these tokens and the same product-workbench voice.

## Genre
modern-minimal

## Macrostructure Family
- Marketing pages: Workbench, with real product screenshots as the primary proof.
- Content pages: Long-form utility pages using the same nav, typography, rules, and footer.

## Theme
- `--color-paper` cool near-white OKLCH paper
- `--color-ink` cool technical ink
- `--color-accent` cobalt blue, used as a signal color only
- `--color-rule` cool hairline rules

Full values live in `tokens.css`.

## Typography
- Display: Space Grotesk, weight 700, roman.
- Body: Geist, weight 400, roman.
- Mono: JetBrains Mono, weight 500-650, used for small technical labels.
- Headings use roman display type only; no italic headings.

## Spacing
4-point named scale in `tokens.css`. Pages should use named tokens instead of raw spacing values.

## Motion
- Motion stance: restrained.
- Default motion: page-load entrance for hero copy and screenshot, CTA press feedback, screenshot hover lift on pointer devices.
- Reduced-motion fallback: spatial motion collapses to short opacity transitions.

## Microinteractions
- Primary CTA: dark filled pill, single-line label.
- Secondary CTA: light outlined pill.
- Focus states use the cobalt focus ring.
- No celebratory effects, bouncing, custom cursors, or decorative background motion.

## What Pages Must Share
- Floating pill navigation.
- Statement footer.
- Cool paper, ink, and cobalt accent tokens.
- Screenshot-first product proof.
- No fake app/browser chrome around screenshots.

## What Pages May Differ On
- Content pages may be quieter and text-led.
- Marketing sections may use screenshot frames and annotation captions.
- Legal/support copy remains factual and direct.
