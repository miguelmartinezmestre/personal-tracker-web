// 'use client';

// import { useTranslations } from 'next-intl';
// import { useTour } from '@/features/tours/use-tour';
// import type { TourId } from '@/features/tours/types/tour';
// import {
//     Card,
//     CardContent,
//     CardDescription,
//     CardHeader,
//     CardTitle,
// } from '@repo/ui/components/card';
// import { Button } from '@repo/ui/components/button';
// import { PlayCircle } from 'lucide-react';

// /**
//  * Available tours configuration
//  */
// const TOURS_CONFIG: Array<{
//     id: TourId;
//     labelKey: string;
//     description: string;
// }> = [
//         {
//             id: 'onboarding',
//             labelKey: 'onboardingLabel',
//             description: 'Learn the basics of the app and get started quickly.',
//         },
//         {
//             id: 'objectives-feature',
//             labelKey: 'objectivesLabel',
//             description: 'Learn how to create and manage your objectives.',
//         },
//         {
//             id: 'achievements-feature',
//             labelKey: 'achievementsLabel',
//             description: 'Explore the achievements system and track your badges.',
//         },
//         {
//             id: 'teams-feature',
//             labelKey: 'teamsLabel',
//             description: 'For admins: learn about user management and audit logs.',
//         },
//     ];

// /**
//  * Tours settings section component
//  * Displays all available tours with buttons to start them.
//  */
// export function ToursSettings() {
//     const t = useTranslations('Tours');
//     const tSettings = useTranslations('Tours.settings');
//     const { startTour, resetTour } = useTour();
//     // const { isAdmin } = useUserRole();

//     const handleStartTour = (tourId: TourId) => {
//         // Reset the tour first, then start it
//         resetTour(tourId);
//         // Small delay to ensure reset completes
//         setTimeout(() => {
//             startTour(tourId);
//         }, 100);
//     };

//     return (
//         <Card className="max-w-2xl">
//             <CardHeader>
//                 <CardTitle>{tSettings('toursSection')}</CardTitle>
//                 <CardDescription>{tSettings('toursDescription')}</CardDescription>
//             </CardHeader>
//             <CardContent>
//                 <div className="space-y-3">
//                     {TOURS_CONFIG.map(tour => {
//                         // Hide admin tour for non-admin users
//                         // if (tour.id === 'teams-feature' && !isAdmin) {
//                         //     return null;
//                         // }

//                         return (
//                             <div
//                                 key={tour.id}
//                                 className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
//                             >
//                                 <div className="flex-1 space-y-1">
//                                     <h4 className="font-medium">{tSettings(tour.labelKey)}</h4>
//                                     <p className="text-sm text-muted-foreground">{tour.description}</p>
//                                 </div>
//                                 <Button
//                                     variant="default"
//                                     size="sm"
//                                     onClick={() => handleStartTour(tour.id)}
//                                     className="shrink-0"
//                                 >
//                                     <PlayCircle className="h-4 w-4 mr-1" />
//                                     Start
//                                 </Button>
//                             </div>
//                         );
//                     })}
//                 </div>
//             </CardContent>
//         </Card>
//     );
// }
