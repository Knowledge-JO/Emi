"use client";

import { useEffect, useState } from "react";

import { WorkspacePage } from "../../components/workspace-shell";
import { ApiError } from "@/lib/api";
import { errorText } from "@/lib/format";
import { issueAgentKey } from "@/lib/identity";
import {
  attachListingIdentity,
  becomePublisher,
  declareListingCapability,
  getPublisher,
  publishListing,
  registerListing,
  type Publisher,
} from "@/lib/publisher";

export default function PublisherPage() {
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [listingSlug, setListingSlug] = useState("");
  const [listingName, setListingName] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [onchainAgentId, setOnchainAgentId] = useState("");
  const [taxonomyKey, setTaxonomyKey] = useState("defi.swap");
  const [priceAssetId, setPriceAssetId] = useState("");
  const [assetIds, setAssetIds] = useState("");
  const [protocolIds, setProtocolIds] = useState("");
  const [unitPrice, setUnitPrice] = useState("0");
  const [issued, setIssued] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPublisher()
      .then(setPublisher)
      .catch((err: unknown) => {
        if (!(err instanceof ApiError) || err.status !== 404) setError(errorText(err));
      });
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Publish">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Publisher</h2>
      <p className="text-sm text-muted">
        Register as a publisher, list a draft, attach an ERC-8004 cache, declare a capability, then
        publish. Same services seed uses.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {publisher ? (
        <p className="rounded-xl border border-border px-3 py-2 text-sm">
          Signed in as publisher <span className="font-mono">{publisher.slug}</span> (
          {publisher.displayName})
        </p>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              setPublisher(await becomePublisher({ slug, displayName }));
            });
          }}
        >
          <p className="text-sm font-medium">Become a publisher</p>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="slug"
            className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
            required
          />
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="display name"
            className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
            required
          />
          <button type="submit" disabled={busy} className="btn btn-primary h-10 px-4">
            Register publisher
          </button>
        </form>
      )}

      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const listing = await registerListing({
              slug: listingSlug,
              name: listingName,
              description: listingDescription,
            });
            setListingSlug(listing.slug);
          });
        }}
      >
        <p className="text-sm font-medium">Draft listing</p>
        <input
          value={listingSlug}
          onChange={(event) => setListingSlug(event.target.value)}
          placeholder="listing slug"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
          required
        />
        <input
          value={listingName}
          onChange={(event) => setListingName(event.target.value)}
          placeholder="name"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
          required
        />
        <textarea
          value={listingDescription}
          onChange={(event) => setListingDescription(event.target.value)}
          placeholder="description"
          className="min-h-20 w-full rounded-xl border border-border bg-surface-deep px-3 py-2 text-sm"
          required
        />
        <button type="submit" disabled={busy} className="btn btn-ghost h-10 px-4">
          Save draft
        </button>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await attachListingIdentity(listingSlug, { onchainAgentId });
          });
        }}
      >
        <p className="text-sm font-medium">Attach ERC-8004 cache</p>
        <input
          value={onchainAgentId}
          onChange={(event) => setOnchainAgentId(event.target.value)}
          placeholder="on-chain agent id"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
          required
        />
        <button type="submit" disabled={busy} className="btn btn-ghost h-10 px-4">
          Attach identity
        </button>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await declareListingCapability(listingSlug, {
              name: listingName || listingSlug,
              taxonomyKey,
              description: listingDescription || taxonomyKey,
              inputSchema: {},
              outputSchema: {},
              pricingModel: "per_job",
              settlementRail: "erc8183",
              unitPrice,
              priceAssetId,
              assetIds: assetIds.split(",").map((part) => part.trim()).filter(Boolean),
              protocolIds: protocolIds.split(",").map((part) => part.trim()).filter(Boolean),
            });
          });
        }}
      >
        <p className="text-sm font-medium">Declare capability</p>
        <p className="text-xs text-muted">
          Asset and protocol ids are catalog UUIDs from seed. Publish still requires an identity
          cache and an active capability.
        </p>
        <input
          value={taxonomyKey}
          onChange={(event) => setTaxonomyKey(event.target.value)}
          placeholder="taxonomy key"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
        />
        <input
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          placeholder="unit price (integer string)"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
        />
        <input
          value={priceAssetId}
          onChange={(event) => setPriceAssetId(event.target.value)}
          placeholder="price asset uuid"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
        />
        <input
          value={assetIds}
          onChange={(event) => setAssetIds(event.target.value)}
          placeholder="asset uuids, comma separated"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
        />
        <input
          value={protocolIds}
          onChange={(event) => setProtocolIds(event.target.value)}
          placeholder="protocol uuids, comma separated"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
        />
        <button type="submit" disabled={busy} className="btn btn-ghost h-10 px-4">
          Declare
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !listingSlug}
          className="btn btn-primary h-10 px-4"
          onClick={() => void run(async () => { await publishListing(listingSlug); })}
        >
          Publish
        </button>
        <button
          type="button"
          disabled={busy || !listingSlug}
          className="btn btn-ghost h-10 px-4"
          onClick={() =>
            void run(async () => {
              const key = await issueAgentKey(listingSlug);
              setIssued(key.secret);
            })
          }
        >
          Issue API key
        </button>
      </div>
      {issued ? (
        <p className="break-all rounded-xl border border-accent/30 bg-accent/10 p-3 font-mono text-xs">
          Save this key now: {issued}
        </p>
      ) : null}
    </WorkspacePage>
  );
}
