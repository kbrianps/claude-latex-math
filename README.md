# latex-math

A Claude Code mod that draws LaTeX formulas as images in your terminal, instead of raw `$$\frac{...}{...}$$` source.

![Before and after: display formulas drawn as images in Ghostty](assets/demo.gif)

Display math in Claude's replies, `$$...$$` and `\[...\]`, is compiled with your local LaTeX (`latex` + `dvipng`) and drawn in place. Everything else stays text.

## Requirements

- LaTeX with `amsmath` and `dvipng` on your `PATH`:
  - Debian/Ubuntu: `sudo apt install texlive-latex-base dvipng`
  - Fedora: `sudo dnf install texlive-scheme-basic texlive-dvipng`
  - macOS: `brew install --cask basictex`, then `sudo tlmgr install dvipng`
- Claude Code 2.1.287 or newer (mods support).

Without LaTeX the mod does nothing and you see the formulas as text.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install latex-math --marketplace kbrianps/claude-latex-math
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install latex-math --marketplace kbrianps/claude-latex-math
```

## Terminals

| Terminal | Result |
| --- | --- |
| Ghostty | image |
| kitty | image |
| tmux with passthrough (see below) | image |
| iTerm2 3.5+ in fullscreen rendering | image, per the Claude Code docs (not tested yet) |
| GNOME Terminal, Ptyxis, VS Code terminal | the LaTeX source as text |

The picture uses the kitty graphics protocol. Where the terminal can't draw it, you get the original text.

### tmux

Add to `~/.tmux.conf` and restart tmux:

```
set -g allow-passthrough on
set -g focus-events on
```

## Options

Set these with `/config` or `claude plugin configure latex-math@claude-latex-math`.

| Option | Default | Meaning |
| --- | --- | --- |
| `color` | `auto` | Formula ink. `auto` is light gray on Claude Code's dark themes and dark gray on its light ones; a hex color such as `#adbac7` matches your terminal's text exactly |
| `size` | `1` | Formula size relative to the default, which sits a little above terminal text at common font sizes |

With ImageMagick on your `PATH`, each formula is padded to whole terminal cells, so the terminal never stretches it.

## What it does not do

- Inline math (`$x^2$` inside a sentence) stays text: an image takes whole terminal rows.
- Formulas inside code blocks stay text.
- A formula LaTeX can't compile stays text.
- The first render of each formula takes about a second (one `latex` run). Results are cached for the session.
- Desktop app, VS Code extension and mobile are left untouched.

## Development

```
claude plugin validate .
claude plugin test .
```

The plugin API this mod uses is early access in Claude Code and may change between releases. Tested with Claude Code 2.1.311.

## See also

[inline-images](https://github.com/kbrianps/claude-inline-images): draws the PNGs Claude reads and sends you inline in the terminal.

## License

MIT
