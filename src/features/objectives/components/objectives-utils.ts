export const computeObjectiveProgressPercent = (objective: {
    currentValue: number;
    targetValue: number;
    startValue: number;
}) => {
    const current = objective.currentValue;
    const target = objective.targetValue;
    const start = objective.startValue;
    const denominator = target - start;

    if (denominator <= 0) {
        return current >= target ? 100 : 0;
    }

    const percent = ((current - start) / denominator) * 100;
    return Math.min(Math.max(percent, 0), 100);
};
