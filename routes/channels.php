<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.{roomNumber}', function ($user, $roomNumber) {
    // Allow all authenticated users and guests to join chat channels
    return true;
});
