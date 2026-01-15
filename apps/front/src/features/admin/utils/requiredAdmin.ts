import { isAdmin } from "@/features/auth/current-user";
import { redirect } from "next/navigation";

export async function requireAdmin() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }
}