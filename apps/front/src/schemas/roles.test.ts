import { describe, it, expect } from 'vitest';
import { Role, TeamRole } from './roles';

describe('Role enum', () => {
    it('should have ADMIN value', () => {
        expect(Role.ADMIN).toBe('ADMIN');
    });

    it('should have USER value', () => {
        expect(Role.USER).toBe('USER');
    });

    it('should have exactly 2 values', () => {
        const roleValues = Object.values(Role);
        expect(roleValues).toHaveLength(2);
    });

    it('should contain expected values', () => {
        const roleValues = Object.values(Role);
        expect(roleValues).toContain('ADMIN');
        expect(roleValues).toContain('USER');
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
    it('should have MANAGER value', () => {
        expect(TeamRole.MANAGER).toBe('MANAGER');
    });

    it('should have MEMBER value', () => {
        expect(TeamRole.MEMBER).toBe('MEMBER');
    });

    it('should have exactly 2 values', () => {
        const teamRoleValues = Object.values(TeamRole);
        expect(teamRoleValues).toHaveLength(2);
    });

    it('should contain expected values', () => {
        const teamRoleValues = Object.values(TeamRole);
        expect(teamRoleValues).toContain('MANAGER');
        expect(teamRoleValues).toContain('MEMBER');
    });

    it('should be usable in type comparisons', () => {
        const isManager = (role: TeamRole) => role === TeamRole.MANAGER;
        expect(isManager(TeamRole.MEMBER)).toBe(false);
        expect(isManager(TeamRole.MANAGER)).toBe(true);
    });

    it('should be usable in switch statements', () => {
        const getTeamPermissionLevel = (role: TeamRole): number => {
            switch (role) {
                case TeamRole.MANAGER:
                    return 50;
                case TeamRole.MEMBER:
                    return 10;
                default:
                    return 0;
            }
        };

        expect(getTeamPermissionLevel(TeamRole.MANAGER)).toBe(50);
        expect(getTeamPermissionLevel(TeamRole.MEMBER)).toBe(10);
    });
});
