import { Command, Plugin, Style, TitlebarItem } from "@opencode/plugin/gui";
import { createBoard } from "./board";
import {
  BUILD,
  isMobileSurface,
  isTouchDevice,
  openPluginPage,
  PAGE_ID,
  WorkStatus,
  YuriPage,
} from "./host";
import { messages } from "./i18n";
import { CSS } from "./styles";
import { BoardPage } from "./ui";
import { TaskStatus } from "./widget";

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

    ctx.add(WorkStatus, {
      id: "task",
      order: 0,
      render: (props) => (
        <TaskStatus board={board} t={ctx.t} sessionID={props.session?.id} onOpenBoard={openBoard} />
      ),
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
