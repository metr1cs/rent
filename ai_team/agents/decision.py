from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class DecisionAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "DecisionAgent",
            AgentPolicy(
                role="Final decision and release gate",
                non_negotiables=[
                    "Reject any release with unresolved critical blockers",
                    "Prioritize impact/effort and user value",
                ],
                acceptance_checks=[
                    "All critical gates passed",
                    "Decision log written",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Decision matrix applied: build now / defer / drop",
            "Final release verdict based on QA + Security + DevOps",
            "Post-release priorities documented for next sprint",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
