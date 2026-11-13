import { statusColor } from "./model";

export function StatusIcon(props: { status: string; size?: number }) {
  const color = () => statusColor(props.status);
  const shape = (): any => {
    switch (props.status) {
      case "待分配":
        return <circle cx="6" cy="6" r="4.3" stroke-dasharray="1.7 1.7" />;
      case "执行中":
        return (
          <>
            <circle cx="6" cy="6" r="4.3" />
            <path d="M6 1.7a4.3 4.3 0 0 1 0 8.6Z" fill={color()} stroke="none" />
          </>
        );
      case "已完成":
        return (
          <>
            <circle cx="6" cy="6" r="4.3" />
            <path d="m3.8 6.1 1.5 1.5 2.9-3" />
          </>
        );
      case "废弃":
        return (
          <>
            <circle cx="6" cy="6" r="4.3" />
            <path d="m3.7 8.3 4.6-4.6" />
          </>
        );
      default:
        return <circle cx="6" cy="6" r="4.3" />;
    }
  };

  return (
    <svg
      class="ysb-status-icon"
      width={props.size ?? 12}
      height={props.size ?? 12}
      viewBox="0 0 12 12"
      fill="none"
      stroke={color()}
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {shape()}
    </svg>
  );
}
