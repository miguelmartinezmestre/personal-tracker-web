export type Objetive = {
    id?: number;
    userId: number;
    title: string;
    description: string;
    category: string;
    targetValue: number;
    currentValue: number;
    deadline: Date;
    status: string;
    unit: string;
};
