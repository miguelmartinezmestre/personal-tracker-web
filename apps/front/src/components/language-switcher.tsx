"use client"
import { Check } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"
import Cookies from 'js-cookie';
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function LanguageSwitcher() {
    const router = useRouter();
    const [locale, setLocale] = useState<string | undefined>(undefined);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const cookieLocale = Cookies.get('locale');
        setLocale(cookieLocale || 'en');
    }, []);

    if (!isClient) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <span>Language</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                        <span>Español</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <span>English</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    {locale === "es" ? <span>Español</span> : <span>English</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" >
                <DropdownMenuItem onClick={() => {
                    Cookies.set('locale', "es");
                    setLocale("es");
                    router.refresh();
                }}>
                    <span>Español</span>
                    {locale === "es" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                    Cookies.set('locale', "en");
                    setLocale("en");
                    router.refresh();
                }}>
                    <span>English</span>
                    {locale === "en" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}