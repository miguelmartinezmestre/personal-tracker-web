"use client"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Cookies from 'js-cookie';
import { useRouter } from "next/navigation";

export function LanguageSwitcher() {

    const router = useRouter();
    const locale = Cookies.get('locale');

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
                    router.refresh();
                }}>
                    <span>Español</span>
                    {locale === "es" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                    Cookies.set('locale', "en");
                    router.refresh();
                }}>
                    <span>English</span>
                    {locale === "en" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}