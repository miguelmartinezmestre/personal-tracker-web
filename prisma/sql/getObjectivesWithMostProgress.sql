-- @param {Int} $1:userId The id of the user

SELECT 
    id,
    title,
    (currentValue/targetValue) as progress
FROM Objective
WHERE userId = ?
ORDER BY progress DESC