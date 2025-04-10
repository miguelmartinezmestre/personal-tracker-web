import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from './ui/breadcrumb';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItemType {
    label: string;
    path: string;
    isCurrentPage?: boolean;
}

export function TanstackBreadcrumb() {
    const router = useRouter();
    const routerState = useRouterState();
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItemType[]>([]);

    useEffect(() => {
        // Safety check to ensure router state is available
        if (!routerState || !router) {
            setBreadcrumbs([{ label: 'Home', path: '/dashboard/home', isCurrentPage: true }]);
            return;
        }

        try {
            // Get the current route
            const currentRoute = routerState.location.pathname;

            // Split the path into segments
            const pathSegments = currentRoute.split('/').filter(Boolean);

            // Create breadcrumb items
            const breadcrumbItems: BreadcrumbItemType[] = [
                { label: 'Home', path: '/dashboard/home' },
            ];

            // Build up the breadcrumb paths
            let currentPath = '';
            pathSegments.forEach((segment, index) => {
                currentPath += `/${segment}`;
                const isLastSegment = index === pathSegments.length - 1;

                // Format the label (capitalize first letter and replace hyphens with spaces)
                const label = segment
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, char => char.toUpperCase());

                if (currentPath !== '/dashboard' && currentPath !== '/dashboard/home') {
                    breadcrumbItems.push({
                        label,
                        path: currentPath,
                        isCurrentPage: isLastSegment,
                    });
                }
            });

            setBreadcrumbs(breadcrumbItems);
        } catch (error) {
            console.error('Error generating breadcrumbs:', error);
            setBreadcrumbs([{ label: 'Home', path: '/dashboard', isCurrentPage: true }]);
        }
    }, [router, routerState]);

    if (breadcrumbs.length <= 1) {
        return null;
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                    <BreadcrumbItem key={item.path}>
                        {item.isCurrentPage ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        ) : (
                            <BreadcrumbLink asChild>
                                <Link to={item.path}>
                                    {index === 0 ? (
                                        <span className="flex items-center gap-1">
                                            <Home className="h-3.5 w-3.5" />
                                            <span className="sr-only">Home</span>
                                        </span>
                                    ) : (
                                        item.label
                                    )}
                                </Link>
                            </BreadcrumbLink>
                        )}

                        {index < breadcrumbs.length - 1 && (
                            <BreadcrumbSeparator>
                                <ChevronRight className="h-4 w-4" />
                            </BreadcrumbSeparator>
                        )}
                    </BreadcrumbItem>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
