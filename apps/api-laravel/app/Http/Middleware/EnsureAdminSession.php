<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) ($request->header('x-admin-session') ?? '');
        if ($token === '') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $session = DB::table('admin_sessions')
            ->where('token', $token)
            ->where('expires_at', '>', now())
            ->first();

        if (!$session) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->attributes->set('admin_moderator', $session->moderator);
        return $next($request);
    }
}
