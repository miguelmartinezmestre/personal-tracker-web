// import { NextRequest, NextResponse } from "next/server";

import { NextRequest, NextResponse } from "next/server";

// export default async function middleware(req: NextRequest) {

//     const session = req.cookies.get('session_id')

//     if (!session) {
//         return NextResponse.redirect(new URL('/login', req.url))
//     }

//     return NextResponse.next()
// }

// export const config = {
//     matcher: '/dashboard/:path*',
// }

// import {
//     convexAuthNextjsMiddleware,
//     createRouteMatcher,
//     nextjsMiddlewareRedirect,
//   } from "@convex-dev/auth/nextjs/server";
  
//   const isSignInPage = createRouteMatcher(["/signin"]);
//   const isProtectedRoute = createRouteMatcher(["/dashboard/:path*"]);
  
//   export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
//     if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
//       return nextjsMiddlewareRedirect(request, "/dashboard/home");
//     }
//     if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
//       return nextjsMiddlewareRedirect(request, "/");
//     }
//   });
  
//   export const config = {
//     // The following matcher runs middleware on all routes
//     // except static assets.
//     matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
//   };

export default function middleware(request: NextRequest) {
  console.log(request.nextUrl.pathname);
  return NextResponse.next();
}