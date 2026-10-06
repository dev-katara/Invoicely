CREATE TABLE workspaces (
	id text PRIMARY KEY NOT NULL,
	owner_id text NOT NULL,
	name text NOT NULL,
	vat_number text DEFAULT '' NOT NULL,
	address text DEFAULT '' NOT NULL,
	email text DEFAULT '' NOT NULL,
	mode text NOT NULL,
	created_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX workspace_owner ON workspaces (owner_id);--> statement-breakpoint
CREATE TABLE invoices (
	id text PRIMARY KEY NOT NULL,
	workspace_id text NOT NULL,
	reference text NOT NULL,
	kind text NOT NULL,
	counterparty text NOT NULL,
	vat_number text DEFAULT '' NOT NULL,
	email text DEFAULT '' NOT NULL,
	date text NOT NULL,
	due_date text NOT NULL,
	category text NOT NULL,
	items text NOT NULL,
	net_cents integer NOT NULL,
	vat_cents integer NOT NULL,
	total_cents integer NOT NULL,
	status text DEFAULT 'draft' NOT NULL,
	notes text DEFAULT '' NOT NULL,
	file_id text,
	created_at text NOT NULL,
	updated_at text NOT NULL,
	FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX invoice_reference_workspace ON invoices (workspace_id,reference);--> statement-breakpoint
CREATE INDEX invoice_workspace_date ON invoices (workspace_id,date);--> statement-breakpoint
CREATE TABLE contacts (
	id text PRIMARY KEY NOT NULL,
	workspace_id text NOT NULL,
	name text NOT NULL,
	vat_number text NOT NULL,
	email text DEFAULT '' NOT NULL,
	address text DEFAULT '' NOT NULL,
	created_at text NOT NULL,
	FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX contact_vat_workspace ON contacts (workspace_id,vat_number);--> statement-breakpoint
CREATE TABLE uploads (
	id text PRIMARY KEY NOT NULL,
	workspace_id text NOT NULL,
	filename text NOT NULL,
	mime text NOT NULL,
	size integer NOT NULL,
	object_key text NOT NULL,
	sha256 text NOT NULL,
	created_at text NOT NULL,
	FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX upload_hash_workspace ON uploads (workspace_id,sha256);--> statement-breakpoint
CREATE TABLE audit_logs (
	id text PRIMARY KEY NOT NULL,
	workspace_id text NOT NULL,
	action text NOT NULL,
	entity_id text NOT NULL,
	created_at text NOT NULL,
	FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX audit_workspace_date ON audit_logs (workspace_id,created_at);--> statement-breakpoint
CREATE TABLE rate_limits (
	key text PRIMARY KEY NOT NULL,
	count integer NOT NULL,
	expires_at integer NOT NULL
);
