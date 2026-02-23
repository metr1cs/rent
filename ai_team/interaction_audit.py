from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from ai_team.models import OrchestrationReport, TaskResult
from ai_team.orchestrator import Orchestrator
from ai_team.scoring import score_report


@dataclass
class PromptLink:
    src_agent: str
    dst_agent: str
    prompt: str


def _build_prompt(src: TaskResult, dst: str, ask: str) -> str:
    signal = "; ".join(src.outputs[:2])
    return (
        f"Ты {dst}. Контекст от {src.agent}: {signal}. "
        f"Задача: {ask}. Верни результат в формате bullets + blockers + handoff."
    )


def build_prompt_links(steps: list[TaskResult]) -> list[PromptLink]:
    links: list[PromptLink] = []
    for step in steps:
        for dst, ask in step.handoff.items():
            links.append(PromptLink(src_agent=step.agent, dst_agent=dst, prompt=_build_prompt(step, dst, ask)))
    return links


def _policy_rate(steps: list[TaskResult]) -> float:
    if not steps:
        return 0.0
    with_policy = sum(1 for step in steps if any(item.startswith("Policy:") for item in step.outputs))
    return round(with_policy / len(steps), 3)


def _handoff_coverage(steps: list[TaskResult]) -> float:
    if not steps:
        return 0.0
    with_handoff = sum(1 for step in steps if step.handoff)
    return round(with_handoff / len(steps), 3)


def build_analytics(report: OrchestrationReport) -> dict[str, object]:
    links = build_prompt_links(report.steps)
    step_scores, total_score = score_report(report)

    by_agent = {item.agent: item.score for item in step_scores}
    min_agent = min(step_scores, key=lambda s: s.score)
    max_agent = max(step_scores, key=lambda s: s.score)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mission": report.mission,
        "quality_gate_passed": report.quality_gate_passed,
        "total_score": total_score,
        "policy_rate": _policy_rate(report.steps),
        "handoff_coverage": _handoff_coverage(report.steps),
        "prompt_links_count": len(links),
        "weakest_agent": {"agent": min_agent.agent, "score": min_agent.score},
        "strongest_agent": {"agent": max_agent.agent, "score": max_agent.score},
        "agent_scores": by_agent,
        "prompt_links": [link.__dict__ for link in links],
        "recommendations": [
            "Увеличить handoff coverage: заставить QA/Security/DevOps отдавать явные handoff в DecisionAgent.",
            "Унифицировать prompt-формат между всеми агентами (JSON contract).",
            "Добавить cross-check между DesignAgent и FrontendAgent перед QA стадией.",
        ],
    }


def run_audit(mission: str) -> dict[str, object]:
    report = Orchestrator().run(mission)
    analytics = build_analytics(report)

    base = Path(__file__).resolve().parent
    out_dir = base / "memory"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "interaction_audit_latest.json"
    out_file.write_text(json.dumps(analytics, ensure_ascii=False, indent=2), encoding="utf-8")

    return analytics
