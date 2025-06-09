// Custom Query System for Integration Engine
export const customQueries = pgTable("custom_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  systemId: integer("system_id").notNull().references(() => externalSystems.id),
  queryType: text("query_type").notNull(), // 'jql', 'sql', 'rest', 'graphql', 'splunk', 'carbonblack', 'custom'
  query: text("query").notNull(), // The actual query string (JQL, SQL, etc.)
  parameters: jsonb("parameters").notNull().default({}), // Query parameters/variables
  dataMapping: jsonb("data_mapping").notNull().default({}), // How to extract data from response
  refreshInterval: integer("refresh_interval").notNull().default(300), // seconds
  cacheEnabled: boolean("cache_enabled").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false), // Can other users use this query
  tags: text("tags").array(), // For categorization
  metadata: jsonb("metadata"), // Additional query metadata
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const queryExecutions = pgTable("query_executions", {
  id: serial("id").primaryKey(),
  queryId: integer("query_id").notNull().references(() => customQueries.id),
  executedBy: integer("executed_by").references(() => users.id), // null for system executions
  status: text("status").notNull(), // 'running', 'completed', 'failed', 'cached'
  resultData: jsonb("result_data"), // The query result
  executionTime: integer("execution_time"), // milliseconds
  error: text("error"), // Error message if failed
  recordCount: integer("record_count"), // Number of records returned
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const queryWidgets = pgTable("query_widgets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  queryId: integer("query_id").notNull().references(() => customQueries.id),
  widgetType: text("widget_type").notNull(), // 'chart', 'table', 'metric', 'list', 'gauge'
  visualConfig: jsonb("visual_config").notNull().default({}), // Chart type, colors, etc.
  dataConfig: jsonb("data_config").notNull().default({}), // How to process query data for display
  size: text("size").notNull().default("medium"), // 'small', 'medium', 'large'
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userQueryDashboards = pgTable("user_query_dashboards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  widgetId: integer("widget_id").notNull().references(() => queryWidgets.id),
  position: jsonb("position").notNull().default({}), // { x, y, w, h } for grid layout
  isVisible: boolean("is_visible").notNull().default(true),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

// Relations for Query System
export const customQueriesRelations = relations(customQueries, ({ one, many }) => ({
  system: one(externalSystems, { fields: [customQueries.systemId], references: [externalSystems.id] }),
  createdByUser: one(users, { fields: [customQueries.createdBy], references: [users.id] }),
  executions: many(queryExecutions),
  widgets: many(queryWidgets),
}));

export const queryExecutionsRelations = relations(queryExecutions, ({ one }) => ({
  query: one(customQueries, { fields: [queryExecutions.queryId], references: [customQueries.id] }),
  executedByUser: one(users, { fields: [queryExecutions.executedBy], references: [users.id] }),
}));

export const queryWidgetsRelations = relations(queryWidgets, ({ one, many }) => ({
  query: one(customQueries, { fields: [queryWidgets.queryId], references: [customQueries.id] }),
  createdByUser: one(users, { fields: [queryWidgets.createdBy], references: [users.id] }),
  userDashboards: many(userQueryDashboards),
}));

export const userQueryDashboardsRelations = relations(userQueryDashboards, ({ one }) => ({
  user: one(users, { fields: [userQueryDashboards.userId], references: [users.id] }),
  widget: one(queryWidgets, { fields: [userQueryDashboards.widgetId], references: [queryWidgets.id] }),
}));

// Schemas for Query System
export const insertCustomQuerySchema = createInsertSchema(customQueries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQueryExecutionSchema = createInsertSchema(queryExecutions).omit({
  id: true,
  startedAt: true,
});

export const insertQueryWidgetSchema = createInsertSchema(queryWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserQueryDashboardSchema = createInsertSchema(userQueryDashboards).omit({
  id: true,
  addedAt: true,
});

// Types for Query System
export type InsertCustomQuery = z.infer<typeof insertCustomQuerySchema>;
export type CustomQuery = typeof customQueries.$inferSelect;

export type InsertQueryExecution = z.infer<typeof insertQueryExecutionSchema>;
export type QueryExecution = typeof queryExecutions.$inferSelect;

export type InsertQueryWidget = z.infer<typeof insertQueryWidgetSchema>;
export type QueryWidget = typeof queryWidgets.$inferSelect;

export type InsertUserQueryDashboard = z.infer<typeof insertUserQueryDashboardSchema>;
export type UserQueryDashboard = typeof userQueryDashboards.$inferSelect; 