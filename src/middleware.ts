import { NextRequest, NextResponse } from "next/server";

export default async function middleware(req: NextRequest) {

    const session = req.cookies.get('session_id')

    if (!session) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/dashboard/:path*',
}
