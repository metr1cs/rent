from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Task:
    stage: str
    objective: str
    context: dict[str, str] = field(default_factory=dict)
    priority: Priority = Priority.MEDIUM


@dataclass
class TaskResult:
    stage: str
    agent: str
    outputs: list[str]
    blockers: list[str] = field(default_factory=list)
    handoff: dict[str, str] = field(default_factory=dict)


@dataclass
class OrchestrationReport:
    mission: str
    decisions: list[str]
    steps: list[TaskResult]
    quality_gate_passed: bool
    quality_notes: list[str]
