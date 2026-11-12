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
