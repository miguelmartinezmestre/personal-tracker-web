import { Doc } from '@/convex/_generated/dataModel';
import { UpdateProgress } from '@/features/update-progress/schemas/update-progress';

export function mapDocToUpdateProgress(progressUpdateDoc: Doc<'progressUpdates'>): UpdateProgress {
    return {
        _id: progressUpdateDoc._id.toString(),
        updatedValue: progressUpdateDoc.updatedValue,
        updateDate: new Date(progressUpdateDoc.updateDate),
        comment: progressUpdateDoc.comment ?? null,
    };
}
