import { createEffect } from "solid-js";
import { Command, Panel, Plugin, Style, TitlebarItem } from "@opencode/plugin/gui";
import { createBoard } from "./board";
import { BUILD, isMobileSurface, isTouchDevice, openPluginPage, PAGE_ID, YuriPage } from "./host";
import { messages } from "./i18n";
import { TaskPanel } from "./panel";
import { CSS } from "./styles";
import { BoardPage } from "./ui";

export default Plugin.define({
  i18n: { en: messages.en, zh: messages.zh },
  setup(ctx) {
    const board = createBoard(ctx, ctx.t);
    console.info(`[session-board] build ${BUILD}`);

    ctx.add(Style, CSS);
    if (!isTouchDevice()) {
      ctx.add(YuriPage, {
        id: PAGE_ID,
        title: ctx.t("page.title"),
        icon: "task",
        render: () => <BoardPage board={board} t={ctx.t} />,
      });
    }

    const openBoard = () => {
      if (isMobileSurface()) {
        ctx.toast.show({ title: ctx.t("board.desktopOnly") });
        return;
      }
      openPluginPage(ctx);
    };

    const currentSession = () => {
      const session = ctx.sessions.current();
      if (!session) ctx.toast.show({ title: ctx.t("panel.noSession") });
      return session;
    };
    const openTaskPanel = () => {
      const session = currentSession();
      if (session) ctx.layout.open(`${ctx.id}:task`, session);
    };
    const toggleTaskPanel = () => {
      const session = currentSession();
      if (session) ctx.layout.toggle(`${ctx.id}:task`, session);
    };
    const taskTab = {
      id: "task",
      get title() {
        return ctx.t("panel.title");
      },
      pinned: true,
    };

    ctx.add(Panel, {
      id: "task",
      region: "side",
      list: () => [taskTab],
      render: (panel) => (
        <TaskPanel
          board={board}
          t={ctx.t}
          session={panel.session}
          onOpenBoard={() => openBoard()}
        />
      ),
    });

    const autoOpened = new Set<string>();
    createEffect(() => {
      const session = ctx.sessions.current();
      if (!session || autoOpened.has(session.key)) return;
      const task = board.task(session.id);
      if (!task) {
        board.activate();
        return;
      }
      autoOpened.add(session.key);
      const key = `${ctx.id}:task`;
      if (ctx.layout.state(key, session) === "closed") {
        ctx.layout.open(key, session);
      }
    });

    ctx.add(Command, (): Command => ({
      id: "open",
      title: ctx.t("command.open"),
      description: ctx.t("page.subtitle"),
      keywords: "session board kanban task 看板 任务",
      bind: "mod+shift+b",
      run: () => openBoard(),
    }));

    ctx.add(Command, (): Command => ({
      id: "new",
      title: ctx.t("command.new"),
      keywords: "new task create 新建 任务",
      run: () => {
        if (isMobileSurface()) {
          ctx.toast.show({ title: ctx.t("board.desktopOnly") });
          return;
        }
        openPluginPage(ctx);
        board.requestCreate();
      },
    }));

    ctx.add(Command, (): Command => ({
      id: "panel",
      title: ctx.t("command.panel"),
      keywords: "task panel side 任务 面板 侧栏",
      bind: "mod+shift+t",
      run: openTaskPanel,
    }));

    ctx.add(TitlebarItem, (): TitlebarItem | undefined => {
      const session = ctx.sessions.current();
      if (!session) return undefined;
      return {
        id: "panel",
        label: ctx.t("titlebar.panel"),
        title: ctx.t("command.panel"),
        icon: "task",
        pressed: ctx.layout.state(`${ctx.id}:task`, session) === "visible",
        run: toggleTaskPanel,
      };
    });

    ctx.add(TitlebarItem, (): TitlebarItem => ({
      id: "open",
      label: ctx.t("titlebar.label"),
      title: ctx.t("page.title"),
      icon: "checklist",
      run: () => openBoard(),
    }));

    return () => board.dispose();
  },
});
