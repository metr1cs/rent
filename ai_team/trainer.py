from __future__ import annotations

from ai_team.feedback import persist_run, update_playbooks
from ai_team.orchestrator import Orchestrator


class AutoTrainer:
    def __init__(self) -> None:
        self.orchestrator = Orchestrator()

    def train_once(self, mission: str) -> dict[str, object]:
        report = self.orchestrator.run(mission)
        scores = persist_run(report)
        update_playbooks(scores)

        return {
            "mission": mission,
            "quality_gate_passed": report.quality_gate_passed,
            "agents_scored": len(scores),
            "scores": scores,
        }
