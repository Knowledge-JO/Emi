"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../components/workspace-shell";
import { errorText } from "@/lib/format";
import { listSkills, type SkillSummary } from "@/lib/rill";

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSkills()
      .then(setSkills)
      .catch((err: unknown) => setError(errorText(err)));
  }, []);

  return (
    <WorkspacePage title="Skills">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Skills</h2>
      <p className="text-sm text-muted">
        Competence catalog from <span className="font-mono">GET /skills</span>. A skill cannot grant
        a session.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="grid gap-3">
        {skills?.map((skill) => (
          <Link
            key={skill.id}
            href={`/app/skills/${skill.id}`}
            className="rounded-2xl border border-border p-4 hover:border-accent/40"
          >
            <p className="font-semibold text-foreground">{skill.name}</p>
            <p className="mt-1 font-mono text-[11px] text-muted">
              {skill.id} · {skill.category}
              {skill.writeOnchain ? " · writes on-chain" : ""}
            </p>
          </Link>
        ))}
      </div>
    </WorkspacePage>
  );
}
