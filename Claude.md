# Claude Code Rules

## Auto Commit & Push

Every time a file is changed or updated, automatically commit and push to GitHub.

### Commit Message Format

Use this format for commit messages:

```
<type>: <short description>
```

**Types:**
- `feat` — new feature or addition
- `fix` — bug fix or correction
- `update` — modification or improvement to existing feature
- `style` — formatting, UI changes, no logic change
- `refactor` — code restructuring without behavior change
- `docs` — documentation only
- `chore` — config, dependencies, cleanup

**Examples:**
```
feat: add filter animation to certification section
fix: resolve filtering bug in certificate cards
update: improve card hover effects and tilt animation
style: adjust spacing and typography in hero section
refactor: simplify GSAP ScrollTrigger setup
```

### Rules

- Always commit in **English**
- Keep commit messages **short and descriptive** (no more than 72 characters)
- Push directly to **main** branch
- Do NOT add extra lines or body text in commit messages — title only
- After every change, run: `git add . && git commit -m "<type>: <description>" && git push origin main`
