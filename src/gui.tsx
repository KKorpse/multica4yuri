import { Command, MenuItem, Panel, Plugin, Slot, Style, TitlebarItem } from "@opencode/plugin/gui";
import { createBoard } from "./board";
import { BUILD, openPluginPage, PAGE_ID, YuriPage } from "./host";
import { messages } from "./i18n";
import { TaskPanel } from "./panel";
import { CSS } from "./styles";
import { BoardPage } from "./ui";
import { StatusIcon } from "./ui";

export default Plugin.define({
  i18n: { en: messages.en, zh: messages.zh },
  setup(ctx) {
    const board = createBoard(ctx, ctx.t);
    console.info(`[session-board] build ${BUILD}`);

    const openTaskPanel = () => {
      const session = ctx.sessions.current();
      if (!session) {
        ctx.toast.show({ title: ctx.t("panel.noSession") });
        return;
      }
      ctx.layout.open(`${ctx.id}:task`, session);
    };
    const taskTab = {
      id: "task",
      get title() {
        return ctx.t("panel.title");
      },
      pinned: true,
    };

    ctx.add(Style, CSS);
    ctx.add(YuriPage, {
      id: PAGE_ID,
      title: ctx.t("page.title"),
      icon: "task",
      render: () => <BoardPage board={board} t={ctx.t} />,
    });

    ctx.add(Panel, {
      id: "task",
      region: "side",
      mobile: {
        title: ctx.t("panel.title"),
        order: 40,
        kind: "menu",
        icon: "task",
      },
      list: () => [taskTab],
      render: (panel) => (
        <TaskPanel
          board={board}
          t={ctx.t}
          session={panel.session}
          onOpenBoard={() => openPluginPage(ctx)}
        />
      ),
    });

    ctx.add(Command, (): Command => ({
      id: "open",
      title: ctx.t("command.open"),
      description: ctx.t("page.subtitle"),
      keywords: "session board kanban task 看板 任务",
      bind: "mod+shift+b",
      run: () => openPluginPage(ctx),
    }));

    ctx.add(Command, (): Command => ({
      id: "new",
      title: ctx.t("command.new"),
      keywords: "new task create 新建 任务",
      run: () => {
        openPluginPage(ctx);
        board.requestCreate();
      },
    }));

    ctx.add(Command, (): Command => ({
      id: "panel",
      title: ctx.t("command.panel"),
      keywords: "task panel side 任务 面板 侧栏",
      run: openTaskPanel,
    }));

    ctx.add(MenuItem, (): MenuItem => {
      const session = ctx.sessions.current();
      const state = session ? ctx.layout.state(`${ctx.id}:task`, session) : "closed";
      return {
        menu: "session.panel",
        id: "task",
        title: ctx.t("panel.title"),
        icon: "task",
        order: 20,
        opened: state !== "closed",
        run: openTaskPanel,
      };
    });

    ctx.add(Slot, {
      at: "session.header",
      order: 10,
      render: (input) => {
        const task = board.task(input.session.id);
        return (
          <button
            class="ysb-headerentry"
            type="button"
            title={ctx.t("command.panel")}
            onClick={() => ctx.layout.open(`${ctx.id}:task`, input.session)}
          >
            <StatusIcon status={task?.status ?? "待规划"} size={12} />
            <span>{ctx.t("panel.title")}</span>
            <span class="ysb-headerentry-state">{task?.status ?? ctx.t("panel.join")}</span>
          </button>
        );
      },
    });

    ctx.add(TitlebarItem, (): TitlebarItem => ({
      id: "open",
      label: ctx.t("titlebar.label"),
      title: ctx.t("page.title"),
      icon: "task",
      run: () => openPluginPage(ctx),
    }));

    return () => board.dispose();
  },
});
