CREATE TYPE "public"."actor_kind" AS ENUM('user', 'agent', 'platform', 'chain', 'system');--> statement-breakpoint
CREATE TYPE "public"."agent_category" AS ENUM('swap', 'loan', 'risk', 'liquidity', 'token', 'research', 'orchestration', 'other');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('draft', 'pending_review', 'active', 'paused', 'deprecated', 'banned');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('email', 'passkey', 'siwe', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."capability_status" AS ENUM('active', 'paused', 'retired');--> statement-breakpoint
CREATE TYPE "public"."deliverable_decision" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."intent_status" AS ENUM('received', 'parsing', 'parsed', 'resolving', 'resolved', 'rejected', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('created', 'funded', 'accepted', 'delivered', 'settled', 'disputed', 'cancelled', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'sent', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TYPE "public"."payment_rail" AS ENUM('none', 'x402', 'erc8183');--> statement-breakpoint
CREATE TYPE "public"."permission_kind" AS ENUM('call', 'spend');--> statement-breakpoint
CREATE TYPE "public"."pricing_model" AS ENUM('per_job', 'per_request', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."principal_kind" AS ENUM('user', 'agent', 'developer', 'platform');--> statement-breakpoint
CREATE TYPE "public"."protocol_kind" AS ENUM('dex', 'lending', 'token_factory', 'liquidity_pool', 'oracle', 'bridge', 'other');--> statement-breakpoint
CREATE TYPE "public"."reputation_window" AS ENUM('day', 'week', 'month', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."secret_provider" AS ENUM('env', 'file', 'vault', 'aws_secrets_manager', 'gcp_secret_manager');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('pending', 'active', 'expired', 'revoked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."settlement_rail" AS ENUM('x402', 'erc8183');--> statement-breakpoint
CREATE TYPE "public"."spend_period" AS ENUM('minute', 'hour', 'day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."transaction_kind" AS ENUM('user_op', 'raw_tx');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'submitted', 'included', 'succeeded', 'reverted', 'dropped', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."wallet_owner_kind" AS ENUM('user', 'agent', 'platform');--> statement-breakpoint
CREATE TYPE "public"."wallet_signer_kind" AS ENUM('local_key', 'passkey', 'external');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('active', 'frozen', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."workflow_engine" AS ENUM('temporal', 'bullmq', 'inline');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'awaiting_authorization', 'authorized', 'running', 'waiting', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_kind" AS ENUM('agent_job', 'x402_purchase', 'direct_execution', 'wait', 'condition', 'notify');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_status" AS ENUM('pending', 'blocked', 'ready', 'running', 'awaiting_payment', 'awaiting_deliverable', 'succeeded', 'failed', 'skipped', 'compensated');--> statement-breakpoint
CREATE TYPE "public"."x402_payment_status" AS ENUM('quoted', 'authorized', 'submitted', 'settled', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."x402_rail" AS ENUM('permit2', 'eip3009');--> statement-breakpoint
CREATE TABLE "agent_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"chain_id" integer NOT NULL,
	"registry_address" char(42) NOT NULL,
	"onchain_agent_id" text NOT NULL,
	"agent_domain" text,
	"endpoint_url" text,
	"owner_address" char(42),
	"attestations" jsonb,
	"last_sync_block" bigint,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_identities_registry_lowercase" CHECK ("agent_identities"."registry_address" = lower("agent_identities"."registry_address"))
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "agent_category" DEFAULT 'other' NOT NULL,
	"version" text DEFAULT '0.1.0' NOT NULL,
	"endpoint_url" text,
	"status" "agent_status" DEFAULT 'draft' NOT NULL,
	"accepts_erc8183" boolean DEFAULT false NOT NULL,
	"accepts_x402" boolean DEFAULT false NOT NULL,
	"can_subcontract" boolean DEFAULT false NOT NULL,
	"description_embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_kind" "principal_kind" NOT NULL,
	"user_id" uuid,
	"agent_id" uuid,
	"developer_id" uuid,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"rate_limit_per_minute" integer,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_owner_matches_kind" CHECK (("api_keys"."owner_kind" = 'user' and "api_keys"."user_id" is not null)
        or ("api_keys"."owner_kind" = 'agent' and "api_keys"."agent_id" is not null)
        or ("api_keys"."owner_kind" = 'developer' and "api_keys"."developer_id" is not null)
        or ("api_keys"."owner_kind" = 'platform' and "api_keys"."user_id" is null and "api_keys"."agent_id" is null and "api_keys"."developer_id" is null))
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"address" char(42) NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"decimals" smallint NOT NULL,
	"is_native" boolean DEFAULT false NOT NULL,
	"is_settlement_token" boolean DEFAULT false NOT NULL,
	"permit2_supported" boolean DEFAULT false NOT NULL,
	"eip3009_supported" boolean DEFAULT false NOT NULL,
	"coingecko_id" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_address_lowercase" CHECK ("assets"."address" = lower("assets"."address")),
	CONSTRAINT "assets_decimals_range" CHECK ("assets"."decimals" between 0 and 36),
	CONSTRAINT "assets_native_uses_zero_address" CHECK ("assets"."is_native" = false or "assets"."address" = '0x0000000000000000000000000000000000000000')
);
--> statement-breakpoint
CREATE TABLE "authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"session_id" uuid,
	"session_public_key" text,
	"key_id" char(66) NOT NULL,
	"chain_id" integer NOT NULL,
	"keystore_address" char(42) NOT NULL,
	"permissions_snapshot" jsonb NOT NULL,
	"expiry" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"grant_tx_hash" char(66),
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"registered" boolean DEFAULT false NOT NULL,
	"keystore_fee_wei" numeric(78, 0),
	"revoke_tx_hash" char(66),
	"revoked_at" timestamp with time zone,
	"onchain_valid" boolean,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authorizations_keystore_lowercase" CHECK ("authorizations"."keystore_address" = lower("authorizations"."keystore_address"))
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"taxonomy_key" text NOT NULL,
	"description" text NOT NULL,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb NOT NULL,
	"pricing_model" "pricing_model" NOT NULL,
	"settlement_rail" "settlement_rail" NOT NULL,
	"unit_price" numeric(78, 0) NOT NULL,
	"price_asset_id" uuid NOT NULL,
	"x402_resource_url" text,
	"x402_method" text DEFAULT 'GET',
	"max_concurrency" integer DEFAULT 1 NOT NULL,
	"expected_duration_seconds" integer,
	"embedding" vector(1536),
	"status" "capability_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capabilities_rail_matches_pricing" CHECK (("capabilities"."pricing_model" = 'per_request' and "capabilities"."settlement_rail" = 'x402')
        or ("capabilities"."pricing_model" = 'per_job' and "capabilities"."settlement_rail" = 'erc8183')
        or "capabilities"."pricing_model" = 'subscription'),
	CONSTRAINT "capabilities_x402_needs_resource" CHECK ("capabilities"."settlement_rail" <> 'x402' or "capabilities"."x402_resource_url" is not null)
);
--> statement-breakpoint
CREATE TABLE "capability_assets" (
	"capability_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	CONSTRAINT "capability_assets_capability_id_asset_id_pk" PRIMARY KEY("capability_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "capability_protocols" (
	"capability_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	CONSTRAINT "capability_protocols_capability_id_protocol_id_pk" PRIMARY KEY("capability_id","protocol_id")
);
--> statement-breakpoint
CREATE TABLE "developers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"website" text,
	"contact_email" text,
	"payout_address" char(42),
	"verification" "verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_seq" bigint NOT NULL,
	"destination" text NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"schema_version" smallint DEFAULT 1 NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_id" uuid,
	"correlation_id" uuid,
	"causation_id" uuid,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"display_name" text,
	"auth_provider" "auth_provider" NOT NULL,
	"external_auth_id" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" char(42) NOT NULL,
	"owner_kind" "wallet_owner_kind" NOT NULL,
	"owner_user_id" uuid,
	"owner_agent_id" uuid,
	"signer_kind" "wallet_signer_kind" NOT NULL,
	"label" text,
	"chain_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"passkey_rp_id" text,
	"passkey_credential_id" text,
	"admin_public_key" text,
	"admin_key_id" char(66),
	"admin_key_registered" boolean DEFAULT false NOT NULL,
	"admin_key_registered_at" timestamp with time zone,
	"admin_registration_tx_hash" char(66),
	"status" "wallet_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_address_lowercase" CHECK ("wallets"."address" = lower("wallets"."address")),
	CONSTRAINT "wallets_owner_matches_kind" CHECK (("wallets"."owner_kind" = 'user' and "wallets"."owner_user_id" is not null and "wallets"."owner_agent_id" is null)
        or ("wallets"."owner_kind" = 'agent' and "wallets"."owner_agent_id" is not null and "wallets"."owner_user_id" is null)
        or ("wallets"."owner_kind" = 'platform' and "wallets"."owner_user_id" is null and "wallets"."owner_agent_id" is null)),
	CONSTRAINT "wallets_passkey_needs_rp_id" CHECK ("wallets"."signer_kind" <> 'passkey' or "wallets"."passkey_rp_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "protocol_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"chain_id" integer NOT NULL,
	"role" text NOT NULL,
	"address" char(42) NOT NULL,
	"allowlistable" boolean DEFAULT true NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_contracts_address_lowercase" CHECK ("protocol_contracts"."address" = lower("protocol_contracts"."address"))
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "protocol_kind" NOT NULL,
	"website" text,
	"docs_url" text,
	"risk_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid,
	"raw_text" text NOT NULL,
	"status" "intent_status" DEFAULT 'received' NOT NULL,
	"goal_tree" jsonb,
	"capability_graph" jsonb,
	"budget_limit" numeric(78, 0),
	"budget_asset_id" uuid,
	"deadline_at" timestamp with time zone,
	"planner_model" text,
	"planner_prompt_tokens" integer,
	"planner_completion_tokens" integer,
	"planner_latency_ms" integer,
	"error" jsonb,
	"parsed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"graph_node_id" text NOT NULL,
	"requested_taxonomy_key" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"rank" smallint NOT NULL,
	"score" real NOT NULL,
	"capability_fit_score" real NOT NULL,
	"reputation_score" real NOT NULL,
	"price_score" real NOT NULL,
	"availability_score" real NOT NULL,
	"scoring_weights" jsonb,
	"quoted_price" numeric(78, 0) NOT NULL,
	"quoted_asset_id" uuid NOT NULL,
	"settlement_rail" "settlement_rail" NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendations_score_range" CHECK ("recommendations"."score" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"session_id" uuid,
	"label" text,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"engine" "workflow_engine" DEFAULT 'temporal' NOT NULL,
	"graph" jsonb NOT NULL,
	"authorization_plan" jsonb,
	"approved_at" timestamp with time zone,
	"temporal_workflow_id" text,
	"temporal_run_id" text,
	"spent_amount" numeric(78, 0) DEFAULT '0' NOT NULL,
	"spend_asset_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_key" text NOT NULL,
	"sequence" smallint NOT NULL,
	"kind" "workflow_step_kind" NOT NULL,
	"payment_rail" "payment_rail" DEFAULT 'none' NOT NULL,
	"status" "workflow_step_status" DEFAULT 'pending' NOT NULL,
	"agent_id" uuid,
	"capability_id" uuid,
	"protocol_id" uuid,
	"depends_on" text[] DEFAULT '{}'::text[] NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"max_attempts" smallint DEFAULT 3 NOT NULL,
	"timeout_seconds" integer,
	"last_error" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_steps_paid_step_needs_agent" CHECK ("workflow_steps"."payment_rail" = 'none' or "workflow_steps"."agent_id" is not null),
	CONSTRAINT "workflow_steps_rail_matches_kind" CHECK (("workflow_steps"."kind" = 'agent_job' and "workflow_steps"."payment_rail" = 'erc8183')
        or ("workflow_steps"."kind" = 'x402_purchase' and "workflow_steps"."payment_rail" = 'x402')
        or ("workflow_steps"."kind" not in ('agent_job', 'x402_purchase') and "workflow_steps"."payment_rail" = 'none'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"granted_to_agent_id" uuid,
	"session_public_key" text NOT NULL,
	"key_id" char(66) NOT NULL,
	"chain_id" integer NOT NULL,
	"serialized" jsonb NOT NULL,
	"secret_provider" "secret_provider" NOT NULL,
	"secret_ref" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"registered" boolean DEFAULT false NOT NULL,
	"status" "session_status" DEFAULT 'pending' NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_revoked_has_timestamp" CHECK ("sessions"."status" <> 'revoked' or "sessions"."revoked_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" "permission_kind" NOT NULL,
	"target_address" char(42),
	"selector" jsonb,
	"token_address" char(42),
	"spend_limit" numeric(78, 0),
	"spend_period" "spend_period",
	"raw_entry" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_call_shape" CHECK ("permissions"."kind" <> 'call' or "permissions"."target_address" is not null),
	CONSTRAINT "permissions_spend_shape" CHECK ("permissions"."kind" <> 'spend'
        or ("permissions"."token_address" is not null and "permissions"."spend_limit" is not null and "permissions"."spend_period" is not null)),
	CONSTRAINT "permissions_addresses_lowercase" CHECK (("permissions"."target_address" is null or "permissions"."target_address" = lower("permissions"."target_address"))
        and ("permissions"."token_address" is null or "permissions"."token_address" = lower("permissions"."token_address")))
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_step_id" uuid,
	"hirer_kind" "principal_kind" NOT NULL,
	"hirer_user_id" uuid,
	"hirer_agent_id" uuid,
	"worker_agent_id" uuid NOT NULL,
	"capability_id" uuid,
	"chain_id" integer NOT NULL,
	"escrow_address" char(42) NOT NULL,
	"onchain_job_id" text,
	"spec" jsonb NOT NULL,
	"spec_hash" char(66) NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"asset_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'created' NOT NULL,
	"deadline_at" timestamp with time zone,
	"create_tx_hash" char(66),
	"fund_tx_hash" char(66),
	"settle_tx_hash" char(66),
	"dispute_tx_hash" char(66),
	"cancel_tx_hash" char(66),
	"dispute_reason" text,
	"funded_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_amount_positive" CHECK ("jobs"."amount"::numeric > 0),
	CONSTRAINT "jobs_escrow_lowercase" CHECK ("jobs"."escrow_address" = lower("jobs"."escrow_address")),
	CONSTRAINT "jobs_hirer_matches_kind" CHECK (("jobs"."hirer_kind" = 'user' and "jobs"."hirer_user_id" is not null and "jobs"."hirer_agent_id" is null)
        or ("jobs"."hirer_kind" = 'agent' and "jobs"."hirer_agent_id" is not null and "jobs"."hirer_user_id" is null)
        or ("jobs"."hirer_kind" = 'platform' and "jobs"."hirer_user_id" is null and "jobs"."hirer_agent_id" is null)),
	CONSTRAINT "jobs_no_self_hire" CHECK ("jobs"."hirer_agent_id" is null or "jobs"."hirer_agent_id" <> "jobs"."worker_agent_id")
);
--> statement-breakpoint
CREATE TABLE "job_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"submitted_by_agent_id" uuid NOT NULL,
	"payload" jsonb,
	"content_hash" char(66) NOT NULL,
	"storage_uri" text,
	"decision" "deliverable_decision" DEFAULT 'pending' NOT NULL,
	"decision_reason" text,
	"release_tx_hash" char(66),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_deliverables_decided_has_timestamp" CHECK ("job_deliverables"."decision" = 'pending' or "job_deliverables"."decided_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "x402_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" "payment_direction" NOT NULL,
	"workflow_step_id" uuid,
	"session_id" uuid,
	"payer_wallet_id" uuid,
	"payer_address" char(42) NOT NULL,
	"payee_address" char(42) NOT NULL,
	"payer_agent_id" uuid,
	"payee_agent_id" uuid,
	"resource_url" text NOT NULL,
	"resource_method" text DEFAULT 'GET' NOT NULL,
	"http_status" smallint,
	"rail" "x402_rail" NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"asset_id" uuid,
	"token_address" char(42) NOT NULL,
	"chain_id" integer NOT NULL,
	"facilitator_url" text,
	"payment_nonce" text,
	"settlement_tx_hash" char(66),
	"status" "x402_payment_status" DEFAULT 'quoted' NOT NULL,
	"error" jsonb,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "x402_payments_amount_positive" CHECK ("x402_payments"."amount" > 0),
	CONSTRAINT "x402_payments_outbound_needs_session" CHECK ("x402_payments"."direction" <> 'outbound' or "x402_payments"."session_id" is not null),
	CONSTRAINT "x402_payments_addresses_lowercase" CHECK ("x402_payments"."payer_address" = lower("x402_payments"."payer_address")
        and "x402_payments"."payee_address" = lower("x402_payments"."payee_address")
        and "x402_payments"."token_address" = lower("x402_payments"."token_address"))
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid,
	"session_id" uuid,
	"workflow_step_id" uuid,
	"job_id" uuid,
	"protocol_id" uuid,
	"chain_id" integer NOT NULL,
	"kind" "transaction_kind" DEFAULT 'user_op' NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"from_address" char(42) NOT NULL,
	"to_address" char(42),
	"user_op_hash" char(66),
	"tx_hash" char(66),
	"calls" jsonb,
	"value_wei" numeric(78, 0),
	"gas_used" numeric(78, 0),
	"effective_gas_price_wei" numeric(78, 0),
	"fee_wei" numeric(78, 0),
	"block_number" bigint,
	"block_timestamp" timestamp with time zone,
	"revert_reason" text,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_has_a_hash" CHECK ("transactions"."tx_hash" is not null or "transactions"."user_op_hash" is not null or "transactions"."status" = 'pending')
);
--> statement-breakpoint
CREATE TABLE "reputation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"window" "reputation_window" NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"jobs_failed" integer DEFAULT 0 NOT NULL,
	"jobs_disputed" integer DEFAULT 0 NOT NULL,
	"disputes_lost" integer DEFAULT 0 NOT NULL,
	"x402_requests" integer DEFAULT 0 NOT NULL,
	"x402_failures" integer DEFAULT 0 NOT NULL,
	"p50_latency_ms" integer,
	"p95_latency_ms" integer,
	"volume_usd" numeric(38, 6) DEFAULT '0' NOT NULL,
	"success_rate" real,
	"dispute_rate" real,
	"score" real,
	"source_event_seq" bigint,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reputation_score_range" CHECK ("reputation"."score" is null or "reputation"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "agent_identities" ADD CONSTRAINT "agent_identities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_price_asset_id_assets_id_fk" FOREIGN KEY ("price_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_assets" ADD CONSTRAINT "capability_assets_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_assets" ADD CONSTRAINT "capability_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_protocols" ADD CONSTRAINT "capability_protocols_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_protocols" ADD CONSTRAINT "capability_protocols_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developers" ADD CONSTRAINT "developers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_event_seq_events_seq_fk" FOREIGN KEY ("event_seq") REFERENCES "public"."events"("seq") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_contracts" ADD CONSTRAINT "protocol_contracts_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intents" ADD CONSTRAINT "intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intents" ADD CONSTRAINT "intents_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intents" ADD CONSTRAINT "intents_budget_asset_id_assets_id_fk" FOREIGN KEY ("budget_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_intent_id_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_quoted_asset_id_assets_id_fk" FOREIGN KEY ("quoted_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_intent_id_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_spend_asset_id_assets_id_fk" FOREIGN KEY ("spend_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_granted_to_agent_id_agents_id_fk" FOREIGN KEY ("granted_to_agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workflow_step_id_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hirer_user_id_users_id_fk" FOREIGN KEY ("hirer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hirer_agent_id_agents_id_fk" FOREIGN KEY ("hirer_agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_worker_agent_id_agents_id_fk" FOREIGN KEY ("worker_agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_deliverables" ADD CONSTRAINT "job_deliverables_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_deliverables" ADD CONSTRAINT "job_deliverables_submitted_by_agent_id_agents_id_fk" FOREIGN KEY ("submitted_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_workflow_step_id_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_payer_wallet_id_wallets_id_fk" FOREIGN KEY ("payer_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_payer_agent_id_agents_id_fk" FOREIGN KEY ("payer_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_payee_agent_id_agents_id_fk" FOREIGN KEY ("payee_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workflow_step_id_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation" ADD CONSTRAINT "reputation_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_identities_agent_key" ON "agent_identities" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_identities_onchain_key" ON "agent_identities" USING btree ("chain_id","registry_address","onchain_agent_id");--> statement-breakpoint
CREATE INDEX "agent_identities_owner_idx" ON "agent_identities" USING btree ("owner_address");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_slug_key" ON "agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agents_developer_idx" ON "agents" USING btree ("developer_id");--> statement-breakpoint
CREATE INDEX "agents_status_category_idx" ON "agents" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "agents_embedding_idx" ON "agents" USING hnsw ("description_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_owner_idx" ON "api_keys" USING btree ("owner_kind","status");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_agent_idx" ON "api_keys" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_chain_address_key" ON "assets" USING btree ("chain_id","address");--> statement-breakpoint
CREATE INDEX "assets_symbol_idx" ON "assets" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "authorizations_grant_key" ON "authorizations" USING btree ("chain_id","key_id","granted_at");--> statement-breakpoint
CREATE INDEX "authorizations_wallet_idx" ON "authorizations" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "authorizations_session_idx" ON "authorizations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "authorizations_key_idx" ON "authorizations" USING btree ("chain_id","key_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capabilities_agent_name_key" ON "capabilities" USING btree ("agent_id","name");--> statement-breakpoint
CREATE INDEX "capabilities_taxonomy_idx" ON "capabilities" USING btree ("taxonomy_key","status");--> statement-breakpoint
CREATE INDEX "capabilities_rail_idx" ON "capabilities" USING btree ("settlement_rail");--> statement-breakpoint
CREATE INDEX "capabilities_embedding_idx" ON "capabilities" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "capability_assets_asset_idx" ON "capability_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "capability_protocols_protocol_idx" ON "capability_protocols" USING btree ("protocol_id");--> statement-breakpoint
CREATE UNIQUE INDEX "developers_slug_key" ON "developers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "developers_user_idx" ON "developers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "developers_verification_idx" ON "developers" USING btree ("verification");--> statement-breakpoint
CREATE UNIQUE INDEX "event_outbox_destination_key" ON "event_outbox" USING btree ("event_seq","destination");--> statement-breakpoint
CREATE INDEX "event_outbox_pending_idx" ON "event_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_event_id_key" ON "events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_subject_idx" ON "events" USING btree ("subject_type","subject_id","seq");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type","occurred_at");--> statement-breakpoint
CREATE INDEX "events_correlation_idx" ON "events" USING btree ("correlation_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_external_auth_key" ON "users" USING btree ("auth_provider","external_auth_id");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_owner_agent_key" ON "wallets" USING btree ("owner_agent_id");--> statement-breakpoint
CREATE INDEX "wallets_owner_user_idx" ON "wallets" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_contracts_role_key" ON "protocol_contracts" USING btree ("protocol_id","chain_id","role");--> statement-breakpoint
CREATE INDEX "protocol_contracts_address_idx" ON "protocol_contracts" USING btree ("chain_id","address");--> statement-breakpoint
CREATE UNIQUE INDEX "protocols_slug_key" ON "protocols" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "protocols_kind_idx" ON "protocols" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "intents_user_idx" ON "intents" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "intents_status_idx" ON "intents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "recommendations_node_capability_key" ON "recommendations" USING btree ("intent_id","graph_node_id","capability_id");--> statement-breakpoint
CREATE INDEX "recommendations_node_rank_idx" ON "recommendations" USING btree ("intent_id","graph_node_id","rank");--> statement-breakpoint
CREATE INDEX "recommendations_agent_idx" ON "recommendations" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_temporal_key" ON "workflows" USING btree ("temporal_workflow_id");--> statement-breakpoint
CREATE INDEX "workflows_intent_idx" ON "workflows" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX "workflows_status_idx" ON "workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflows_wallet_idx" ON "workflows" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_steps_key_key" ON "workflow_steps" USING btree ("workflow_id","step_key");--> statement-breakpoint
CREATE INDEX "workflow_steps_workflow_sequence_idx" ON "workflow_steps" USING btree ("workflow_id","sequence");--> statement-breakpoint
CREATE INDEX "workflow_steps_status_idx" ON "workflow_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_steps_agent_idx" ON "workflow_steps" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_public_key_key" ON "sessions" USING btree ("session_public_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_wallet_key_id_key" ON "sessions" USING btree ("wallet_id","key_id","chain_id");--> statement-breakpoint
CREATE INDEX "sessions_wallet_status_idx" ON "sessions" USING btree ("wallet_id","status");--> statement-breakpoint
CREATE INDEX "sessions_agent_idx" ON "sessions" USING btree ("granted_to_agent_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "permissions_session_idx" ON "permissions" USING btree ("session_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_onchain_key" ON "jobs" USING btree ("chain_id","escrow_address","onchain_job_id");--> statement-breakpoint
CREATE INDEX "jobs_worker_status_idx" ON "jobs" USING btree ("worker_agent_id","status");--> statement-breakpoint
CREATE INDEX "jobs_hirer_agent_idx" ON "jobs" USING btree ("hirer_agent_id");--> statement-breakpoint
CREATE INDEX "jobs_hirer_user_idx" ON "jobs" USING btree ("hirer_user_id");--> statement-breakpoint
CREATE INDEX "jobs_step_idx" ON "jobs" USING btree ("workflow_step_id");--> statement-breakpoint
CREATE INDEX "jobs_status_deadline_idx" ON "jobs" USING btree ("status","deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_deliverables_version_key" ON "job_deliverables" USING btree ("job_id","version");--> statement-breakpoint
CREATE INDEX "job_deliverables_decision_idx" ON "job_deliverables" USING btree ("decision");--> statement-breakpoint
CREATE UNIQUE INDEX "x402_payments_nonce_key" ON "x402_payments" USING btree ("chain_id","payment_nonce");--> statement-breakpoint
CREATE INDEX "x402_payments_direction_status_idx" ON "x402_payments" USING btree ("direction","status");--> statement-breakpoint
CREATE INDEX "x402_payments_session_idx" ON "x402_payments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "x402_payments_payee_agent_idx" ON "x402_payments" USING btree ("payee_agent_id");--> statement-breakpoint
CREATE INDEX "x402_payments_payer_agent_idx" ON "x402_payments" USING btree ("payer_agent_id");--> statement-breakpoint
CREATE INDEX "x402_payments_step_idx" ON "x402_payments" USING btree ("workflow_step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_tx_hash_key" ON "transactions" USING btree ("chain_id","tx_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_op_key" ON "transactions" USING btree ("chain_id","user_op_hash");--> statement-breakpoint
CREATE INDEX "transactions_wallet_idx" ON "transactions" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_session_idx" ON "transactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "transactions_step_idx" ON "transactions" USING btree ("workflow_step_id");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reputation_agent_window_key" ON "reputation" USING btree ("agent_id","window");--> statement-breakpoint
CREATE INDEX "reputation_score_idx" ON "reputation" USING btree ("window","score");