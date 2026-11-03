# Claude Mods

Two mods for Claude Code. They work in the terminal and in the Claude desktop app.

| Mod | What it does |
| --- | --- |
| [handoff](handoff) | When the context window is 60% full, a handoff button appears above the prompt. Press it (or run `/handoff`) and Claude writes a handoff summary, saves it to `.claude/handoffs/` in your project, clears the conversation, and sends the summary as the first message of the fresh one. |
| [next-steps-plus](next-steps-plus) | After each answer, suggests up to three next prompts above the input box. Press `1`, `2` or `3` to put one in the prompt box as a draft, `0` to dismiss. Colors follow your Claude theme, light or dark. |

## Install

In a terminal session of Claude Code:

```
/plugin install handoff --marketplace rich-richer/claude-mods
/plugin install next-steps-plus --marketplace rich-richer/claude-mods
```

From a shell:

```bash
claude plugin install handoff --marketplace rich-richer/claude-mods
claude plugin install next-steps-plus --marketplace rich-richer/claude-mods
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `rich-richer/claude-mods`, then **Add plugin**.

Answer `y` to add the marketplace, then pick the user scope so the mods load in every new session.

## handoff

- The bar reads `Context 已用 62%  [交接到新对话]  ×` and turns to the warning color past 80%.
- `×` hides it until the context grows another 10%.
- The summary has six parts: goal, done, not done / next steps, files changed, things to watch out for, and key details (commands, URLs, settings).
- The summary is written in the background from the same conversation, so it does not add a turn.
- The button is greyed out while Claude is answering.

## next-steps-plus

Based on [next-steps](https://github.com/anthropics/claude-plugins-community/tree/main/next-steps) by Thariq Shihipar (MIT). It behaves the same way. The changes:

- It draws in the desktop app as well as the terminal.
- It uses theme colors rather than fixed ones: the `next:` heading uses the Claude accent, a suggestion that runs a `/command` is blue, and `dismiss` and `next steps…` are grey.

| Option | Default | What it does |
| --- | --- | --- |
| `minAnswerChars` | `80` | Skip suggestions after answers shorter than this |
| `suggestSkills` | `true` | Tell the suggester which skills and slash commands the session has |

## Uninstall

```bash
claude plugin uninstall handoff
claude plugin uninstall next-steps-plus
```

## License

MIT. See [LICENSE](LICENSE).
