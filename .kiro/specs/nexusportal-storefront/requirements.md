# Requirements Document

## Introduction

NexusPortal is the vendor control plane and license server for NexusServer, a commercial IMEI/Server unlock platform that businesses self-deploy. Today NexusPortal exposes only machine-to-machine licensing endpoints (activate, validate, deactivate, update check) that deployed NexusServer instances call.

This feature transforms NexusPortal from a bare license server into a full vendor storefront and back office. It adds a public marketing landing page with a distinct visual identity, a checkout flow with configurable payment providers, automatic license issuance on successful payment, transactional email delivery, a hidden vendor-owner login, and a vendor admin area for viewing orders and managing license keys. All new capabilities operate on the same license data model used by the existing license endpoints, which must continue to function unchanged.

## Glossary

- **NexusPortal**: The vendor control plane application (Next.js App Router, Prisma) that hosts the storefront, admin area, and existing license server endpoints.
- **NexusServer**: The commercial unlock platform product that customers purchase and self-deploy; each deployment calls NexusPortal's license endpoints.
- **Storefront**: The public-facing marketing and checkout surface of NexusPortal where visitors learn about NexusServer and purchase a license.
- **Landing_Page**: The public marketing page that describes NexusServer's value proposition, features, advantages, pricing, and call-to-action.
- **Visitor**: An unauthenticated public user browsing the Storefront.
- **Customer**: A person or business who has purchased a NexusServer license through the Storefront.
- **Vendor_Owner**: The single authorized operator of NexusPortal who manages orders and licenses.
- **Admin_Area**: The authenticated back office of NexusPortal, accessible only to the Vendor_Owner.
- **Admin_Login**: The authentication form used by the Vendor_Owner, served from a private route that is not linked from any public surface.
- **Checkout**: The Storefront flow through which a Visitor selects a plan and submits payment.
- **Order**: A persisted record of a purchase attempt, including selected plan, amount, currency, payment provider, customer contact details, and payment status.
- **Payment_Provider**: An external payment service integrated with Checkout. Supported providers are Stripe, PayPal, and a crypto/USDT provider.
- **Payment_Webhook**: The server-to-server callback from a Payment_Provider that reports the authoritative result of a payment.
- **License_Key**: A unique string issued to a Customer that authenticates a NexusServer deployment against NexusPortal.
- **License**: The persisted license record holding key, status, plan, expiration date, and bound domain.
- **Plan**: A purchasable license tier (for example monthly or lifetime) with a defined price, currency, and license duration.
- **Email_Service**: The NexusPortal module that sends transactional email through a configured SMTP server.
- **License_Endpoints**: The existing machine-to-machine API routes `/api/license/activate`, `/api/license/validate`, `/api/license/deactivate`, and `/api/update/check`.

## Requirements

### Requirement 1: Marketing Landing Page Content

**User Story:** As a Visitor, I want a comprehensive marketing page that explains what NexusServer is and what it offers, so that I can decide whether to purchase it.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a hero section containing a product name, a value-proposition headline, a supporting description, and a primary call-to-action that links to Checkout.
2. THE Landing_Page SHALL display a section describing what NexusServer is and the business problem it solves.
3. THE Landing_Page SHALL display a section enumerating features available to end-users of a NexusServer deployment, including service catalog browsing, order placement, order tracking, and wallet-based payment.
4. THE Landing_Page SHALL display a section enumerating features available to NexusServer administrators, including IMEI unlock management, Server unlock management, API provider management, content management, Telegram notifications, wallet and payment management, ticketing, sub-admin permissions, theme and palette customization, and one-click updates.
5. THE Landing_Page SHALL display a section presenting at least three differentiators of NexusServer compared to other web-unlock providers.
6. THE Landing_Page SHALL display a pricing section that renders every Plan marked as publicly visible, showing each Plan name, price, currency, billing duration, and a call-to-action that starts Checkout for that Plan.
7. WHERE a publicly visible Plan has a price of zero, THE Landing_Page SHALL display that Plan in the pricing section alongside priced Plans, rendering the price as a zero-amount value in the Plan currency, with a call-to-action that starts Checkout for that Plan.
8. THE Landing_Page SHALL display a final call-to-action section containing a control that links to Checkout.
9. WHEN a Visitor activates a Plan-associated call-to-action, THE Storefront SHALL navigate the Visitor to Checkout with that Plan preselected.
10. WHEN a Visitor activates a generic call-to-action that is not associated with a specific Plan, THE Storefront SHALL navigate the Visitor to Checkout with no Plan preselected and the publicly visible Plans available for selection.
11. IF no Plan is marked as publicly visible, THEN THE Landing_Page SHALL display a message that no plans are currently available and SHALL suppress all Plan-associated call-to-action controls.

