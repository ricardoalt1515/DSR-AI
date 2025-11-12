# Frontend Theming Guidelines

## Semantic Color Tokens
- Use the CSS custom properties defined in `app/globals.css` (e.g. `--primary`, `--success`, `--warning`) through Tailwind utility aliases like `bg-primary`, `text-success`, `border-warning`.
- For domain-specific accents leverage the mapped tokens: `treatment-*` and `data-*` are available as `bg-treatment-primary`, `text-data-target`, etc.
- Prefer semantic variants (`variant="destructive"`, `text-muted-foreground`, `bg-card`) instead of raw palette utilities.

## Light / Dark Parity
- Avoid hardcoded `dark:` color overrides; tokens already adapt for dark mode.
- When subtle translucency is needed, prefer `/` opacity suffixes on token-driven classes (e.g. `bg-card/60`).

## Component Patterns
- Buttons and badges expose semantic variants that route to the shared tokens (see `components/ui/button.tsx`, `components/ui/badge.tsx`). Use those before authoring new bespoke colors.
- For gradients or animated fills, mix the tokenized colors (`from-primary/80 to-primary`) rather than hex codes.

## Linting & CI
- The `check:colors` npm script (`node scripts/check-colors.mjs`) blocks usage of Tailwind palette utilities like `text-blue-600`. CI calls this via `amplify.yml`. Run `npm run check:colors` locally when touching styles.

## Updating Tokens
- Adjust base definitions in `app/globals.css`. Remember to mirror changes inside the `.dark` block for parity and update the `@theme inline` mapping if you add new semantic tokens.
- Keep the optional `@supports not (color: oklch())` fallback in sync for wider browser support.

## Common Recipes
- Info banners: `border-warning/40 bg-warning/10 text-warning`.
- Success states: `border-success/40 bg-success/12 text-success`, buttons `bg-success text-success-foreground`.
- Neutral surfaces: use `bg-card`, `border-border/40`, `text-muted-foreground`.

Following these conventions keeps light/dark consistent and ensures the color guard stays green in CI.
