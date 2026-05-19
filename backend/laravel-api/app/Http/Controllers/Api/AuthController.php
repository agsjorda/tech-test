<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/*
|--------------------------------------------------------------------------
| AuthController
|--------------------------------------------------------------------------
| Handles registration, login and logout. This controller is thin on
| purpose — it only deals with HTTP input/output. Business logic (if any
| grows) would live in a service, not here.
*/
class AuthController extends Controller
{
    /**
     * Register a new user account.
     *
     * Flow:
     *  1. RegisterRequest validates the incoming data BEFORE this method runs.
     *     If validation fails, Laravel automatically returns a 422 response.
     *  2. We create the User. The password is automatically hashed because
     *     the User model has 'password' => 'hashed' in its casts() method.
     *  3. We immediately create a Sanctum API token for the new user so they
     *     don't have to log in again after registering.
     *  4. We return the user object + the plain-text token.
     *     IMPORTANT: plainTextToken is only available right now. After this
     *     response, only the hashed version is stored — we can never show it again.
     *
     * Request body:  { name, email, password, password_confirmation }
     * Response 201:  { user: {...}, token: "1|abc123..." }
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'user'  => $user,
            'token' => $user->createToken('auth-token')->plainTextToken,
        ], 201);
    }

    /**
     * Log in with email and password.
     *
     * Flow:
     *  1. LoginRequest validates the incoming data.
     *  2. We look up the user by email. Using first() means we get null if
     *     not found instead of an exception.
     *  3. Hash::check() compares the plain-text password from the request
     *     against the bcrypt hash stored in the database — never store or
     *     compare plain-text passwords directly.
     *  4. If either check fails we return the same generic 401 message for
     *     both cases. This is intentional — never tell the caller whether
     *     the email or the password was wrong (security best practice).
     *  5. On success, create and return a new token.
     *
     * Request body:  { email, password }
     * Response 200:  { user: {...}, token: "1|abc123..." }
     * Response 401:  { message: "Invalid credentials." }
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        Log::info('User logged in', ['id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'user'  => $user,
            'token' => $user->createToken('auth-token')->plainTextToken,
        ]);
    }

    /**
     * Log out the currently authenticated user.
     *
     * Flow:
     *  1. $request->user() returns the User model that Sanctum resolved from
     *     the Bearer token in the Authorization header.
     *  2. currentAccessToken() returns the specific token object that was
     *     used for THIS request (a user can have many tokens, e.g. from
     *     multiple devices).
     *  3. delete() removes that token from the personal_access_tokens table.
     *     After this, any future request using that token will get a 401.
     *
     * Note: this route is inside the auth:sanctum middleware group, so
     * $request->user() is guaranteed to be non-null here.
     *
     * Response 200: { message: "Logged out successfully." }
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
