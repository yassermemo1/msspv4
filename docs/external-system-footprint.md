# External System / Integration-Engine Foot-print

A line-item catalogue of every piece of functionality, database schema, scheduled job and UI screen that currently depends on the **external-system** and **integration-engine** layers.  This serves as the authoritative checklist for the migration to the new Plugin Platform.

## 1  Database artefacts

| Table / View | Purpose | Key columns | Notes |
|--------------|---------|------------|-------|
| `external_systems` | Registry of vendor systems (Jira, FortiGate, …) | `id`, `system_name`, `display_name`, `base_url`, `auth_type`, `auth_config → jsonb`, `api_endpoints → jsonb`, `is_active`, `default_mapping → jsonb` | `default_mapping` added in v1.6.0 |
| `external_system_instances` | Per-client / per-environment connections | `id`, `system_id`, `instance_name`, `base_url`, `auth_type`, `auth_config`, `connection_config`, `is_active` | New table in v1.6.0 |
| `external_widget_templates` | Re-usable widgets bound to a system | `id`, `system_id`, `name`, … | Widgets will be re-keyed to `plugin_name` during cut-over |

## 2  REST API surface

| Method & Path | Auth | Description |
|---------------|------|-------------|
| GET `/api/external-systems` | Any | List external systems |
| POST `/api/external-systems` | Manager+ | Create system |
| PUT `/api/external-systems/:id` | Manager+ | Update system |
| … | | |
| GET `/api/external-system-instances/:id/queries` | Any | Return the 10 default queries (added v1.6.0) |
| POST `/api/external-system-instances/:id/query/:queryId` | Any | Execute a default query & stream JSON |

Full list exported automatically via the Jest route-snapshot (see `/tests/generated/api-spec.md`).

## 3  Scheduled workers / cron

* **Integration Engine** – pulls data from external systems into the MSSP DB every 5 min.  Config lives in `server/startup-integrations.ts` and `server/jobs/*`.
* **Jira contract reminders** – depends on `external_systems` entry `jira-default`.

## 4  Front-end touch-points

* `/plugins` – New page (supersedes `/external-systems`) – CRUD instances, run default queries, save widget.
* Dashboard widgets – reference `system_id` right now.
* Client detail page – legacy component imports `@/components/external-systems/client-external-mappings` (to be deleted).

## 5  Logging & audit hooks

* `server/storage.ts` → `logAuditAction()` calls on CREATE/UPDATE/DELETE for systems & instances.

## 6  Gaps / TODO for Plugin Platform

* Widget engine must accept `plugin_name` instead of `system_id`.
* Integration cron worker will be replaced by per-plugin "sync" jobs.
* Old `/external-systems*` routes scheduled for removal **after** dual-write period.

---

_last updated: <!-- date will be injected by script -->_ 