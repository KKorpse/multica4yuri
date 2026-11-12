/**
 * Visual language ported from Multica's issue board:
 * 280px columns, muted column canvas, flat surface cards, 14/12/11 type scale,
 * status icons instead of dots, and a single compact toolbar.
 */
export const CSS = `
.ysb-root {
  --ysb-fg: var(--foreground, #e7e7ea);
  --ysb-muted: var(--muted-foreground, #8b8f98);
  --ysb-border: var(--border, rgba(127, 127, 127, 0.22));
  --ysb-hover: var(--interactive-hover, color-mix(in srgb, var(--ysb-fg) 6%, transparent));
  --ysb-accent: var(--primary, #6f8cff);
  --ysb-accent-fg: var(--primary-foreground, #fff);
  --ysb-canvas: var(--background, #17181b);
  --ysb-card: var(--card, var(--background, #17181b));
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--ysb-fg);
  background: var(--ysb-canvas);
  font-size: 14px;
}
.ysb-root * { box-sizing: border-box; }

.ysb-header {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 16px 20px 10px;
  border-bottom: 1px solid var(--ysb-border);
}
.ysb-headrow { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ysb-titlewrap { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ysb-title { margin: 0; font-size: 18px; line-height: 28px; font-weight: 600; letter-spacing: -0.01em; }
.ysb-total {
  min-width: 20px;
  height: 20px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ysb-fg) 6%, transparent);
  color: var(--ysb-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ysb-build { color: color-mix(in srgb, var(--ysb-muted) 65%, transparent); font-size: 10.5px; }
.ysb-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.ysb-searchbox {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 250px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--ysb-border);
  border-radius: 6px;
  background: color-mix(in srgb, var(--ysb-fg) 3%, transparent);
  color: var(--ysb-muted);
}
.ysb-searchbox:focus-within { border-color: color-mix(in srgb, var(--ysb-fg) 35%, transparent); }
.ysb-searchbox input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12.5px;
}
.ysb-searchbox input::placeholder { color: var(--ysb-muted); }
.ysb-searchbox input::-webkit-search-cancel-button { filter: grayscale(1); opacity: 0.6; }

.ysb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--ysb-border);
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
}
.ysb-btn:hover:not(:disabled) { background: var(--ysb-hover); }
.ysb-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ysb-btn.is-active { background: var(--ysb-hover); }
.ysb-btn.primary {
  background: var(--ysb-fg);
  border-color: transparent;
  color: var(--ysb-canvas);
}
.ysb-btn.primary:hover:not(:disabled) { background: color-mix(in srgb, var(--ysb-fg) 88%, var(--ysb-canvas)); }
.ysb-btn.ghost { border-color: transparent; color: var(--ysb-muted); }
.ysb-btn.ghost:hover:not(:disabled) { color: var(--ysb-fg); }
.ysb-btn.danger { color: #e06c75; border-color: color-mix(in srgb, #e06c75 35%, transparent); }
.ysb-btn.small { height: 26px; padding: 0 8px; font-size: 11.5px; }
.ysb-iconbtn {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ysb-iconbtn:hover { background: var(--ysb-hover); color: var(--ysb-fg); }
.ysb-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ysb-accent) 18%, transparent);
  color: var(--ysb-accent);
  font-size: 10px;
  font-weight: 600;
}

.ysb-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 28px;
  flex-wrap: wrap;
}
.ysb-tool {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ysb-muted);
  font-size: 12px;
  white-space: nowrap;
}
.ysb-tool select {
  appearance: none;
  height: 24px;
  padding: 0 18px 0 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--ysb-muted) 50%),
    linear-gradient(135deg, var(--ysb-muted) 50%, transparent 50%);
  background-position: calc(100% - 8px) 10px, calc(100% - 4px) 10px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}
.ysb-tool select:hover { background-color: var(--ysb-hover); }
.ysb-toolbar-meta { margin-left: auto; color: var(--ysb-muted); font-size: 11.5px; }

.ysb-filterpanel {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 10px 0 2px;
  border-top: 1px solid var(--ysb-border);
}
.ysb-filtergroup { display: flex; align-items: flex-start; gap: 10px; }
.ysb-filterlabel {
  flex: none;
  width: 34px;
  padding-top: 4px;
  color: var(--ysb-muted);
  font-size: 11.5px;
}
.ysb-filterrow { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-left: 44px; }
.ysb-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ysb-chip {
  height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--ysb-border);
  border-radius: 999px;
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
  border-color: color-mix(in srgb, var(--ysb-accent) 48%, transparent);
  background: color-mix(in srgb, var(--ysb-accent) 10%, transparent);
}
.ysb-chipdot { width: 6px; height: 6px; border-radius: 50%; background: var(--ysb-label, currentColor); flex: none; }
.ysb-chipcount { color: var(--ysb-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.ysb-status-icon { flex: none; }
.ysb-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ysb-muted);
  font-size: 11.5px;
  cursor: pointer;
  user-select: none;
}
.ysb-check:hover { color: var(--ysb-fg); }
.ysb-check input { accent-color: var(--ysb-accent); margin: 0; }

.ysb-board {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px 20px 20px;
  overflow-x: auto;
  overflow-y: hidden;
}
.ysb-col {
  flex: 0 0 280px;
  width: 280px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ysb-fg) 4%, transparent);
  transition: background 120ms ease, box-shadow 120ms ease;
}
.ysb-col.is-over {
  background: color-mix(in srgb, var(--ysb-accent) 9%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ysb-accent) 32%, transparent);
}
.ysb-colhead {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px 5px;
}
.ysb-coltitle {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-colcount { color: var(--ysb-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.ysb-coladd {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ysb-muted);
  cursor: pointer;
  opacity: 0.65;
}
.ysb-coladd:hover { background: var(--ysb-hover); color: var(--ysb-fg); opacity: 1; }
.ysb-colbody {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 6px 8px;
}
.ysb-colempty { padding: 32px 8px; text-align: center; color: var(--ysb-muted); font-size: 12px; }
.ysb-insert { height: 2px; margin: 1px 2px; border-radius: 2px; background: var(--ysb-accent); flex: none; }

.ysb-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--ysb-fg) 11%, transparent);
  border-radius: 8px;
  background: var(--ysb-card);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}
.ysb-card:hover {
  border-color: color-mix(in srgb, var(--ysb-fg) 22%, transparent);
  background: color-mix(in srgb, var(--ysb-fg) 2%, var(--ysb-card));
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.06);
}
.ysb-card.is-dragging { opacity: 0.4; }
.ysb-cardtop { display: flex; align-items: center; justify-content: space-between; min-height: 14px; gap: 6px; }
.ysb-cardid {
  color: var(--ysb-muted);
  font-size: 11px;
  line-height: 15px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}
.ysb-run {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5fbf8f;
  animation: ysb-pulse 1.4s ease-in-out infinite;
  flex: none;
}
.ysb-cardtitle {
  margin: 0;
  color: var(--ysb-fg);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.ysb-carddesc {
  margin: 0;
  color: var(--ysb-muted);
  font-size: 12px;
  line-height: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.ysb-cardchips { margin-top: 1px; }
.ysb-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ysb-fg) 6%, transparent);
  color: var(--ysb-muted);
  font-size: 11px;
  line-height: 15px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ysb-label .ysb-chipdot { background: var(--ysb-label, var(--ysb-muted)); }
.ysb-label-more { color: var(--ysb-muted); }
.ysb-cardmeta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 2px;
  color: var(--ysb-muted);
  font-size: 11px;
  line-height: 15px;
}
.ysb-agent { display: inline-flex; align-items: center; gap: 4px; min-width: 0; max-width: 46%; }
.ysb-avatar {
  width: 16px;
  height: 16px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ysb-avatar, #8b94a5) 20%, transparent);
  color: var(--ysb-avatar, #8b94a5);
  font-size: 9px;
  font-weight: 600;
}
.ysb-agentname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ysb-metadir { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.85; }
.ysb-time { flex: none; }

.ysb-loading, .ysb-empty {
  flex: none;
  align-self: flex-start;
  padding: 28px 18px;
  color: var(--ysb-muted);
  font-size: 12.5px;
}
.ysb-empty p { margin: 4px 0 0; font-size: 12px; }
.ysb-errorbox {
  flex: none;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 18px;
  color: #e06c75;
  font-size: 12.5px;
}

.ysb-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(3px);
}
.ysb-modal {
  width: min(680px, 100%);
  max-height: 86vh;
  overflow: auto;
  padding: 20px;
  border: 1px solid var(--ysb-border);
  border-radius: 12px;
  background: var(--ysb-canvas);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.38);
}
.ysb-modal.wide { width: min(740px, 100%); }
.ysb-modalhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.ysb-modaltitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
.ysb-modalsub { margin: 4px 0 0; color: var(--ysb-muted); font-size: 11.5px; line-height: 16px; }
.ysb-form { display: flex; flex-direction: column; gap: 12px; }
.ysb-formrow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ysb-formitem { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ysb-formitem > span { color: var(--ysb-muted); font-size: 11.5px; font-weight: 500; }
.ysb-sendcheck { align-self: end; padding-bottom: 7px; }

.ysb-input, .ysb-select, .ysb-textarea {
  min-width: 0;
  height: 32px;
  padding: 0 9px;
  border: 1px solid var(--ysb-border);
  border-radius: 6px;
  background: color-mix(in srgb, var(--ysb-fg) 3%, transparent);
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12.5px;
  outline: none;
  transition: border-color 120ms ease;
}
.ysb-input::placeholder, .ysb-textarea::placeholder { color: var(--ysb-muted); }
.ysb-input:focus, .ysb-select:focus, .ysb-textarea:focus {
  border-color: color-mix(in srgb, var(--ysb-fg) 35%, transparent);
}
.ysb-select { cursor: pointer; }
.ysb-textarea {
  height: auto;
  min-height: 104px;
  padding: 8px 9px;
  line-height: 1.55;
  resize: vertical;
}
.ysb-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ysb-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--ysb-label, #8b94a5) 32%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ysb-label, #8b94a5) 12%, transparent);
  color: color-mix(in srgb, var(--ysb-label, #8b94a5) 78%, var(--ysb-fg));
  font-size: 11px;
}
.ysb-tag button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.ysb-tag button:hover { opacity: 1; }
.ysb-taginput { flex: 1; min-width: 160px; height: 28px; font-size: 12px; }
.ysb-suggestions { display: flex; flex-wrap: wrap; gap: 4px; }
.ysb-suggestion {
  height: 22px;
  padding: 0 8px;
  border: 1px dashed var(--ysb-border);
  border-radius: 999px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.ysb-suggestion:hover { color: var(--ysb-fg); border-color: color-mix(in srgb, var(--ysb-fg) 30%, transparent); }
.ysb-hint { margin: 0; color: var(--ysb-muted); font-size: 11.5px; line-height: 16px; }
.ysb-error { margin: 0; color: #e06c75; font-size: 12px; }
.ysb-meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--ysb-muted); font-size: 11px; }
.ysb-mono { font-family: var(--font-mono, ui-monospace, monospace); font-size: 10.5px; }
.ysb-modalfoot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--ysb-border);
}
.ysb-footright { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.ysb-loadmore {
  flex: none;
  height: 28px;
  margin: 2px 4px 4px;
  border: 1px dashed var(--ysb-border);
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.ysb-loadmore:hover { color: var(--ysb-fg); border-color: color-mix(in srgb, var(--ysb-fg) 30%, transparent); }
.ysb-mobile {
  padding: 28px 20px;
  color: var(--ysb-muted);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
}

/* Right work-status widget: compact task identity for the open conversation. */
.ysb-widget {
  display: flex;
  flex-direction: column;
  gap: calc(0.25rem * var(--padding-scale, 1));
  min-width: 0;
  margin: 0.25rem 0.5rem;
  padding: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, transparent);
  border-radius: var(--radius-lg, 8px);
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
  color: var(--muted-foreground);
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: var(--text-ui-label);
  font-weight: var(--ui-regular-font-weight, 400);
}
.ysb-widget-empty {
  color: var(--muted-foreground);
  font-size: var(--text-meta, 12px);
  line-height: 1.4;
}
.ysb-widget-head {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0.375rem;
}
.ysb-widget-status {
  min-width: 0;
  overflow: hidden;
  color: var(--muted-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-widget-time {
  margin-left: auto;
  flex: none;
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
  font-variant-numeric: tabular-nums;
}
.ysb-widget-run {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--status-success);
  animation: ysb-pulse 1.4s ease-in-out infinite;
}
.ysb-widget-title {
  display: -webkit-box;
  overflow: hidden;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font: inherit;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.ysb-widget-title:hover {
  color: var(--primary);
}
.ysb-widget-desc {
  margin: 0;
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ysb-widget-desc a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.ysb-widget-desc a:hover {
  color: var(--primary-hover, var(--primary));
}
.ysb-widget-more {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font: inherit;
  font-size: var(--text-meta, 11px);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.ysb-widget-more:hover {
  color: var(--primary-hover, var(--primary));
}
.ysb-widget-chevron {
  font-size: 10px;
  line-height: 1;
}
.ysb-widget-meta {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0.25rem;
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
  line-height: 1.3;
}
.ysb-widget-dir {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-widget-sep { flex: none; opacity: 0.5; }
.ysb-widget-agent {
  flex: none;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-widget-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-width: 0;
}
.ysb-widget-label {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-width: 0;
  gap: 0.25rem;
  padding: 0 0.375rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ysb-label) 14%, transparent);
  color: var(--ysb-label);
  font-size: var(--text-micro, 10px);
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-widget-chipdot {
  flex: none;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
}
.ysb-widget-outputs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  margin-top: 2px;
}
.ysb-widget-outputlabel {
  color: var(--muted-foreground);
  font-size: var(--text-micro, 10px);
}
.ysb-widget-output {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font: inherit;
  font-size: var(--text-meta, 11px);
  text-align: left;
  cursor: pointer;
}
.ysb-widget-output:hover {
  text-decoration: underline;
}
.ysb-widget-outputicon { flex: none; }
.ysb-widget-outputtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-widget-outputtext,
.ysb-widget-outputmore {
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
}
.ysb-widget-actions {
  display: flex;
  gap: 6px;
  min-width: 0;
  margin-top: 2px;
}
.ysb-widget-action {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent);
  border-radius: var(--radius-md, 6px);
  background: var(--surface-muted, color-mix(in srgb, var(--foreground) 5%, transparent));
  color: var(--foreground);
  font: inherit;
  font-size: var(--text-meta, 11px);
  line-height: 1.4;
  text-align: center;
  cursor: pointer;
}
.ysb-widget-action:hover {
  background: var(--interactive-hover);
}
.ysb-widget-action.primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: transparent;
}
.ysb-widget-action.primary:hover {
  background: var(--primary-hover, var(--primary));
}

/* Task details dialog (portaled out of the narrow work-status column). */
.ysb-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #000 40%, transparent);
}
.ysb-detail {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: min(80dvh, 720px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent);
  border-radius: 12px;
  background: var(--popover, var(--background));
  color: var(--foreground);
  font-family: var(--font-sans, system-ui, sans-serif);
  box-shadow: 0 16px 48px color-mix(in srgb, #000 35%, transparent);
}
.ysb-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ysb-detail-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ysb-detail-title {
  margin: 0;
  color: var(--foreground);
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  word-break: break-word;
}
.ysb-detail-close {
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.ysb-detail-close:hover {
  background: var(--interactive-hover);
  color: var(--foreground);
}
.ysb-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}
.ysb-detail-statusline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
}
.ysb-detail-dot { opacity: 0.5; }
.ysb-detail-desc {
  margin: 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ysb-detail-desc a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ysb-detail-outputs h3 {
  margin: 0 0 6px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}
.ysb-detail-output {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  border-radius: 6px;
  background: var(--surface-muted, color-mix(in srgb, var(--foreground) 4%, transparent));
  color: var(--primary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.ysb-detail-output + .ysb-detail-output { margin-top: 6px; }
.ysb-detail-output:hover { background: var(--interactive-hover); }
.ysb-detail-outputtext {
  margin-top: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}
.ysb-detail-outputtext strong {
  display: block;
  color: var(--foreground);
  font-weight: 500;
}
.ysb-detail-outputtext p {
  margin: 2px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ysb-detail-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}
.ysb-detail-meta dt { font-weight: 500; }
.ysb-detail-meta dd {
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-all;
}
.ysb-preview-path {
  overflow-wrap: anywhere;
  word-break: break-all;
}
.ysb-preview-content {
  max-height: 50dvh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
  color: var(--foreground);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ysb-detail-error {
  margin: 0;
  color: var(--status-error, #e06c75);
  font-size: 12px;
  line-height: 1.5;
}
.ysb-detail-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ysb-detail-foot .ysb-widget-action {
  flex: none;
  padding: 0.375rem 0.75rem;
}

@keyframes ysb-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
}
@media (max-width: 760px) {
  .ysb-header { padding: 12px 14px 8px; }
  .ysb-board { padding: 10px 14px 14px; gap: 10px; }
  .ysb-col { flex-basis: 84vw; width: 84vw; }
  .ysb-searchbox { width: 100%; }
  .ysb-formrow { grid-template-columns: 1fr; }
  .ysb-filterrow { padding-left: 0; }
}
`;
