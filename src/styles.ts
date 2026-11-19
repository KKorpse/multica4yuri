/**
 * Yuri-native board presentation: semantic surfaces, neutral solid actions,
 * compact 14/12/11 type, shared interaction states, and 150ms overlay motion.
 */
export const CSS = `
@property --ysb-beam-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

.ysb-root,
.ysb-detail {
  --ysb-fg: var(--surface-foreground, var(--foreground, #e7e7ea));
  --ysb-muted: var(--surface-muted-foreground, var(--muted-foreground, #8b8f98));
  --ysb-border: var(--interactive-border, var(--border, rgba(127, 127, 127, 0.22)));
  --ysb-border-hover: var(--interactive-border-hover, color-mix(in srgb, var(--ysb-fg) 22%, transparent));
  --ysb-hover: var(--interactive-hover, color-mix(in srgb, var(--ysb-fg) 6%, transparent));
  --ysb-active: var(--interactive-active, color-mix(in srgb, var(--ysb-fg) 12%, transparent));
  --ysb-selection: var(--interactive-selection, color-mix(in srgb, var(--ysb-fg) 7%, var(--ysb-canvas)));
  --ysb-selection-fg: var(--interactive-selection-foreground, var(--ysb-fg));
  --ysb-focus: var(--interactive-focus-ring, color-mix(in srgb, var(--ysb-fg) 35%, transparent));
  --ysb-accent: var(--primary-base, var(--primary, #6f8cff));
  --ysb-error: var(--status-error, var(--destructive, #e06c75));
  --ysb-success: var(--status-success, #5fbf8f);
  --ysb-warning: var(--status-warning, #d5a653);
  --ysb-canvas: var(--surface-background, var(--background, #17181b));
  --ysb-card: var(--surface-elevated, var(--card, var(--background, #17181b)));
  --ysb-card-fg: var(--surface-elevated-foreground, var(--ysb-fg));
  --ysb-surface: var(--surface-muted, var(--muted, var(--card, #17181b)));
  --ysb-subtle: var(--surface-subtle, color-mix(in srgb, var(--ysb-fg) 6%, var(--ysb-canvas)));
}
.ysb-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--ysb-fg);
  background: transparent;
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif);
  font-size: 14px;
  font-weight: var(--ui-regular-font-weight, 400);
}
.ysb-root *, .ysb-detail * { box-sizing: border-box; }

.ysb-header {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: var(--layout-chrome-divider-width, 0.5px) solid
    var(--layout-chrome-divider, var(--ysb-border));
}
.ysb-headrow {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.ysb-titleblock {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  text-align: center;
}
.ysb-titlewrap { display: flex; align-items: center; justify-content: center; min-width: 0; }
.ysb-title {
  margin: 0;
  font-family: var(--font-heading, var(--font-sans));
  font-size: var(--text-ui-header, 15px);
  line-height: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.ysb-header-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  min-width: 0;
  gap: 4px 6px;
  margin-top: 2px;
  color: var(--ysb-muted);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
.ysb-header-meta > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ysb-header-metasep { flex: none; opacity: 0.5; }
.ysb-build { flex: none; color: var(--ysb-muted); font-size: 11px; }
.ysb-activitychip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 150ms ease-out, box-shadow 150ms ease-out;
}
.ysb-activitychip strong { font-weight: 700; font-variant-numeric: tabular-nums; }
.ysb-activitychip.is-running {
  color: var(--ysb-success);
  background: color-mix(in srgb, var(--ysb-success) 11%, transparent);
}
.ysb-activitychip.is-unread {
  color: var(--ysb-warning);
  background: color-mix(in srgb, var(--ysb-warning) 12%, transparent);
}
.ysb-activitychip:hover {
  background: color-mix(in srgb, currentColor 16%, transparent);
}
.ysb-activitychip.is-on {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 38%, transparent);
}
.ysb-headtools { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ysb-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ysb-pageactions { flex: none; flex-wrap: nowrap; justify-content: flex-end; margin-left: auto; }

.ysb-searchbox {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  max-width: 320px;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-md, 8px);
  background: var(--ysb-card);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ysb-border) 60%, transparent);
  color: var(--ysb-muted);
  transition: background 200ms ease-out, box-shadow 200ms ease-out;
}
.ysb-searchbox:hover:not(:focus-within) {
  background: var(--ysb-subtle);
  box-shadow: none;
}
.ysb-searchbox:focus-within {
  background: var(--ysb-card);
  box-shadow: inset 0 0 0 2px var(--ysb-focus);
}
.ysb-searchbox input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ysb-fg);
  font: inherit;
  font-size: 13px;
}
.ysb-searchbox input::placeholder { color: var(--ysb-muted); }
.ysb-searchbox input::-webkit-search-cancel-button { filter: grayscale(1); opacity: 0.6; }

.ysb-searchwrap { position: relative; flex: 1 1 220px; max-width: 360px; min-width: 0; }
.ysb-searchhistory {
  position: absolute;
  z-index: 60;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 292px;
  overflow: auto;
  padding: 4px;
  border-radius: var(--radius-xl, 12px);
  background: var(--yuri-popup-fill, var(--ysb-card));
  color: var(--ysb-card-fg);
  box-shadow: var(--yuri-popup-shadow, 0 8px 20px -6px rgb(0 0 0 / 0.18));
  transform-origin: top center;
  animation: ysb-menu-in 150ms ease-out;
}
.ysb-searchhistoryhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px 2px;
  color: var(--ysb-muted);
  font-size: 11px;
}
.ysb-searchhistoryclear {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: color 150ms ease-out;
}
.ysb-searchhistoryclear:hover { color: var(--ysb-fg); }
.ysb-searchhistoryitem {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ysb-card-fg);
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.ysb-searchhistoryitem:hover,
.ysb-searchhistoryitem:focus-visible { background: var(--ysb-hover); }
.ysb-searchhistoryitem svg { flex: none; opacity: 0.5; }
.ysb-searchhistoryitem span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ysb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 9px;
  background: var(--ysb-surface);
  color: var(--ysb-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out, opacity 150ms ease-out;
}
.ysb-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--ysb-fg) 6%, var(--ysb-surface)); }
.ysb-btn:active:not(:disabled) { background: color-mix(in srgb, var(--ysb-fg) 12%, var(--ysb-surface)); }
.ysb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ysb-btn.is-active { background: var(--ysb-selection); color: var(--ysb-selection-fg); }
.ysb-btn.primary { background: var(--ysb-surface); color: var(--ysb-fg); }
.ysb-btn.primary:hover:not(:disabled) { background: color-mix(in srgb, var(--ysb-fg) 6%, var(--ysb-surface)); }
.ysb-btn.primary:active:not(:disabled) { background: color-mix(in srgb, var(--ysb-fg) 12%, var(--ysb-surface)); }
.ysb-btn.ghost { background: transparent; color: var(--ysb-fg); }
.ysb-btn.ghost:hover:not(:disabled) { background: var(--ysb-hover); }
.ysb-btn.ghost:active:not(:disabled) { background: var(--ysb-active); }
.ysb-btn.danger {
  border: 1px solid color-mix(in srgb, var(--ysb-error) 9%, transparent);
  background: color-mix(in srgb, var(--ysb-error) 7%, var(--ysb-canvas));
  color: var(--ysb-error);
}
.ysb-btn.danger:hover:not(:disabled) { background: color-mix(in srgb, var(--ysb-error) 11%, var(--ysb-canvas)); }
.ysb-btn.danger:active:not(:disabled) { background: color-mix(in srgb, var(--ysb-error) 16%, var(--ysb-canvas)); }
.ysb-btn.small { height: 24px; padding: 0 8px; border-radius: 7px; font-size: 11px; }
.ysb-iconbtn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out, opacity 150ms ease-out;
}
.ysb-iconbtn:hover { background: var(--ysb-hover); color: var(--ysb-fg); }
.ysb-iconbtn:active { background: var(--ysb-active); }
.ysb-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ysb-fg) 6%, transparent);
  color: var(--ysb-muted);
  font-size: 10px;
  font-weight: 500;
}

.ysb-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 4px;
  flex-wrap: wrap;
  border: 0;
  border-radius: 10px;
  background: var(--ysb-surface);
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
  height: 26px;
  padding: 0 24px 0 9px;
  border: 1px solid var(--ysb-border);
  border-radius: var(--radius-md, 8px);
  background-color: var(--ysb-card);
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ysb-fg) 4%, transparent);
  background-image: linear-gradient(45deg, transparent 50%, var(--ysb-muted) 50%),
    linear-gradient(135deg, var(--ysb-muted) 50%, transparent 50%);
  background-position: calc(100% - 10px) 9px, calc(100% - 6px) 9px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
  transition: background-color 150ms ease-out, border-color 150ms ease-out;
}
.ysb-tool select:hover { background-color: var(--ysb-hover); }
.ysb-tool select:active { background-color: var(--ysb-active); }
.ysb-displayoptions { display: flex; align-items: center; min-width: 0; gap: 2px; flex-wrap: wrap; }
.ysb-toolbar .ysb-toolbar-select select {
  height: 32px;
  padding: 0 24px 0 9px;
  border: 0;
  border-radius: 7px;
  background-color: transparent;
  box-shadow: none;
  color: var(--ysb-fg);
  font-weight: 400;
  background-position: calc(100% - 10px) 12px, calc(100% - 6px) 12px;
}
.ysb-toolbar .ysb-toolbar-select select:hover { background-color: var(--ysb-hover); }
.ysb-toolbar .ysb-toolbar-select select:active { background-color: var(--ysb-active); }
.ysb-toolbar-separator {
  flex: none;
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: color-mix(in srgb, var(--ysb-fg) 8%, transparent);
}
.ysb-toolbar-actions { display: flex; align-items: center; gap: 2px; margin-left: auto; }
.ysb-toolbarbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-toolbarbtn:hover { background: var(--ysb-hover); color: var(--ysb-fg); }
.ysb-toolbarbtn:active { background: var(--ysb-active); }
.ysb-toolbarbtn.is-active { background: var(--ysb-selection); color: var(--ysb-selection-fg); }
.ysb-toolbarbtn.is-active:hover { color: var(--ysb-selection-fg); }

.ysb-viewswitch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
}
.ysb-viewbtn {
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out, box-shadow 150ms ease-out;
}
.ysb-viewbtn:not(.is-on):hover { background: var(--ysb-hover); color: var(--ysb-fg); }
.ysb-viewbtn:not(.is-on):active { background: var(--ysb-active); }
.ysb-viewbtn.is-on { color: var(--ysb-fg); }

.ysb-view {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 20px 24px;
}
.ysb-list {
  width: min(1200px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ysb-listgroup { display: flex; flex-direction: column; gap: 6px; }
.ysb-listgrouphead {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 4px;
  color: var(--ysb-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.ysb-listgroupcount {
  min-width: 18px;
  color: var(--ysb-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ysb-listrows {
  overflow: hidden;
  border: 1px solid var(--ysb-border);
  border-radius: 10px;
  background: var(--ysb-card);
}
.ysb-listrow {
  display: grid;
  grid-template-columns: 64px minmax(180px, 1fr) minmax(120px, auto) 96px 96px 72px 56px;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-top: 1px solid color-mix(in srgb, var(--ysb-fg) 7%, transparent);
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.ysb-listrow:first-child { border-top: 0; }
.ysb-listrow:hover { background: var(--ysb-hover); }
.ysb-listrow:focus-visible {
  outline: 2px solid var(--ysb-focus);
  outline-offset: -2px;
}
.ysb-listcode {
  color: var(--ysb-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ysb-listtitle {
  min-width: 0;
  overflow: hidden;
  color: var(--ysb-fg);
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-listmain { display: flex; align-items: center; gap: 6px; min-width: 0; }
.ysb-listmain .ysb-listtitle { flex: 1; }
.ysb-listlabels { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.ysb-listagent,
.ysb-listdir,
.ysb-listtime {
  min-width: 0;
  overflow: hidden;
  color: var(--ysb-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-listdetails,
.ysb-tablerowactions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.ysb-tabledetails {
  height: 22px;
  padding: 0 7px;
  border: 1px solid var(--ysb-border);
  border-radius: 5px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 10.5px;
  white-space: nowrap;
  cursor: pointer;
}
.ysb-listdetails:hover,
.ysb-tabledetails:hover {
  background: var(--ysb-hover);
  color: var(--ysb-fg);
}

.ysb-tablewrap {
  width: min(1400px, 100%);
  margin: 0 auto;
  overflow: auto;
  border: 1px solid var(--ysb-border);
  border-radius: 10px;
  background: var(--ysb-card);
}
.ysb-table {
  width: 100%;
  min-width: 900px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
}
.ysb-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0;
  border-bottom: 1px solid var(--ysb-border);
  background: var(--ysb-card);
  color: var(--ysb-muted);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-align: left;
  text-transform: uppercase;
}
.ysb-thbtn {
  width: 100%;
  padding: 9px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.ysb-thbtn:hover { color: var(--ysb-fg); }
.ysb-thsort { margin-left: 4px; color: var(--ysb-fg); }
.ysb-table td {
  padding: 9px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--ysb-fg) 7%, transparent);
  vertical-align: middle;
}
.ysb-table tbody tr { cursor: pointer; transition: background-color 150ms ease-out; }
.ysb-table tbody tr:hover { background: var(--ysb-hover); }
.ysb-table tbody tr:last-child td { border-bottom: 0; }
.ysb-tablecode {
  color: var(--ysb-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ysb-tablemain {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 440px;
  min-width: 0;
}
.ysb-tablemain .ysb-tabletitle { flex: 1; }
.ysb-tabletitle {
  max-width: 420px;
  overflow: hidden;
  color: var(--ysb-fg);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-tablestatus { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.ysb-tablemuted {
  max-width: 180px;
  overflow: hidden;
  color: var(--ysb-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-table .ysb-chips { flex-wrap: nowrap; overflow: hidden; }
.ysb-table .ysb-label { height: 18px; font-size: 10px; }

.ysb-filterpanel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0 2px;
  border-top: var(--layout-chrome-divider-width, 0.5px) solid
    var(--layout-chrome-divider, var(--ysb-border));
  animation: ysb-fade-in 150ms ease-out;
}
.ysb-filtergroup { display: flex; align-items: flex-start; gap: 10px; }
.ysb-filterlabel {
  flex: none;
  width: 34px;
  padding-top: 4px;
  color: var(--ysb-muted);
  font-size: 11px;
}
.ysb-filterrow { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-left: 44px; }
.ysb-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ysb-chip {
  height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 7px;
  background: var(--ysb-surface);
  color: var(--ysb-fg);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-chip:hover { background: color-mix(in srgb, var(--ysb-fg) 6%, var(--ysb-surface)); }
.ysb-chip:active { background: color-mix(in srgb, var(--ysb-fg) 12%, var(--ysb-surface)); }
.ysb-chip.is-on,
.ysb-chip[aria-pressed="true"] {
  color: var(--ysb-fg);
  background: color-mix(in srgb, var(--ysb-fg) 6%, var(--ysb-surface));
}
.ysb-chip.is-on:hover,
.ysb-chip[aria-pressed="true"]:hover {
  background: color-mix(in srgb, var(--ysb-fg) 8%, var(--ysb-surface));
}
.ysb-chip.is-on:active,
.ysb-chip[aria-pressed="true"]:active {
  background: color-mix(in srgb, var(--ysb-fg) 10%, var(--ysb-surface));
}
.ysb-chipdot { width: 6px; height: 6px; border-radius: 50%; background: var(--ysb-label, currentColor); flex: none; }
.ysb-chipcount { color: var(--ysb-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.ysb-status-icon { flex: none; }
.ysb-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ysb-muted);
  font-size: 12px;
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
  justify-content: safe center;
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
  background: var(--ysb-surface);
  transition: background-color 150ms ease-out, box-shadow 150ms ease-out;
}
.ysb-col.is-over {
  background: var(--ysb-selection);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ysb-selection-fg) 14%, transparent);
}
.ysb-col.is-column-dragging { opacity: 0.45; }
.ysb-col.is-column-drop {
  box-shadow: inset 2px 0 0 var(--ysb-accent);
}
.ysb-colhead {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px 5px;
}
.ysb-colhead.is-draggable { cursor: grab; }
.ysb-colhead.is-draggable:active { cursor: grabbing; }
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
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-muted);
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-coladd:hover:not(:disabled) { background: var(--ysb-hover); color: var(--ysb-fg); }
.ysb-coladd:active:not(:disabled) { background: var(--ysb-active); }
.ysb-coladd:disabled { opacity: 0.35; cursor: default; }
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border: 1px solid var(--ysb-border);
  border-radius: var(--radius-lg, 10px);
  background: var(--ysb-card);
  color: var(--ysb-card-fg);
  box-shadow: none;
  cursor: pointer;
  transition: border-color 150ms ease-out, background-color 150ms ease-out, box-shadow 150ms ease-out, opacity 150ms ease-out;
}
.ysb-card:hover {
  border-color: var(--ysb-border-hover);
  background: var(--ysb-card);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ysb-fg) 8%, transparent);
}
.ysb-card:active { background: color-mix(in srgb, var(--ysb-fg) 3%, var(--ysb-card)); }
.ysb-card.is-dragging { opacity: 0.4; }
.ysb-card.is-running {
  border-color: color-mix(in srgb, var(--ysb-success) 42%, var(--ysb-border));
}
.ysb-card.is-running::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 1px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--ysb-beam-angle, 0deg),
    transparent 0deg 300deg,
    color-mix(in srgb, var(--ysb-success) 85%, transparent) 330deg,
    transparent 360deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  animation: ysb-beam 1.6s linear infinite;
}
.ysb-card.is-unread {
  border-color: color-mix(in srgb, var(--ysb-warning) 34%, var(--ysb-border));
  background: color-mix(in srgb, var(--ysb-warning) 8%, var(--ysb-card));
}
.ysb-card.is-unread:hover {
  background: color-mix(in srgb, var(--ysb-warning) 12%, var(--ysb-card));
}
.ysb-cardtop { display: flex; align-items: center; justify-content: space-between; min-height: 14px; gap: 6px; }
.ysb-cardtopmeta { display: inline-flex; align-items: center; gap: 6px; flex: none; }
.ysb-carddetails {
  height: 20px;
  padding: 0 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-carddetails:hover {
  background: var(--ysb-hover);
  color: var(--ysb-fg);
}
.ysb-carddetails:active { background: var(--ysb-active); }
.ysb-pinbtn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ysb-muted);
  opacity: 0.55;
  cursor: pointer;
  flex: none;
  transition: background-color 150ms ease-out, color 150ms ease-out, opacity 150ms ease-out;
}
.ysb-pinbtn:hover {
  background: var(--ysb-hover);
  color: var(--ysb-fg);
  opacity: 1;
}
.ysb-pinbtn.is-on {
  color: var(--ysb-accent);
  opacity: 1;
}
.ysb-cardid {
  color: var(--ysb-muted);
  font-size: 11px;
  line-height: 15px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}
.ysb-activitybadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  flex: none;
}
.ysb-activitybadge.is-running {
  color: var(--ysb-success);
  background: color-mix(in srgb, var(--ysb-success) 12%, transparent);
}
.ysb-activitybadge.is-unread {
  color: var(--ysb-warning);
  background: color-mix(in srgb, var(--ysb-warning) 14%, transparent);
}
.ysb-badgedot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}
.ysb-activitybadge.is-running .ysb-badgedot {
  animation: ysb-pulse 1.8s ease-in-out infinite;
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
.ysb-metadir { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  color: var(--ysb-error);
  font-size: 13px;
}

.ysb-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.5);
  animation: ysb-fade-in 150ms ease-out;
}
.dark .ysb-overlay { background: rgb(0 0 0 / 0.75); }
.ysb-modal {
  width: min(680px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 24px;
  border: 1px solid var(--ysb-border);
  border-radius: var(--radius-xl, 12px);
  background: var(--ysb-canvas);
  box-shadow: none;
  transform-origin: center;
  animation: ysb-dialog-in 150ms ease-out;
}
.ysb-modal.wide { width: min(740px, 100%); }
.ysb-modalhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.ysb-modaltitle { margin: 0; font-size: var(--text-ui-header, 15px); line-height: 22px; font-weight: 600; }
.ysb-modalsub { margin: 4px 0 0; color: var(--ysb-muted); font-size: 12px; line-height: 17px; }
.ysb-form { display: flex; flex-direction: column; gap: 12px; }
.ysb-formrow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ysb-formitem { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ysb-formitem > span { color: var(--ysb-muted); font-size: 12px; font-weight: 500; }
.ysb-sendcheck { align-self: end; padding-bottom: 9px; }

.ysb-input, .ysb-select, .ysb-textarea {
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius-md, 8px);
  background: var(--ysb-card);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ysb-border) 60%, transparent);
  color: var(--ysb-fg);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: background-color 200ms ease-out, box-shadow 200ms ease-out;
}
.ysb-input::placeholder, .ysb-textarea::placeholder { color: var(--ysb-muted); }
.ysb-input:hover:not(:focus), .ysb-select:hover:not(:focus), .ysb-textarea:hover:not(:focus) {
  background: var(--ysb-subtle);
  box-shadow: none;
}
.ysb-input:focus, .ysb-select:focus, .ysb-textarea:focus {
  background: var(--ysb-card);
  box-shadow: inset 0 0 0 2px var(--ysb-focus);
}
.ysb-input:disabled, .ysb-select:disabled, .ysb-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
.ysb-select { cursor: pointer; }
.ysb-select option, .ysb-tool select option { background: var(--ysb-card); color: var(--ysb-card-fg); }
.ysb-textarea {
  height: auto;
  min-height: 104px;
  padding: 8px 12px;
  line-height: 1.55;
  resize: vertical;
}
.ysb-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ysb-labelmodal { width: min(560px, 100%); }
.ysb-statusmodal { width: min(620px, 100%); }
.ysb-confirmmodal { width: min(460px, 100%); }
.ysb-statuscolor {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
.ysb-statuscolor::-webkit-color-swatch-wrapper { padding: 0; }
.ysb-statuscolor::-webkit-color-swatch {
  border: 1px solid color-mix(in srgb, var(--ysb-fg) 18%, transparent);
  border-radius: 6px;
}
.ysb-labelcomposer {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px 6px 10px;
  border: 0;
  border-radius: 10px;
  background: var(--ysb-card);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ysb-border) 60%, transparent);
  transition: box-shadow 200ms ease-out;
}
.ysb-labelcomposer .ysb-input {
  flex: 1;
  height: 32px;
  padding-inline: 0;
  background: transparent;
  box-shadow: none;
}
.ysb-labelcomposer:focus-within {
  box-shadow: inset 0 0 0 2px var(--ysb-focus);
}
.ysb-labelcomposer .ysb-input:hover:not(:focus),
.ysb-labelcomposer .ysb-input:focus { background: transparent; box-shadow: none; }
.ysb-labeladdicon {
  width: 22px;
  height: 22px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--ysb-surface);
  color: var(--ysb-muted);
  font-size: 15px;
  line-height: 1;
}
.ysb-labelcreatehint { margin: -4px 0 2px; }
.ysb-labellisthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 3px;
  color: var(--ysb-muted);
  font-size: 11px;
}
.ysb-labellist { display: flex; flex-direction: column; gap: 2px; }
.ysb-labelrow {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  transition: background-color 150ms ease-out;
}
.ysb-labelrow:hover { background: var(--ysb-hover); }
.ysb-labelrow.is-editing,
.ysb-labelrow.is-hidden .ysb-labelname { color: var(--ysb-muted); }
.ysb-labelrow.is-hidden .ysb-labeldot,
.ysb-labelrow.is-hidden .ysb-statuscolor { opacity: 0.4; }
.ysb-labelrow.is-confirming {
  background: var(--ysb-selection);
  color: var(--ysb-selection-fg);
}
.ysb-labeldot {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: var(--ysb-label, var(--ysb-muted));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ysb-label, var(--ysb-muted)) 12%, transparent);
}
.ysb-labelmain {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.ysb-labelname {
  overflow: hidden;
  color: var(--ysb-fg);
  font-size: 13px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-labelmeta {
  color: var(--ysb-muted);
  font-size: 10.5px;
  line-height: 14px;
  font-variant-numeric: tabular-nums;
}
.ysb-labelactions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex: none;
}
.ysb-labelrename { flex: 1; height: 30px; }
.ysb-labelconfirm {
  color: var(--ysb-muted);
  font-size: 11px;
  white-space: nowrap;
}
.ysb-danger-text { color: var(--ysb-error); }
.ysb-danger-text:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ysb-error) 12%, transparent);
}
.ysb-labelempty {
  padding: 26px 16px;
  border: 1px dashed var(--ysb-border);
  border-radius: 10px;
  color: var(--ysb-muted);
  font-size: 12px;
  text-align: center;
}
.ysb-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 2px 6px 2px 8px;
  border: 0;
  border-radius: 7px;
  background: color-mix(in srgb, var(--ysb-label, var(--ysb-muted)) 12%, var(--ysb-surface));
  color: color-mix(in srgb, var(--ysb-label, var(--ysb-muted)) 78%, var(--ysb-fg));
  font-size: 11px;
}
.ysb-tag button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.ysb-tag button:hover { background: color-mix(in srgb, currentColor 10%, transparent); opacity: 1; }
.ysb-taginput { flex: 1; min-width: 160px; height: 32px; font-size: 12px; }
.ysb-suggestions { display: flex; flex-wrap: wrap; gap: 4px; }
.ysb-suggestion {
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: var(--ysb-surface);
  color: var(--ysb-fg);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.ysb-suggestion:hover { background: color-mix(in srgb, var(--ysb-fg) 6%, var(--ysb-surface)); }
.ysb-suggestion:active { background: color-mix(in srgb, var(--ysb-fg) 12%, var(--ysb-surface)); }
.ysb-hint { margin: 0; color: var(--ysb-muted); font-size: 12px; line-height: 17px; }
.ysb-error { margin: 0; color: var(--ysb-error); font-size: 12px; }
.ysb-meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--ysb-muted); font-size: 11px; }
.ysb-mono { font-family: var(--font-mono, ui-monospace, monospace); font-size: 10.5px; }
.ysb-modalfoot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: var(--layout-chrome-divider-width, 0.5px) solid
    var(--layout-chrome-divider, var(--ysb-border));
}
.ysb-footright { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.ysb-loadmore {
  flex: none;
  min-height: 28px;
  margin: 2px 4px 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-muted);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-loadmore:hover { color: var(--ysb-fg); background: var(--ysb-hover); }
.ysb-loadmore:active { background: var(--ysb-active); }
/* Right work-status widget: flat native rows within Yuri's work-status panel. */
.ysb-widget {
  display: flex;
  flex-direction: column;
  gap: calc(0.25rem * var(--padding-scale, 1));
  min-width: 0;
  margin: 0.25rem 0;
  padding: 0.5rem;
  color: var(--surface-muted-foreground, var(--muted-foreground));
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: var(--text-ui-label, 14px);
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
  animation: ysb-pulse 1.8s ease-in-out infinite;
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
  color: var(--primary-base, var(--primary));
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
.ysb-widget-markdown {
  min-width: 0;
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ysb-widget-markdown h1,
.ysb-widget-markdown h2,
.ysb-widget-markdown h3,
.ysb-widget-markdown h4,
.ysb-widget-markdown h5,
.ysb-widget-markdown h6 {
  margin: 0 0 4px;
  color: var(--foreground);
  font-weight: 600;
  line-height: 1.35;
}
.ysb-widget-markdown h1 { font-size: 14px; }
.ysb-widget-markdown h2 { font-size: 12px; }
.ysb-widget-markdown h3,
.ysb-widget-markdown h4,
.ysb-widget-markdown h5,
.ysb-widget-markdown h6 { font-size: 11px; }
.ysb-widget-markdown p { margin: 0 0 4px; }
.ysb-widget-markdown ul,
.ysb-widget-markdown ol {
  margin: 0;
  padding-left: 16px;
}
.ysb-widget-markdown a {
  color: var(--primary-base, var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ysb-widget-markdown code {
  padding: 0 3px;
  border-radius: 3px;
  background: var(--syntax-background, var(--surface-muted));
  color: var(--syntax-foreground, var(--foreground));
  font-family: var(--font-mono, ui-monospace, monospace);
}
.ysb-widget-markdown pre {
  padding: 8px;
  overflow-x: auto;
  border-radius: 6px;
  background: var(--syntax-background, var(--surface-muted));
  color: var(--syntax-foreground, var(--foreground));
}
.ysb-detail-body .ysb-widget-markdown {
  font-size: 13px;
  line-height: 1.6;
}
.ysb-detail-body .ysb-widget-markdown h1 { font-size: 18px; }
.ysb-detail-body .ysb-widget-markdown h2 { font-size: 15px; }
.ysb-detail-body .ysb-widget-markdown h3 { font-size: 13px; }
.ysb-widget-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ysb-widget-block + .ysb-widget-block { margin-top: 8px; }
.ysb-widget-blocktitle,
.ysb-widget-heading {
  color: var(--foreground);
  font-weight: 600;
  line-height: 1.4;
}
.ysb-widget-heading.level-1 { font-size: 14px; }
.ysb-widget-heading.level-2 { font-size: 12px; }
.ysb-widget-heading.level-3,
.ysb-widget-heading.level-4,
.ysb-widget-heading.level-5,
.ysb-widget-heading.level-6 { font-size: 11px; }
.ysb-detail-body .ysb-widget-heading.level-1 { font-size: 18px; }
.ysb-detail-body .ysb-widget-heading.level-2 { font-size: 15px; }
.ysb-detail-body .ysb-widget-heading.level-3 { font-size: 13px; }
.ysb-widget-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding-left: 16px;
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
  line-height: 1.45;
}
.ysb-widget-list li { padding-left: 2px; }
.ysb-widget-list li::marker { color: var(--muted-foreground); }
.ysb-widget-list a { color: var(--primary-base, var(--primary)); }
.ysb-detail-body .ysb-widget-blocktitle { font-size: 13px; }
.ysb-detail-body .ysb-widget-list { font-size: 13px; line-height: 1.6; }
.ysb-detail-body .ysb-widget-block + .ysb-widget-block { margin-top: 12px; }
.ysb-widget-desc a {
  color: var(--primary-base, var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.ysb-widget-desc a:hover {
  color: var(--primary-hover, var(--primary));
}
.ysb-widget-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin-top: 4px;
}
.ysb-widget-sectionhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.ysb-widget-sectiontitle {
  color: var(--muted-foreground);
  font-size: var(--text-meta, 11px);
  font-weight: 500;
}
.ysb-widget-sectiontoggle {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 3px;
  min-height: 24px;
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: var(--text-micro, 11px);
  line-height: 1.3;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-widget-sectiontoggle:hover {
  background: var(--interactive-hover);
  color: var(--foreground);
}
.ysb-widget-sectiontoggle:active { background: var(--interactive-active); }
.ysb-sprite { display: block; flex: none; }
.ysb-widget-toggleicon {
  display: block;
  flex: none;
}
.ysb-widget-toggleicon.up { transform: rotate(180deg); }
.ysb-widget-divider {
  height: 1px;
  margin: 6px 0 2px;
  background: color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ysb-widget-outputlist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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
  color: var(--primary-base, var(--primary));
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
  min-height: 28px;
  padding: 0.25rem 0.5rem;
  border: 0;
  border-radius: var(--radius-md, 8px);
  background: var(--surface-muted, var(--muted));
  color: var(--foreground);
  font: inherit;
  font-size: var(--text-meta, 12px);
  line-height: 1.4;
  text-align: center;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out, opacity 150ms ease-out;
}
.ysb-widget-action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface-muted, var(--muted)));
}
.ysb-widget-action:active:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 12%, var(--surface-muted, var(--muted)));
}
.ysb-widget-action:disabled { opacity: 0.5; cursor: not-allowed; }
.ysb-widget-action.primary {
  background: var(--surface-muted, var(--muted));
  color: var(--foreground);
}
.ysb-widget-action.primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface-muted, var(--muted)));
}
.ysb-widget-action.primary:active:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 12%, var(--surface-muted, var(--muted)));
}

/* Task details dialog (portaled out of the narrow work-status column). */
.ysb-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.5);
  animation: ysb-fade-in 150ms ease-out;
}
.dark .ysb-detail-backdrop { background: rgb(0 0 0 / 0.75); }
.ysb-detail {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: min(100%, 720px);
  overflow: hidden;
  border: 1px solid var(--ysb-border);
  border-radius: var(--radius-xl, 12px);
  background: var(--ysb-canvas);
  color: var(--ysb-fg);
  font-family: var(--font-sans, system-ui, sans-serif);
  box-shadow: none;
  transform-origin: center;
  animation: ysb-dialog-in 150ms ease-out;
}
.ysb-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: var(--layout-chrome-divider-width, 0.5px) solid
    var(--layout-chrome-divider, var(--ysb-border));
}
.ysb-detail-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ysb-detail-title {
  min-width: 0;
  margin: 0;
  color: var(--ysb-fg);
  font-size: var(--text-ui-header, 15px);
  line-height: 1.4;
  font-weight: 600;
  word-break: break-word;
}
.ysb-detail-code {
  flex: none;
  max-width: 40%;
  overflow: hidden;
  color: var(--ysb-muted);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-detail-settingsrow {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.ysb-detail-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  gap: 16px;
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
  color: var(--primary-base, var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ysb-detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 0;
  border-radius: 10px;
  background: var(--ysb-surface);
}
.ysb-detail-sectionhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ysb-detail-docedit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ysb-detail-docedit .ysb-textarea {
  min-height: 180px;
  resize: vertical;
}
.ysb-detail-docactions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.ysb-detail-section > h3,
.ysb-detail-sectionhead > h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
.ysb-detail-outputlist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ysb-detail-output {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-accent);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.ysb-detail-output + .ysb-detail-output { margin-top: 0; }
.ysb-detail-output:hover { background: var(--ysb-hover); }
.ysb-detail-output:active { background: var(--ysb-active); }
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
.ysb-detail-acceptance {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ysb-detail-acceptance strong {
  display: block;
  margin-bottom: 2px;
  color: var(--foreground);
  font-weight: 500;
}
.ysb-detail-sessionlist,
.ysb-detail-notelist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ysb-detail-session {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0.375rem 0.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ysb-fg);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.ysb-detail-session:hover { background: var(--ysb-hover); }
.ysb-detail-session:active { background: var(--ysb-active); }
.ysb-detail-role {
  flex: none;
  padding: 0 4px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 1.4;
}
.ysb-detail-role.main { color: var(--primary-base, var(--primary)); }
.ysb-detail-sessiontitle {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-detail-sessiondir {
  flex: none;
  max-width: 40%;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-detail-note {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 0.375rem 0.5rem;
  border-left: 2px solid color-mix(in srgb, var(--foreground) 14%, transparent);
}
.ysb-detail-notestatus {
  color: var(--muted-foreground);
  font-size: 10px;
  text-transform: uppercase;
}
.ysb-detail-notestatus.completed { color: var(--status-success); }
.ysb-detail-notestatus.failed,
.ysb-detail-notestatus.blocked { color: var(--status-error); }
.ysb-detail-notesummary {
  color: var(--foreground);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ysb-detail-noteauthor {
  color: var(--muted-foreground);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
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
  border: 1px solid var(--ysb-border);
  border-radius: 8px;
  background: var(--syntax-background, var(--ysb-surface));
  color: var(--syntax-foreground, var(--ysb-fg));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ysb-detail-error {
  margin: 0;
  color: var(--ysb-error);
  font-size: 12px;
  line-height: 1.5;
}
.ysb-detail-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: var(--layout-chrome-divider-width, 0.5px) solid
    var(--layout-chrome-divider, var(--ysb-border));
}
.ysb-detail-foot .ysb-widget-action {
  flex: none;
  padding: 0.375rem 0.75rem;
}


.ysb-root button:focus-visible,
.ysb-root [tabindex]:focus-visible,
.ysb-root a[href]:focus-visible,
.ysb-widget button:focus-visible,
.ysb-widget a[href]:focus-visible,
.ysb-detail button:focus-visible,
.ysb-detail [tabindex]:focus-visible,
.ysb-detail a[href]:focus-visible,
.ysb-root select:focus-visible,
.ysb-detail select:focus-visible {
  outline: 2px solid var(--ysb-focus, var(--interactive-focus-ring)) !important;
  outline-offset: 2px;
}
.ysb-root .ysb-btn:not(.ghost):not(.danger):focus-visible,
.ysb-root .ysb-chip:focus-visible,
.ysb-widget-action:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--ysb-fg, var(--foreground)) 20%, transparent) !important;
  outline-offset: 1px;
}

.ysb-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
}
.ysb-menu {
  position: fixed;
  z-index: 81;
  min-width: 180px;
  max-height: min(72vh, 520px);
  overflow: auto;
  padding: 4px;
  border: 0;
  border-radius: var(--radius-xl, 12px);
  background: var(--yuri-popup-fill, var(--ysb-card));
  color: var(--ysb-card-fg);
  box-shadow: var(--yuri-popup-shadow, 0 8px 20px -6px rgb(0 0 0 / 0.18));
  transform-origin: top left;
  animation: ysb-menu-in 150ms ease-out;
}
.ysb-menuitem {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ysb-card-fg);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ysb-menuitem:hover, .ysb-menuitem:focus-visible { background: var(--ysb-hover); }
.ysb-menuitem:active { background: var(--ysb-active); }
.ysb-menulabel {
  padding: 4px 8px 2px;
  color: var(--ysb-muted);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ysb-menustatus { gap: 7px; }
.ysb-menustatus.is-current { color: var(--ysb-muted); }
.ysb-menustatusname {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ysb-menustatuscheck { margin-left: auto; color: var(--ysb-muted); font-size: 11px; }
.ysb-menuitem.danger { color: var(--ysb-error); }
.ysb-menuitem.danger:hover, .ysb-menuitem.danger:focus-visible {
  background: color-mix(in srgb, var(--ysb-error) 10%, transparent);
}
.ysb-menusep {
  height: var(--yuri-popup-divider-width, 0.5px);
  margin: 2px -4px;
  background: var(--yuri-popup-divider, var(--ysb-border));
}

@keyframes ysb-beam {
  to { --ysb-beam-angle: 360deg; }
}

@keyframes ysb-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ysb-dialog-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ysb-menu-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ysb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  .ysb-root, .ysb-root *,
  .ysb-widget, .ysb-widget *,
  .ysb-detail-backdrop, .ysb-detail-backdrop *,
  .ysb-menu, .ysb-menu *,
  .ysb-searchhistory, .ysb-searchhistory * {
    animation: none !important;
    transition: none !important;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .ysb-menu {
    background: var(--ysb-card);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
@media (max-width: 1000px) {
  .ysb-headtools { flex-wrap: wrap; }
  .ysb-searchwrap { flex: 1 1 100%; max-width: none; }
}
@media (max-width: 760px) {
  .ysb-header { padding: 10px 14px 8px; gap: 10px; }
  .ysb-title { font-size: 17px; }
  .ysb-header-meta { font-size: 10.5px; line-height: 15px; }
  .ysb-build, .ysb-header-metasep { display: none; }
  .ysb-searchwrap { width: 100%; max-width: none; }
  .ysb-searchbox { height: 36px; }
  .ysb-pageactions .ysb-btn,
  .ysb-pageactions .ysb-iconbtn { height: 36px; }
  .ysb-carddetails { height: 28px; padding: 0 9px; font-size: 12px; }
  .ysb-listdetails { height: 30px; }

  .ysb-toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }
  .ysb-toolbar::-webkit-scrollbar { display: none; }
  .ysb-toolbar > * { flex: none; }
  .ysb-viewbtn { height: 30px; padding: 0 12px; font-size: 12px; }
  .ysb-toolbarbtn { height: 34px; }
  .ysb-filterpanel { max-height: 44vh; overflow: auto; }

  .ysb-board {
    justify-content: flex-start;
    gap: 10px;
    padding: 10px 14px calc(14px + env(safe-area-inset-bottom));
    scroll-snap-type: x proximity;
    scroll-padding-inline: 14px;
    -webkit-overflow-scrolling: touch;
  }
  .ysb-col {
    flex-basis: 84vw;
    width: 84vw;
    scroll-snap-align: start;
  }
  .ysb-colhead { padding: 10px 10px 6px; }
  .ysb-pinbtn, .ysb-coladd { width: 28px; height: 28px; }

  .ysb-view { padding: 10px 14px 20px; }
  .ysb-listrow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    padding: 10px 12px;
  }
  .ysb-listcode { order: 1; }
  .ysb-listmain { order: 2; flex: 1 1 100%; }
  .ysb-listlabels { order: 3; flex: 1 1 100%; }
  .ysb-listagent, .ysb-listdir, .ysb-listtime { order: 4; }
  .ysb-listdetails { order: 5; margin-left: auto; }

  .ysb-formrow { grid-template-columns: 1fr; }
  .ysb-filterrow { padding-left: 0; }
  .ysb-overlay { padding: 10px; }
  .ysb-modal { padding: 18px; width: 100%; }
  .ysb-detail-backdrop { padding: 0; align-items: stretch; }
  .ysb-detail {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border: 0;
    border-radius: 0;
  }
  .ysb-detail-body { padding-bottom: env(safe-area-inset-bottom); }
  .ysb-labelrow { flex-wrap: wrap; }
  .ysb-labelactions { width: 100%; justify-content: flex-end; }
  .ysb-menuitem { min-height: 36px; font-size: 14px; }
  .ysb-widget-head { flex-wrap: wrap; row-gap: 4px; }
}
`;
