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
.ysb-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #000 40%, transparent);
}
.ysb-modal {
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
.ysb-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ysb-modal-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ysb-modal-title {
  margin: 0;
  color: var(--foreground);
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  word-break: break-word;
}
.ysb-modal-close {
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
.ysb-modal-close:hover {
  background: var(--interactive-hover);
  color: var(--foreground);
}
.ysb-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}
.ysb-modal-statusline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
}
.ysb-modal-dot { opacity: 0.5; }
.ysb-modal-desc {
  margin: 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ysb-modal-desc a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ysb-modal-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}
.ysb-modal-meta dt { font-weight: 500; }
.ysb-modal-meta dd {
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-all;
}
.ysb-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ysb-modal-foot .ysb-widget-action {
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
