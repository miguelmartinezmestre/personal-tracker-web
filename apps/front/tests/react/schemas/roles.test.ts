import { describe, it, expect } from 'vitest';
import { Role, TeamRole } from './roles';

describe('Role enum', () => {
    it('should have ADMIN value', () => {
        expect(Role.ADMIN).toBe('admin');
    });

    it('should have USER value', () => {
        expect(Role.USER).toBe('user');
    });

    it('should have exactly 2 values', () => {
        const roleValues = Object.values(Role);
        expect(roleValues).toHaveLength(2);
    });

    it('should contain expected values', () => {
        const roleValues = Object.values(Role);
        expect(roleValues).toContain('admin');
        expect(roleValues).toContain('user');
    });

    it('should be usable in type comparisons', () => {
        const isAdmin = (role: Role) => role === Role.ADMIN;
        expect(isAdmin(Role.USER)).toBe(false);
        expect(isAdmin(Role.ADMIN)).toBe(true);
    });

    it('should be usable in switch statements', () => {
        const getPermissionLevel = (role: Role): number => {
            switch (role) {
                case Role.ADMIN:
                    return 100;
                case Role.USER:
                    return 10;
                default:
                    return 0;
            }
        };

        expect(getPermissionLevel(Role.ADMIN)).toBe(100);
        expect(getPermissionLevel(Role.USER)).toBe(10);
    });
});

describe('TeamRole enum', () => {
    it('should have OWNER value', () => {
        expect(TeamRole.OWNER).toBe('owner');
    });

    it('should have ADMIN value', () => {
        expect(TeamRole.ADMIN).toBe('admin');
    });

    it('should have MEMBER value', () => {
        expect(TeamRole.MEMBER).toBe('member');
    });

    it('should have exactly 3 values', () => {
        const teamRoleValues = Object.values(TeamRole);
        expect(teamRoleValues).toHaveLength(3);
    });

    it('should contain expected values', () => {
        const teamRoleValues = Object.values(TeamRole);
        expect(teamRoleValues).toContain('owner');
        expect(teamRoleValues).toContain('admin');
        expect(teamRoleValues).toContain('member');
    });

    it('should be usable in type comparisons', () => {
        const isOwner = (role: TeamRole) => role === TeamRole.OWNER;
        expect(isOwner(TeamRole.MEMBER)).toBe(false);
        expect(isOwner(TeamRole.OWNER)).toBe(true);
    });

    it('should be usable in switch statements', () => {
        const getTeamPermissionLevel = (role: TeamRole): number => {
            switch (role) {
                case TeamRole.OWNER:
                    return 100;
                case TeamRole.ADMIN:
                    return 50;
                case TeamRole.MEMBER:
                    return 10;
                default:
                    return 0;
            }
        };

        expect(getTeamPermissionLevel(TeamRole.OWNER)).toBe(100);
        expect(getTeamPermissionLevel(TeamRole.ADMIN)).toBe(50);
        expect(getTeamPermissionLevel(TeamRole.MEMBER)).toBe(10);
    });
});
