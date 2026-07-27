import type { Doc } from '@/convex/_generated/dataModel';

export type ObjectiveCapabilities = {
    canView: boolean;
    canEditDefinition: boolean;
    canDelete: boolean;
    canRestore: boolean;
    canPurge: boolean;
    canManageCollaborators: boolean;
    canContribute: boolean;
    canSetVisibility: boolean;
    canTransfer: boolean;
};

export type ObjectiveWithCapabilities = Doc<'objectives'> & {
    capabilities: ObjectiveCapabilities;
};
