export function SpriteIcon(props: { name: string; size?: number }) {
  return (
    <svg
      class="ysb-sprite"
      width={props.size ?? 12}
      height={props.size ?? 12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <use href={`#yuri-${props.name}`} />
    </svg>
  );
}

export function Chevron(props: { up?: boolean }) {
  return (
    <svg
      class="ysb-widget-toggleicon"
      classList={{ up: !!props.up }}
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="--yuri-icon-stroke: 2"
      aria-hidden="true"
    >
      <use href="#yuri-arrow-down-s" />
    </svg>
  );
}
