import { createContext, useContext, type ReactNode } from 'react';

type AuthUser = {
    email: string;
    name: string;
    id: number;
} | null;

type AuthContextType = {
    user: AuthUser;
    isLoading: boolean;
};


export const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: false,
});

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({
    children,
    value,
}: {
    children: ReactNode;
    value: AuthContextType;
}) => {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
