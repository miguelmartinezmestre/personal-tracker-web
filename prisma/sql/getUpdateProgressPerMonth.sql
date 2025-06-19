-- @param {Int} $1:userId The id of the user

SELECT 
    DATE_FORMAT(ProgressUpdate.createdAt, '%Y-%m') as month,
    SUM(ProgressUpdate.updatedValue) as progress
FROM ProgressUpdate
JOIN Objective ON ProgressUpdate.objectiveId = Objective.id
WHERE Objective.userId = ?
GROUP BY month;
