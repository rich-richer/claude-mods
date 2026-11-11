# Claude Mods

English | [中文](#中文说明)

Three mods for Claude Code. They work in the terminal and in the Claude desktop app.

| Mod | What it does |
| --- | --- |
| [handoff](handoff) | In the app, an info bar above the prompt shows the model, project, git branch, context bar and 5-hour usage. When the context window is 60% full, a handoff button appears on the same line. Press it (or run `/handoff`) and Claude writes a handoff summary, saves it to `.claude/handoffs/` in your project, clears the conversation, and sends the summary as the first message of the fresh one. |
| [next-steps-plus](next-steps-plus) | After each answer, suggests up to three next prompts above the input box. Press `1`, `2` or `3` to put one in the prompt box as a draft, `0` to dismiss. Colors follow your Claude theme, light or dark. |
| [blast-radius](blast-radius) | Holds a risky shell command (`rm -rf`, `git reset --hard`, `git clean`, a force push, a migration), shows what it would change, and runs it only when you press Proceed. A copy of Anthropic's sample mod. |

## Install

In a terminal session of Claude Code:

```
/plugin install handoff --marketplace rich-richer/claude-mods
/plugin install next-steps-plus --marketplace rich-richer/claude-mods
/plugin install blast-radius --marketplace rich-richer/claude-mods
```

From a shell:

```bash
claude plugin install handoff --marketplace rich-richer/claude-mods
claude plugin install next-steps-plus --marketplace rich-richer/claude-mods
claude plugin install blast-radius --marketplace rich-richer/claude-mods
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `rich-richer/claude-mods`, then **Add plugin**.

Answer `y` to add the marketplace, then pick the user scope so the mods load in every new session.

## handoff

- In the desktop app (and VS Code, mobile) the info bar is always on:
  `[Opus 5.5] │ my-project │ main │ Context ████░░░░░░ 35% │ 5h 用量 23% │ 缓存 42 分`.
  The context bar is green below 60%, yellow from 60% and red from 80%. The branch is hidden outside a git repository. It costs no tokens: it reads local data only.
- `缓存 42 分` counts down the minutes left before the prompt cache goes cold, from the end of Claude's last reply. It assumes the 60-minute cache of a subscription plan (past your usage limits the cache drops to 5 minutes and the countdown runs optimistic). It turns yellow at 15 minutes, red at 5, and reads `缓存已过期` once expired. It is hidden while Claude is answering and before the first reply. Nothing is sent to keep the cache warm.
- From 60% the line adds `[交接到新对话]  ×`. `×` hides the button (not the info bar) until the context grows another 10%.
- In the terminal the info bar is not drawn (a status line plugin such as claude-hud covers it there); from 60% the terminal shows `Context 已用 62%  [交接到新对话]  ×`, in the warning color past 80%.
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

## blast-radius

Copied unchanged from Anthropic's [claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/blast-radius) at commit `569c528`, under the Apache License 2.0 ([blast-radius/LICENSE](blast-radius/LICENSE)). Anthropic shares it as a sample, as-is and without support; see its own [README](blast-radius/README.md).

- Watches the Bash commands Claude runs. A risky one is held, and a pane lists what it would delete, discard or drop, with **Proceed** (`1`) and **Cancel** (`2`, the default). No answer in 10 minutes counts as Cancel.
- It measures with read-only commands (`find`, `du`, `git status`, `git log`, `git clean -n`). For a migration it runs the project's own status command, such as `manage.py showmigrations`.
- It calls no model and costs no tokens.
- It does not hold edits made with Claude's file-editing tools, `mv`, or an `rm` without `-r` or `-f`.

## Uninstall

```bash
claude plugin uninstall handoff
claude plugin uninstall next-steps-plus
claude plugin uninstall blast-radius
```

## License

MIT, except `blast-radius/`, which is Anthropic's code under the Apache License 2.0. See [LICENSE](LICENSE).

---

## 中文说明

这里有三个 Claude Code 的 mod，在终端版和 Claude 桌面 app 里都能用。

| Mod | 功能 |
| --- | --- |
| [handoff](handoff) | 在 app 的输入框上方常驻一行资讯条，显示模型、项目、git 分支、context 进度条和 5 小时用量。Context 用到 6 成时，同一行会出现交接按钮。按下按钮或输入 `/handoff` 后，Claude 会写一份交接摘要，存到项目的 `.claude/handoffs/` 里，然后清空对话，把摘要作为新对话的第一句送出。 |
| [next-steps-plus](next-steps-plus) | Claude 每次回复完，会在输入框上方给出最多 3 个下一步建议。按 `1`、`2`、`3` 把建议填进输入框（不会自动送出），按 `0` 关闭。颜色会跟着你的 Claude 主题变化，浅色、深色都清楚。 |
| [blast-radius](blast-radius) | Claude 要执行危险命令（`rm -rf`、`git reset --hard`、`git clean`、强推、数据库迁移）时先拦下，列出会造成的影响，你按 Proceed 才执行。这是 Anthropic 示例 mod 的原样副本。 |

### 安装

在 Claude Code 终端版的对话里输入：

```
/plugin install handoff --marketplace rich-richer/claude-mods
/plugin install next-steps-plus --marketplace rich-richer/claude-mods
/plugin install blast-radius --marketplace rich-richer/claude-mods
```

或者在系统终端里执行：

```bash
claude plugin install handoff --marketplace rich-richer/claude-mods
claude plugin install next-steps-plus --marketplace rich-richer/claude-mods
claude plugin install blast-radius --marketplace rich-richer/claude-mods
```

桌面 app 里不能用 `/plugin`，请改用菜单：点输入框旁的 **+**，选 **Plugins**，再选 **Add marketplace**，填 `rich-richer/claude-mods`，然后点 **Add plugin**。

安装时问是否添加 marketplace，回答 `y`。范围选 user，以后每个新对话都会自动加载。

### handoff

- 在桌面 app（以及 VS Code、手机）里，输入框上方常驻资讯条：
  `[Opus 5.5] │ 项目名 │ main │ Context ████░░░░░░ 35% │ 5h 用量 23% │ 缓存 42 分`。
  进度条低于 6 成是绿色，6～8 成黄色，8 成以上红色；不是 git 仓库时不显示分支。资讯条只读本机数据，不消耗 token。
- `缓存 42 分` 是提示缓存（prompt cache）还剩几分钟过期，从 Claude 最后一次回复完开始倒数。按订阅方案的 60 分钟计算；用量超额时缓存会缩短为 5 分钟，倒数会比实际乐观。剩 15 分钟变黄、5 分钟变红，过期显示 `缓存已过期`。Claude 回复中、以及还没回复过一轮时不显示。不会自动送消息保温。
- 用到 6 成时，同一行末尾出现 `[交接到新对话]  ×`。按 `×` 只隐藏按钮、不隐藏资讯条，等 context 再多用 1 成时按钮重新出现。
- 终端版不显示资讯条（可改用 claude-hud 这类状态栏插件）；用到 6 成时显示 `Context 已用 62%  [交接到新对话]  ×`，超过 8 成变成警示色。
- 交接摘要分 6 段：目标、已完成、未完成 / 下一步、改过的文件、要注意的地方、关键信息（命令、网址、设定值等）。
- 摘要在后台根据同一段对话来写，不会在对话里多出一轮。
- Claude 回复时按钮会变灰，要等回复完才能按。
- 交接前对话至少要有一轮完整回复，否则写不出摘要，对话也不会被清空。

### next-steps-plus

改自 Thariq Shihipar 的 [next-steps](https://github.com/anthropics/claude-plugins-community/tree/main/next-steps)（MIT 授权），功能和原版相同。改动有两处：

- 除了终端版，桌面 app 里也能显示。
- 不用固定颜色，改用主题色：`next:` 标题是 Claude 橙色，以 `/` 开头的指令类建议是蓝色，`dismiss` 和 `next steps…` 是灰色。

| 设定 | 默认值 | 作用 |
| --- | --- | --- |
| `minAnswerChars` | `80` | Claude 的回复少于这个字数时不给建议 |
| `suggestSkills` | `true` | 让建议里可以出现这个对话可用的技能和斜杠指令 |

### blast-radius

原样复制自 Anthropic 的 [claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/blast-radius)，版本是提交 `569c528`，采用 Apache License 2.0（见 [blast-radius/LICENSE](blast-radius/LICENSE)）。Anthropic 把它作为示例按原样提供，不提供支持，详见它自己的 [README](blast-radius/README.md)。

- 只检查 Claude 执行的 Bash 命令。遇到危险命令先暂停，弹出面板列出会删除、丢弃或丢失的内容，并给出 **Proceed**（`1`）和 **Cancel**（`2`，默认）两个按钮。10 分钟内没回应就当作取消。
- 测量影响时只用只读命令（`find`、`du`、`git status`、`git log`、`git clean -n`）。遇到数据库迁移时，会执行项目自己的状态查询指令，例如 `manage.py showmigrations`。
- 不调用模型，不消耗 token。
- 不会拦下用 Claude 编辑工具改的文件、`mv`，以及不带 `-r` 或 `-f` 的 `rm`。

### 移除

```bash
claude plugin uninstall handoff
claude plugin uninstall next-steps-plus
claude plugin uninstall blast-radius
```

### 授权

MIT；`blast-radius/` 除外，它是 Anthropic 的代码，采用 Apache License 2.0。详见 [LICENSE](LICENSE)。
