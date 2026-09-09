"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../../components/workspace-shell";
import { errorText, shortAddress } from "@/lib/format";
import { getSkill, type SkillDetail } from "@/lib/rill";

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSkill(id)
      .then(setSkill)
      .catch((err: unknown) => setError(errorText(err)));
  }, [id]);

  return (
    <WorkspacePage title={skill?.name ?? "Skill"}>
      <Link href="/app/skills" className="text-xs text-accent hover:underline">
        All skills
      </Link>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {skill ? (
        <>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{skill.name}</h2>
          <p className="font-mono text-xs text-muted">
            {skill.id} · {skill.source} · {skill.category}
          </p>
          <p className="text-xs text-muted">
            {skill.taxonomyKeys.join(", ")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-foreground">May</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
                {skill.may.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">May not</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
                {skill.mayNot.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Call addresses</p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
              {skill.callAddresses.map((address) => (
                <li key={address}>{shortAddress(address)}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </WorkspacePage>
  );
}
