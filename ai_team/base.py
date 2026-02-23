from __future__ import annotations

from dataclasses import dataclass, field

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

    def _enforce_policy(self) -> list[str]:
        return [f"Policy: {rule}" for rule in self.policy.non_negotiables]
