from typing import Any, Dict, List, Tuple
from ortools.sat.python import cp_model


class ObjectiveBuilder:
    def __init__(self, model: cp_model.CpModel):
        self.model = model

    def set_objective(self, terms: List[cp_model.LinearExpr]):
        if terms:
            self.model.maximize(sum(terms))
        else:
            # If no soft preferences exist, use constant 0
            self.model.maximize(0)
