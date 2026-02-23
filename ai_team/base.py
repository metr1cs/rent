from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ai_team.models import Task, TaskResult


@dataclass
class AgentPolicy:
    role: str
    non_negotiables: list[str] = field(default_factory=list)
    acceptance_checks: list[str] = field(default_factory=list)


class Agent:
    name: str
    policy: AgentPolicy

    def __init__(self, name: str, policy: AgentPolicy) -> None:
        self.name = name
        self.policy = policy

    def run(self, task: Task) -> TaskResult:
        raise NotImplementedError

    def _playbook_focus(self) -> list[str]:
        playbook_file = Path(__file__).resolve().parent / "playbooks" / f"{self.name}.json"
        if not playbook_file.exists():
            return []

        data = json.loads(playbook_file.read_text(encoding="utf-8"))
        focus = data.get("focus", [])
        tighten = data.get("tighten", [])

        tail_focus = focus[-2:] if isinstance(focus, list) else []
        tail_tighten = tighten[-1:] if isinstance(tighten, list) else []

        notes = [f"Playbook focus: {item}" for item in tail_focus]
        notes.extend(f"Playbook tighten: {item}" for item in tail_tighten)
        return notes

    def _enforce_policy(self) -> list[str]:
        return [f"Policy: {rule}" for rule in self.policy.non_negotiables] + self._playbook_focus()
