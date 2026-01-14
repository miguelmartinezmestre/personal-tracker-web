// 'use client';

// import { useMemo } from 'react';
// import { useTranslations } from 'next-intl';
// import { NextStep, NextStepProvider } from 'nextstepjs';
// import { TourCard } from './tour-card';
// import { getAllTourIds, getTourDefinition, getStepTitleKey, getStepContentKey } from '@/features/tours/config/tours';
// import type { Tour } from 'nextstepjs';

// /**
//  * Get all tours converted to NextStepjs format with translations.
//  * This is computed once when the wrapper mounts.
//  */
// function useNextStepTours(): Tour[] {
//     const t = useTranslations();
//     const allTourIds = getAllTourIds();

//     return useMemo(() => {
//         return allTourIds.map(tourId => {
//             const tour = getTourDefinition(tourId);
//             return {
//                 tour: tour.id,
//                 steps: tour.steps.map((step, index) => ({
//                     icon: step.icon,
//                     title: t(getStepTitleKey(tourId, index)),
//                     content: t(getStepContentKey(tourId, index)),
//                     selector: step.selector,
//                     side: step.side,
//                     showControls: step.showControls ?? true,
//                     showSkip: step.showSkip ?? true,
//                     nextRoute: step.route,
//                     pointerPadding: step.pointerPadding,
//                     pointerRadius: step.pointerRadius,
//                 })),
//             };
//         });
//     }, [t]);
// }

// /**
//  * NextStepWrapper Component
//  *
//  * Wraps the application with NextStepjs Provider and NextStep component.
//  * This component should be placed high in your app component tree (e.g., in layout.tsx).
//  *
//  * Usage:
//  *   <NextStepWrapper>
//  *     <TourProvider>
//  *       {children}
//  *     </TourProvider>
//  *   </NextStepWrapper>
//  */
// export function NextStepWrapper({ children }: { children: React.ReactNode }) {
//     const tours = useNextStepTours();

//     return (
//         <NextStepProvider>
//             <NextStep steps={tours} cardComponent={TourCard}>
//                 {children}
//             </NextStep>
//         </NextStepProvider>
//     );
// }
