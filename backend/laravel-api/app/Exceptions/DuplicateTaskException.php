<?php

namespace App\Exceptions;

use Exception;

/*
|--------------------------------------------------------------------------
| DuplicateTaskException
|--------------------------------------------------------------------------
| A custom exception class for the 10-second duplicate task rule.
|
| Why create a custom exception instead of just returning false or null?
|
| 1. Clarity — the name DuplicateTaskException makes the code self-documenting.
|    When you see "throw new DuplicateTaskException()" you immediately know
|    what happened and why.
|
| 2. Separation of concerns — TaskService throws the exception (business rule).
|    TaskController catches it and decides what HTTP response to return (422).
|    Neither layer is doing the other's job.
|
| 3. Testability — unit tests can assert that a specific exception type is
|    thrown without caring about the HTTP layer at all.
|
| The message is set as a class property so it's always consistent — the
| controller doesn't need to hardcode the message string.
*/
class DuplicateTaskException extends Exception
{
    protected $message = 'A task with this title was created less than 10 seconds ago.';
}
