from __future__ import annotations

from dataclasses import dataclass

from ai_team.models import OrchestrationReport, TaskResult


@dataclass
class AgentScore:
    agent: str
    score: float
    reasons: list[str]


def score_step(step: TaskResult) -> AgentScore:
    reasons: list[str] = []

    if step.blockers:
        score = max(0.0, 0.45 - 0.12 * len(step.blockers))
        reasons.append(f"blockers={len(step.blockers)}")
    else:
        score = 0.72

    if len(step.outputs) >= 3:
        score += 0.12
        reasons.append("enough_outputs")

    if any(item.startswith("Policy:") for item in step.outputs):
        score += 0.10
        reasons.append("policy_enforced")

    if step.handoff:
        score += 0.06
        reasons.append("clear_handoff")

    if step.stage in {"qa", "security", "release_ops", "decision"}:
        score += 0.05
        reasons.append("quality_stage")

    return AgentScore(agent=step.agent, score=round(min(score, 1.0), 3), reasons=reasons)


def score_report(report: OrchestrationReport) -> tuple[list[AgentScore], float]:
    step_scores = [score_step(step) for step in report.steps]
    if not step_scores:
        return step_scores, 0.0

    avg = sum(item.score for item in step_scores) / len(step_scores)
    if report.quality_gate_passed:
        avg = min(avg + 0.03, 1.0)

    return step_scores, round(avg, 3)
