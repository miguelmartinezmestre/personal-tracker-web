export type Session = {
    id: number;
    userId: number;
    value: string;
    userAgent: string;
    status: 'active' | 'invalidated';
};
