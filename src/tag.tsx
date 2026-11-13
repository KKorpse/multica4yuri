import { For, Show, createMemo, createSignal } from "solid-js";
import type { T } from "./i18n";
import { labelColor, uniqueLabels } from "./model";

export function TagEditor(props: {
  value: string[];
  suggestions: Array<{ name: string; count: number }>;
  placeholder: string;
  t: T;
  colorOf?: (name: string) => string;
  onChange(next: string[]): void;
}) {
  const [draft, setDraft] = createSignal("");
  const freeSuggestions = createMemo(() =>
    props.suggestions.filter((entry) => !props.value.includes(entry.name)).slice(0, 6),
  );
  const colorOf = (name: string) => props.colorOf?.(name) ?? labelColor(name);

  function add(raw: string) {
    const value = raw.trim();
    if (!value) return;
    props.onChange(uniqueLabels([...props.value, value]));
    setDraft("");
  }

  return (
    <div class="ysb-tags">
      <For each={props.value}>
        {(label) => (
          <span class="ysb-tag" style={`--ysb-label:${colorOf(label)}`}>
            <span class="ysb-chipdot" />
            {label}
            <button
              type="button"
              title={props.t("label.remove")}
              aria-label={props.t("label.remove")}
              onClick={() => props.onChange(props.value.filter((item) => item !== label))}
            >
              ×
            </button>
          </span>
        )}
      </For>
      <input
        class="ysb-input ysb-taginput"
        value={draft()}
        placeholder={props.placeholder}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft());
          }
        }}
      />
      <Show when={freeSuggestions().length > 0}>
        <div class="ysb-suggestions">
          <For each={freeSuggestions()}>
            {(entry) => (
              <button class="ysb-suggestion" type="button" onClick={() => add(entry.name)}>
                {entry.name}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