### Requirement 2: Distinct Visual Identity

**User Story:** As the Vendor_Owner, I want the Storefront to have a visual identity distinct from NexusServer, so that the vendor brand is differentiated from the product customers deploy.

#### Acceptance Criteria

1. THE Storefront SHALL apply the NexusPortal color palette, typography set, and component styling, in which the primary brand color and the primary heading and body typefaces differ from the NexusServer default palette and default typefaces.
2. THE Storefront SHALL apply the same NexusPortal color palette, typography set, and component styling on the Landing_Page, the Checkout, and every other public page.
3. WHERE a Visitor's device requests a reduced-motion preference, THE Storefront SHALL disable all decorative and transition animations on content and controls while keeping all content visible and all controls operable.
4. WHILE the viewport width is at or below 640 pixels, THE Storefront SHALL render all Landing_Page content and controls in a single-column layout.

### Requirement 3: Landing Page Animations

**User Story:** As a Visitor, I want the marketing page to feel polished and modern through smooth animations, so that the product appears high quality and trustworthy.

#### Acceptance Criteria

1. WHEN a Landing_Page section reaches 25 percent of its height within the viewport for the first time during scrolling, THE Landing_Page SHALL play a reveal animation for that section exactly once that completes within 1000 milliseconds.
2. WHILE a Visitor's pointer is over an interactive card or button on the Landing_Page, THE Landing_Page SHALL display that element in a hover state that is visually distinct from its default state.
3. WHEN a Visitor's pointer leaves an interactive card or button that is in a hover state, THE Landing_Page SHALL return that element to its default state.
4. WHEN a numeric statistic element enters the viewport for the first time, THE Landing_Page SHALL animate the displayed value from zero to its target value within 2000 milliseconds and SHALL display the exact target value when the animation completes.
5. WHERE a Visitor's device requests a reduced-motion preference, requests a reduced-data preference, or reports a battery level at or below 20 percent while not charging, THE Landing_Page SHALL display the final state of every animated element without playing reveal, transition, count-up, or looping animations.
6. WHERE the final state of an animated element cannot be rendered immediately, THE Landing_Page SHALL load that final state progressively while continuing to suppress reveal, transition, count-up, and looping animations.
7. THE Landing_Page SHALL make all primary call-to-action controls respond to activation within 3 seconds of initial page load on a connection of 10 megabits per second.

### Requirement 4: Plan Catalog Management

**User Story:** As the Vendor_Owner, I want to define the purchasable plans, so that the Storefront presents accurate pricing and issues licenses with the correct duration.

#### Acceptance Criteria

1. THE Admin_Area SHALL allow the Vendor_Owner to create a Plan with a name of 1 to 100 characters, a price from 0 to 999999.99 with at most 2 decimal places, a currency expressed as an ISO 4217 three-letter code, a billing duration, a license validity period expressed as a positive whole number of days or a lifetime designation, and a public visibility flag.
2. THE Admin_Area SHALL allow the Vendor_Owner to edit the name, price, currency, billing duration, license validity period, and public visibility flag of an existing Plan, subject to the same value constraints applied at creation.
3. WHERE a Plan public visibility flag is set to false, THE Landing_Page SHALL exclude that Plan from the pricing section.
4. IF the Vendor_Owner submits a Plan with a name outside 1 to 100 characters, a price below 0, a price above 999999.99, a price with more than 2 decimal places, a currency that is not a valid ISO 4217 three-letter code, a billing duration that is not positive, or a license validity period that is neither a positive whole number of days nor a lifetime designation, THEN THE Admin_Area SHALL reject the submission, leave existing Plan records unchanged, and display a validation message identifying the invalid field.
5. WHEN a Visitor starts Checkout for a publicly visible Plan, THE Storefront SHALL use the current stored price, currency, and license validity period of that Plan.
6. IF a Visitor starts Checkout for a Plan that does not exist or is not publicly visible, THEN THE Storefront SHALL reject the request and display a message that the selected Plan is unavailable.

