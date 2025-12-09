// "use client"

// import { ChevronsUpDown } from 'lucide-react';

// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuLabel,
//     DropdownMenuTrigger,
// } from '@repo/ui/components/dropdown-menu';
// import {
//     SidebarMenu,
//     SidebarMenuButton,
//     SidebarMenuItem,
//     useSidebar,
// } from '@repo/ui/components/sidebar';
// import { useTranslation } from 'react-i18next';
// import { useEffect, useState } from 'react';

// export function LanguageSwitcher({
//     languages,
// }: {
//     languages: {
//         name: string;
//         code: string;
//     }[];
// }) {
//     const { isMobile } = useSidebar();
//     const [activeLanguage, setActiveLanguage] = useState(
//         languages.find(language => language.code === localStorage.getItem('i18nextLng')) ||
//         languages[0]
//     );
//     const { t, i18n } = useTranslation();

//     useEffect(() => {
//         async function changeLanguage() {
//             const language = localStorage.getItem('i18nextLng');
//             if (language) {
//                 await i18n.changeLanguage(language);
//             }
//         }
//         changeLanguage();
//     }, [i18n]);

//     return (
//         <SidebarMenu>
//             <SidebarMenuItem>
//                 <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                         <SidebarMenuButton
//                             size="lg"
//                             className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
//                         >
//                             <div className="grid flex-1 text-left text-sm leading-tight">
//                                 <span className="truncate font-semibold">
//                                     {t(activeLanguage.name)}
//                                 </span>
//                             </div>
//                             <ChevronsUpDown className="ml-auto" />
//                         </SidebarMenuButton>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent
//                         className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
//                         align="start"
//                         side={isMobile ? 'bottom' : 'right'}
//                         sideOffset={4}
//                     >
//                         <DropdownMenuLabel className="text-xs text-muted-foreground">
//                             {t('language')}
//                         </DropdownMenuLabel>
//                         {languages.map(language => (
//                             <DropdownMenuItem
//                                 key={language.name}
//                                 onClick={async () => {
//                                     setActiveLanguage(language);
//                                     await i18n.changeLanguage(language.code);
//                                     localStorage.setItem('i18nextLng', language.code);
//                                 }}
//                                 className="gap-2 p-2"
//                             >
//                                 {t(language.name)}
//                             </DropdownMenuItem>
//                         ))}
//                     </DropdownMenuContent>
//                 </DropdownMenu>
//             </SidebarMenuItem>
//         </SidebarMenu>
//     );
// }
