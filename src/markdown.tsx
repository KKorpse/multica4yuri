import { createMemo } from "solid-js";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

export function Blocks(props: { text: string; onOpenLink?(href: string): void }) {
  const html = createMemo(() => markdown.render(props.text));
  return (
    <div
      class="ysb-widget-markdown"
      innerHTML={html()}
      onClick={(event) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest?.("a");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href) return;
        event.preventDefault();
        event.stopPropagation();
        props.onOpenLink?.(href);
      }}
    />
  );
}
