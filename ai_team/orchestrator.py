from __future__ import annotations

from ai_team.models import OrchestrationReport, Priority, Task
from ai_team.registry import AgentRegistry


class Orchestrator:
    def __init__(self) -> None:
        self.registry = AgentRegistry()

    def run(self, mission: str) -> OrchestrationReport:
        steps = []
        decisions = []

        planning_task = Task(stage="planning", objective=mission, priority=Priority.CRITICAL)
        product_result = self.registry.pm.run(planning_task)
        steps.append(product_result)

        architecture_result = self.registry.tech_lead.run(Task(stage="architecture", objective=mission))
        steps.append(architecture_result)

        design_result = self.registry.design.run(Task(stage="design", objective=mission))
        steps.append(design_result)

        backend_result = self.registry.backend.run(Task(stage="backend", objective=mission))
        frontend_result = self.registry.frontend.run(Task(stage="frontend", objective=mission))
        steps.extend([backend_result, frontend_result])

        qa_result = self.registry.qa.run(Task(stage="qa", objective=mission, priority=Priority.HIGH))
        qa_automation_result = self.registry.qa_automation.run(Task(stage="qa_automation", objective=mission, priority=Priority.HIGH))
        security_result = self.registry.security.run(Task(stage="security", objective=mission, priority=Priority.HIGH))
        devops_result = self.registry.devops.run(Task(stage="release_ops", objective=mission, priority=Priority.HIGH))
        sre_result = self.registry.sre.run(Task(stage="sre", objective=mission, priority=Priority.HIGH))
        steps.extend([qa_result, qa_automation_result, security_result, devops_result, sre_result])

        analytics_result = self.registry.analytics.run(Task(stage="analytics", objective=mission))
        product_analyst_result = self.registry.product_analyst.run(Task(stage="product_analytics", objective=mission))
        growth_result = self.registry.growth.run(Task(stage="growth", objective=mission))
        legal_result = self.registry.legal.run(Task(stage="legal_compliance", objective=mission))
        crm_retention_result = self.registry.crm_retention.run(Task(stage="crm_retention", objective=mission))
        support_result = self.registry.support.run(Task(stage="support_ops", objective=mission))
        steps.extend([analytics_result, product_analyst_result, growth_result, legal_result, crm_retention_result, support_result])

        decision_result = self.registry.decision.run(Task(stage="decision", objective=mission, priority=Priority.CRITICAL))
        steps.append(decision_result)

        decisions.extend(
            [
                "Core path locked: search -> venue modal -> quote -> booking -> review",
                "Owner path locked: register -> subscription 2000 RUB/month -> publish",
                "Release rule: QA + Security + DevOps gates are mandatory",
            ]
        )

        blocker_count = sum(len(step.blockers) for step in steps)
        quality_gate_passed = blocker_count == 0

        quality_notes = [
            "Build and smoke tests must pass before deployment",
            "Critical user paths have dedicated regression checklist",
            "Security and secret policy are part of release gate",
        ]

        return OrchestrationReport(
            mission=mission,
            decisions=decisions,
            steps=steps,
            quality_gate_passed=quality_gate_passed,
            quality_notes=quality_notes,
        )
