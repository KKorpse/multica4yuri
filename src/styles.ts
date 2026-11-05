/**
 * Scoped styles for the board. Everything derives from the host theme tokens so
 * light and dark themes, fonts and density follow Yuri without extra config.
 */
export const CSS = `
.ysb-root {
  --ysb-fg: var(--foreground, #e7e7ea);
  --ysb-muted: var(--muted-foreground, #8b8f98);
  --ysb-border: var(--border, rgba(127, 127, 127, 0.22));
  --ysb-hover: var(--interactive-hover, color-mix(in srgb, var(--ysb-fg) 7%, transparent));
  --ysb-accent: var(--primary, #6f8cff);
  --ysb-accent-fg: var(--primary-foreground, #fff);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--ysb-fg);
  background: var(--background, transparent);
  font-size: 13px;
}
.ysb-root * { box-sizing: border-box; }

.ysb-header {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--ysb-border);
}
.ysb-headrow { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ysb-title { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.ysb-sub { margin: 4px 0 0; color: var(--ysb-muted); font-size: 12px; }
.ysb-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ysb-search { width: 280px; max-width: 46vw; }
.ysb-sep { width: 1px; height: 18px; background: var(--ysb-border); flex: none; }

.ysb-input, .ysb-select, .ysb-textarea {
  min-width: 0;
  border: 1px solid var(--form-control-border, var(--ysb-border));
  border-radius: 8px;
  background: var(--form-control-background, color-mix(in srgb, var(--ysb-fg) 5%, transparent));
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12.5px;
  padding: 6px 9px;
  outline: none;
  transition: border-color 120ms ease, background 120ms ease;
}
.ysb-input::placeholder, .ysb-textarea::placeholder { color: color-mix(in srgb, var(--ysb-muted) 80%, transparent); }
.ysb-input:focus, .ysb-select:focus, .ysb-textarea:focus { border-color: var(--ysb-accent); }
.ysb-select { cursor: pointer; }
.ysb-textarea { min-height: 112px; resize: vertical; line-height: 1.55; }
.ysb-input.is-invalid { border-color: #e06c75; }

.ysb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--ysb-border);
  border-radius: 8px;
  background: transparent;
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
}
.ysb-btn:hover:not(:disabled) { background: var(--ysb-hover); }
.ysb-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ysb-btn.primary { background: var(--ysb-accent); border-color: transparent; color: var(--ysb-accent-fg); }
.ysb-btn.primary:hover:not(:disabled) { background: color-mix(in srgb, var(--ysb-accent) 86%, #000); }
.ysb-btn.ghost { border-color: transparent; color: var(--ysb-muted); }
.ysb-btn.ghost:hover:not(:disabled) { color: var(--ysb-fg); }
.ysb-btn.danger { color: #e06c75; border-color: color-mix(in srgb, #e06c75 38%, transparent); }
.ysb-btn.small { height: 26px; padding: 0 9px; font-size: 11.5px; }
.ysb-icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ysb-muted);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}
.ysb-icon-btn:hover { background: var(--ysb-hover); color: var(--ysb-fg); }

.ysb-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ysb-field { display: inline-flex; align-items: center; gap: 6px; color: var(--ysb-muted); font-size: 11.5px; }
.ysb-field .ysb-select { height: 27px; padding: 0 24px 0 8px; }
.ysb-check { display: inline-flex; align-items: center; gap: 5px; color: var(--ysb-muted); font-size: 11.5px; cursor: pointer; user-select: none; }
.ysb-check input { accent-color: var(--ysb-accent); margin: 0; }
.ysb-check:hover { color: var(--ysb-fg); }

.ysb-chiprow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ysb-chiprow-label { color: var(--ysb-muted); font-size: 11px; margin-right: 1px; }
.ysb-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 9px;
  border: 1px solid var(--ysb-border);
  border-radius: 99px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 11.5px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.ysb-chip:hover { background: var(--ysb-hover); color: var(--ysb-fg); }
.ysb-chip.is-on {
  color: var(--ysb-fg);
  border-color: color-mix(in srgb, var(--ysb-chip, var(--ysb-accent)) 55%, transparent);
  background: color-mix(in srgb, var(--ysb-chip, var(--ysb-accent)) 16%, transparent);
}
.ysb-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ysb-chip, currentColor); flex: none; }
.ysb-chip-count { color: var(--ysb-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }

.ysb-board {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px 20px 20px;
  overflow-x: auto;
  overflow-y: hidden;
}
.ysb-col {
  flex: 0 0 300px;
  max-width: 340px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ysb-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ysb-fg) 2.5%, transparent);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.ysb-col.is-over {
  border-color: color-mix(in srgb, var(--ysb-accent) 70%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ysb-accent) 35%, transparent);
}
.ysb-col-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ysb-border);
}
.ysb-col-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ysb-col-count { color: var(--ysb-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.ysb-col-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; }
.ysb-col-empty {
  margin: 4px;
  padding: 18px 10px;
  border: 1px dashed var(--ysb-border);
  border-radius: 9px;
  color: var(--ysb-muted);
  font-size: 11.5px;
  text-align: center;
}
.ysb-insert { height: 2px; margin: 1px 3px; border-radius: 2px; background: var(--ysb-accent); flex: none; }

.ysb-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 11px;
  border: 1px solid var(--ysb-border);
  border-radius: 10px;
  background: var(--background, transparent);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, opacity 120ms ease;
}
.ysb-card:hover { border-color: color-mix(in srgb, var(--ysb-fg) 28%, transparent); background: color-mix(in srgb, var(--ysb-fg) 3%, transparent); }
.ysb-card.is-dragging { opacity: 0.38; }
.ysb-card-top { display: flex; align-items: flex-start; gap: 7px; }
.ysb-dot { width: 7px; height: 7px; margin-top: 5px; border-radius: 50%; flex: none; }
.ysb-card-title {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 550;
  line-height: 1.38;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.ysb-run-dot {
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  flex: none;
  background: #5fbf8f;
  animation: ysb-pulse 1.4s ease-in-out infinite;
}
.ysb-desc {
  margin: 0;
  color: var(--ysb-muted);
  font-size: 11.5px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.ysb-card-labels { display: flex; flex-wrap: wrap; gap: 4px; }
.ysb-label {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border: 1px solid color-mix(in srgb, var(--ysb-label) 40%, transparent);
  border-radius: 99px;
  background: color-mix(in srgb, var(--ysb-label) 14%, transparent);
  color: color-mix(in srgb, var(--ysb-label) 78%, var(--ysb-fg));
  font-size: 10.5px;
  line-height: 1.5;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-card-foot { display: flex; align-items: center; gap: 7px; min-width: 0; color: var(--ysb-muted); font-size: 10.5px; }
.ysb-agent { display: inline-flex; align-items: center; gap: 4px; min-width: 0; max-width: 44%; }
.ysb-agent-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ysb-agent-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ysb-agent); flex: none; }
.ysb-dir { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.85; }
.ysb-time { flex: none; }
.ysb-unplanned { padding: 0 5px; border: 1px dashed var(--ysb-border); border-radius: 4px; font-size: 9.5px; }

.ysb-loading, .ysb-error-box {
  flex: none;
  align-self: flex-start;
  padding: 22px 18px;
  color: var(--ysb-muted);
  font-size: 12.5px;
}
.ysb-error-box { display: flex; flex-direction: column; gap: 8px; color: #e06c75; }

.ysb-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.44);
  backdrop-filter: blur(3px);
}
.ysb-modal {
  width: min(720px, 100%);
  max-height: 86vh;
  overflow: auto;
  padding: 18px;
  border: 1px solid var(--ysb-border);
  border-radius: 14px;
  background: var(--background, #17181b);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
}
.ysb-modal.wide { width: min(780px, 100%); }
.ysb-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ysb-modal-title { margin: 0; font-size: 16px; font-weight: 600; }
.ysb-modal-sub { margin: 4px 0 0; color: var(--ysb-muted); font-size: 11.5px; line-height: 1.5; }
.ysb-form { display: flex; flex-direction: column; gap: 12px; }
.ysb-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ysb-form-item { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ysb-form-item > span { color: var(--ysb-muted); font-size: 11.5px; }
.ysb-tags { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.ysb-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border: 1px solid color-mix(in srgb, var(--ysb-label) 42%, transparent);
  border-radius: 99px;
  background: color-mix(in srgb, var(--ysb-label) 14%, transparent);
  color: color-mix(in srgb, var(--ysb-label) 78%, var(--ysb-fg));
  font-size: 11px;
}
.ysb-tag button { border: 0; background: transparent; color: inherit; opacity: 0.6; cursor: pointer; padding: 0; font-size: 12px; line-height: 1; }
.ysb-tag button:hover { opacity: 1; }
.ysb-tag-input { min-width: 160px; flex: 1; }
.ysb-suggestions { display: flex; flex-wrap: wrap; gap: 4px; }
.ysb-suggestion {
  padding: 0 7px;
  height: 21px;
  border: 1px dashed var(--ysb-border);
  border-radius: 99px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.ysb-suggestion:hover { color: var(--ysb-fg); border-color: color-mix(in srgb, var(--ysb-fg) 30%, transparent); }
.ysb-modal-foot { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ysb-border); }
.ysb-foot-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.ysb-hint { margin: 0; color: var(--ysb-muted); font-size: 11px; line-height: 1.5; }
.ysb-error { margin: 0; color: #e06c75; font-size: 12px; }
.ysb-meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--ysb-muted); font-size: 11px; }
.ysb-mono { font-family: var(--font-mono, ui-monospace, monospace); font-size: 10.5px; }
.ysb-divider { height: 1px; background: var(--ysb-border); margin: 2px 0; }

@keyframes ysb-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
}
@media (max-width: 760px) {
  .ysb-header { padding: 14px 14px 10px; }
  .ysb-board { padding: 10px 14px 14px; gap: 10px; }
  .ysb-col { flex-basis: 84vw; }
  .ysb-search { width: 100%; max-width: none; }
  .ysb-form-row { grid-template-columns: 1fr; }
}
`;
