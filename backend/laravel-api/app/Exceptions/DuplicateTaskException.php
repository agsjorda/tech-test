<?php

namespace App\Exceptions;

use Exception;

class DuplicateTaskException extends Exception
{
    protected $message = 'A task with this title was created less than 10 seconds ago.';
}