### Requirement 5: Checkout and Payment Initiation

**User Story:** As a Visitor, I want to select a plan and pay for a NexusServer license, so that I can obtain a license key for my deployment.

#### Acceptance Criteria

1. THE Checkout SHALL display the selected Plan name, price, and currency, and SHALL provide a field for the Visitor to enter a contact email address of at most 254 characters.
2. THE Checkout SHALL present the Visitor a choice among the Payment_Providers that the Vendor_Owner has marked as enabled.
3. IF the Visitor submits Checkout with an email address that is empty, exceeds 254 characters, or does not match the format `local@domain`, THEN THE Checkout SHALL reject the submission, create no Order, retain the entered email address and the selected Payment_Provider, and display a validation message identifying the email field.
4. WHEN the Visitor confirms payment with a valid email address and an enabled Payment_Provider selected, THE Storefront SHALL initiate a payment session with the selected Payment_Provider and, only after the payment session is successfully initiated within 30 seconds, SHALL create an Order with status `pending`.
5. WHEN a payment session is created, THE Storefront SHALL redirect the Visitor to the payment interface of the selected Payment_Provider or render that provider's payment widget.
6. IF the selected Payment_Provider returns an error or no usable payment session is created within 30 seconds, THEN THE Checkout SHALL create no Order, display an error message that initiation failed, retain the entered email address and the selected Payment_Provider, and allow the Visitor to resubmit.
7. WHEN a Visitor returns to the Storefront after canceling payment at the Payment_Provider, THE Storefront SHALL display a canceled-payment message and SHALL leave the associated Order in status `pending`.
8. IF the Visitor confirms payment without an enabled Payment_Provider selected, THEN THE Checkout SHALL reject the submission, create no Order, and display a validation message identifying the payment method field.

### Requirement 6: Configurable Payment Providers

**User Story:** As the Vendor_Owner, I want to configure which payment providers are active and supply their credentials, so that I control how customers pay.

#### Acceptance Criteria

1. THE Admin_Area SHALL allow the Vendor_Owner to enable or disable each of the Stripe, PayPal, and crypto/USDT Payment_Providers independently.
2. THE Admin_Area SHALL allow the Vendor_Owner to store the credentials required by each Payment_Provider.
3. WHILE a Payment_Provider is enabled, THE Checkout SHALL include that Payment_Provider in the Visitor's available payment choices.
4. WHILE a Payment_Provider is disabled, THE Checkout SHALL exclude that Payment_Provider from the Visitor's available payment choices.
5. IF no Payment_Provider is enabled, THEN THE Checkout SHALL display a message that purchasing is temporarily unavailable and SHALL prevent Order creation.
6. WHEN the Admin_Area displays a stored Payment_Provider credential, THE Admin_Area SHALL render the credential in a masked format that reveals at most the last 4 characters, and SHALL reveal no characters when the stored credential is 4 characters or fewer in length.
7. IF the Vendor_Owner submits credentials for a Payment_Provider with one or more of that provider's required credential fields empty, THEN THE Admin_Area SHALL reject the submission and display a validation message identifying each missing required field.
8. IF the Vendor_Owner attempts to enable a Payment_Provider whose required credentials are not completely stored, THEN THE Admin_Area SHALL reject the enable action, leave that Payment_Provider disabled, and display a message indicating which required credentials are missing.

### Requirement 7: Automatic License Issuance on Payment Success

**User Story:** As a Customer, I want my license key to be created automatically when my payment succeeds, so that I receive my license without manual vendor intervention.

#### Acceptance Criteria

