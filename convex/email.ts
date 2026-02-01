import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
    apiKey: process.env.RESEND_API_KEY,
    testMode: false,
});

export const sendTestEmail = internalMutation({
    args: {
        to: v.string(),
        subject: v.string(),
        text: v.string(),
    },
    handler: async (ctx, { to, subject, text }) => {
        await resend.sendEmail(ctx, {
            from: "Acme <onboarding@resend.dev>",
            to,
            subject,
            text,
        });
        return { message: "Email sent successfully" };
    },
});