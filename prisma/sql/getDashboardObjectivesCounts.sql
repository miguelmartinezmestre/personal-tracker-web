-- @param {Int} $1:userId The id of the user

SELECT 
    COUNT(*) as total_objectives,
    COUNT(CASE WHEN Objective.currentValue != Objective.targetValue THEN 1 END) as pending_objectives,
    COUNT(CASE WHEN Objective.currentValue = Objective.targetValue THEN 1 END) as completed_objectives
FROM Objective
WHERE Objective.userId = ?;