1. WHEN NexusPortal receives a Payment_Webhook reporting a successful payment for an Order, THE Storefront SHALL verify the authenticity of the Payment_Webhook using the credentials of the corresponding Payment_Provider before processing it.
2. IF a received Payment_Webhook fails authenticity verification, THEN THE Storefront SHALL reject the Payment_Webhook, leave the associated Order unchanged, and record the rejection.
3. WHEN a Payment_Webhook reporting successful payment is verified for an Order in status `pending`, THE Storefront SHALL generate a License_Key that is unique across all existing License records.
4. WHEN a License_Key is generated for a successful Order, THE Storefront SHALL create a License record with status `active`, the Plan from the Order, and an expiration date computed from the Plan license validity period, and SHALL set the Order status to `paid`.
5. IF the Order status update to `paid` fails after a License record has been created, THEN THE Storefront SHALL roll back the License record creation, leave the Order in status `pending`, and record the failure.
6. WHEN a Payment_Webhook reporting successful payment is verified for an Order that is already in status `paid`, THE Storefront SHALL acknowledge the Payment_Webhook without creating an additional License record.
7. WHEN a License record is created for a successful Order, THE Storefront SHALL create or update a Customer record associated with the Order email address and link the License to that Customer.
8. IF License_Key generation or License persistence fails after a payment is verified as successful, THEN THE Storefront SHALL leave the Order in status `pending`, record the failure, and signal the Payment_Webhook caller to retry delivery.

### Requirement 8: License Key Delivery and Order Confirmation Email

**User Story:** As a Customer, I want to receive my license key and setup instructions by email after purchase, so that I can deploy and activate NexusServer.

#### Acceptance Criteria

1. WHEN a License record is created for a successful Order, THE Email_Service SHALL send an order confirmation email to the Order email address that contains the License_Key, the purchased Plan name, the License expiration date, and NexusServer setup instructions.
2. THE Email_Service SHALL send transactional email through the SMTP server configured by the Vendor_Owner.
3. IF the configured SMTP server is unreachable or rejects authentication, THEN THE Email_Service SHALL attempt delivery through a configured alternative delivery method when one is configured, or SHALL skip delivery and record the skipped outcome when no alternative is configured.
4. IF the Email_Service fails to send the order confirmation email, THEN THE Email_Service SHALL retry delivery up to 3 times and SHALL record the final delivery outcome against the Order.
5. IF the Email_Service exhausts all retry attempts without a successful send, THEN THE Admin_Area SHALL display the affected Order with an indication that license delivery email failed.
6. THE Admin_Area SHALL allow the Vendor_Owner to resend the order confirmation email for a paid Order to the Order email address.

### Requirement 9: SMTP Configuration

**User Story:** As the Vendor_Owner, I want to configure SMTP settings, so that transactional email is sent from my own mail server.

#### Acceptance Criteria

1. THE Admin_Area SHALL allow the Vendor_Owner to store an SMTP host, port, username, password, and sender address.
2. WHEN the Vendor_Owner requests an SMTP connection test, THE Email_Service SHALL attempt to connect and authenticate to the configured SMTP server within 30 seconds and SHALL display whether the connection succeeded or the reason it failed.
3. WHEN the Admin_Area displays the stored SMTP password, THE Admin_Area SHALL render the password in a masked format.
4. IF the Vendor_Owner submits SMTP settings with a port outside the range 1 through 65535, THEN THE Admin_Area SHALL reject the submission and display a validation message identifying the port field.
5. IF a stored SMTP port is outside the range 1 through 65535, THEN THE Admin_Area SHALL flag the stored port as invalid whenever the SMTP settings are displayed, and THE Email_Service SHALL treat the SMTP configuration as unusable whenever it attempts to send email.

### Requirement 10: Hidden Admin Authentication

**User Story:** As the Vendor_Owner, I want my login to be hidden from the public, so that visitors cannot discover or access the back office.

#### Acceptance Criteria

