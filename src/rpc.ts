export const BoardRpc = {
  id: "zmultica.board",
  methods: {
    list: {
      input: { type: "object", properties: {} },
      output: { type: "array" },
    },
    create: {
      input: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          labels: { type: "array", items: { type: "string" } },
          directory: { type: "string" },
          agent: { type: "string" },
        },
        required: ["title", "directory"],
      },
      output: { type: "object" },
    },
    update: {
      input: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          patch: { type: "object" },
        },
        required: ["taskId", "patch"],
      },
      output: { type: "object" },
    },
    get: {
      input: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
      output: { type: "object" },
    },
    taskStart: {
      input: {
        type: "object",
        properties: { taskId: { type: "string" }, text: { type: "string" } },
        required: ["taskId"],
      },
      output: { type: "object" },
    },
    documentGet: {
      input: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
      output: { type: "object" },
    },
    sessionList: {
      input: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
      output: { type: "object" },
    },
    sessionCreate: {
      input: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          goal: { type: "string" },
          directory: { type: "string" },
          agent: { type: "string" },
        },
        required: ["taskId", "goal"],
      },
      output: { type: "object" },
    },
    sessionStart: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" }, text: { type: "string" } },
        required: ["sessionID"],
      },
      output: { type: "object" },
    },
    sessionLink: {
      input: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          sessionID: { type: "string" },
          goal: { type: "string" },
        },
        required: ["taskId", "sessionID", "goal"],
      },
      output: { type: "object" },
    },
    sessionTail: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
      },
      output: { type: "object" },
    },
    labelList: {
      input: { type: "object", properties: {} },
      output: { type: "array" },
    },
    labelCreate: {
      input: {
        type: "object",
        properties: { name: { type: "string" }, color: { type: "string" } },
        required: ["name"],
      },
      output: { type: "object" },
    },
    labelRename: {
      input: {
        type: "object",
        properties: { id: { type: "string" }, name: { type: "string" } },
        required: ["id", "name"],
      },
      output: { type: "object" },
    },
    labelDelete: {
      input: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      output: { type: "object" },
    },
    setDocument: {
      input: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          content: { type: "string" },
        },
        required: ["taskId", "content"],
      },
      output: { type: "object" },
    },
  },
  events: {},
} as const;
