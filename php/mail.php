<?php
/**
 * mail.php
 * Generic wrapper around SendGrid API
 */
require_once __DIR__ . '/config.php';          // your secrets
require_once __DIR__ . '/../vendor/autoload.php'; // Composer autoloader

use SendGrid\Mail\Mail;

/**
 * sendMail() – sends an HTML e‑mail through SendGrid
 *
 * @param string $to   recipient e‑mail
 * @param string $name recipient name
 * @param string $subj subject line
 * @param string $html HTML body (no plain‑text part for simplicity)
 * @return bool        true = queued, false = error
 */
function sendMail($to, $name, $subj, $html)
{
    $email = new Mail();
    $email->setFrom(SITE_FROM_EMAIL, SITE_FROM_NAME);
    $email->setSubject($subj);
    $email->addTo($to, $name);
    $email->addContent('text/html', $html);

    try {
        $sg   = new \SendGrid(SENDGRID_API_KEY);
        $resp = $sg->send($email);

        if ($resp->statusCode() >= 400) {
            // log the response body for debugging
            error_log('SendGrid‑HTTP‑Error: ' . $resp->statusCode()
                      . ' | ' . $resp->body());
            return false;
        }
        return true;       // 202 Accepted
    } catch (\Throwable $e) {
        // network, auth, or lib errors
        error_log('SendGrid‑Exception: ' . $e->getMessage());
        return false;
    }
}