1. THE Storefront SHALL exclude any link, button, or navigation entry that points to the Admin_Login from all public pages.
2. THE Admin_Login SHALL be served only from the private route configured for NexusPortal.
3. WHEN a Visitor submits valid Vendor_Owner credentials at the Admin_Login, THE NexusPortal SHALL establish an authenticated Vendor_Owner session and grant access to the Admin_Area.
4. IF a request is made to the Admin_Login with invalid credentials, THEN THE Admin_Login SHALL deny authentication and display a generic authentication-failure message that does not reveal which credential was incorrect.
5. IF an unauthenticated request is made to any Admin_Area route, THEN THE NexusPortal SHALL respond with the same not-found response used for unknown routes rather than redirecting to the Admin_Login.
6. WHEN a failed Admin_Login attempt from a single source address is the 5th failed attempt within 15 minutes, THE Admin_Login SHALL reject that attempt and any further attempts from that source address for at least 15 minutes.
7. THE NexusPortal SHALL exclude the Admin_Login route and all Admin_Area routes from the site search index directives served to web crawlers.

### Requirement 11: Vendor Order Management

**User Story:** As the Vendor_Owner, I want to view all orders, so that I can monitor sales and reconcile payments.

#### Acceptance Criteria

1. THE Admin_Area SHALL display a list of Orders in reverse chronological order, showing a maximum of 25 entries per page with pagination controls when more entries exist.
2. FOR EACH Order in the list, THE Admin_Area SHALL display the Order identifier, customer email address, Plan name, amount, currency, Payment_Provider, payment status, and creation date and time.
3. THE Admin_Area SHALL allow the Vendor_Owner to filter the Order list by payment status.
4. WHEN the Vendor_Owner selects an Order, THE Admin_Area SHALL display the Order detail including the linked License_Key when a License has been issued and the license delivery email outcome.
5. WHERE an Order has payment status `pending`, THE Admin_Area SHALL display that no License has been issued for that Order.

### Requirement 12: Vendor License Management

**User Story:** As the Vendor_Owner, I want to manage issued license keys, so that I can support customers and revoke licenses when needed.

#### Acceptance Criteria

1. THE Admin_Area SHALL display a list of License records, showing for each License the masked License_Key, status, Plan, bound domain, expiration date, and associated customer email address.
2. THE Admin_Area SHALL allow the Vendor_Owner to filter the License list by status.
3. WHEN the Vendor_Owner revokes a License whose current status is not `revoked`, THE Admin_Area SHALL set that License status to `revoked`.
4. IF the Vendor_Owner attempts to revoke a License whose status is already `revoked`, THEN THE Admin_Area SHALL reject the revocation and display a message that the License status is unchanged.
5. WHILE a License status is `revoked`, THE License_Endpoints SHALL report that License as invalid to any requesting NexusServer deployment.
6. WHEN the Vendor_Owner clears the bound domain of a License whose status is not `active`, THE Admin_Area SHALL set the License bound domain to empty so that the License can be activated on a different domain.
7. IF the Vendor_Owner attempts to clear the bound domain of a License whose status is `active`, THEN THE Admin_Area SHALL reject the request and display a message that the bound domain of an active License cannot be cleared.
8. THE Admin_Area SHALL display the full License_Key value of a selected License only after the Vendor_Owner activates a reveal control for that License.

### Requirement 13: Compatibility with Existing License Endpoints

**User Story:** As the Vendor_Owner, I want deployed NexusServer instances to keep working, so that adding the storefront does not disrupt existing customers.

#### Acceptance Criteria

1. THE License_Endpoints SHALL continue to accept and respond to the request payloads `{ key, domain }` for activate, validate, and deactivate, and `{ key, domain, currentVersion }` for update check, in the same response shapes used before this feature.
2. WHEN a License issued through the Storefront is sent to `/api/license/activate` with a domain, THE License_Endpoints SHALL bind that License to the domain and return the License Plan and expiration date.
3. WHEN a License issued through the Storefront is sent to `/api/license/validate`, THE License_Endpoints SHALL return validity, Plan, and expiration date consistent with the current stored License record.
4. THE Storefront and Admin_Area SHALL read and write License records using the same License data model consumed by the License_Endpoints, without introducing a separate license store.
5. WHEN the Vendor_Owner changes the status and expiration date of a License together in the Admin_Area, THE License_Endpoints SHALL reflect both the changed status and the changed expiration date together on the next request for that License.
